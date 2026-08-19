/**
 * Reference recipe search tool — searches the curated BJCP reference recipe
 * library for a beer style.
 *
 * The reference library is bundled into the package (see `reference-recipes.ts`)
 * and contains only recipes sourced from recognized public references
 * (AHA, BYO, Craft Beer & Brewing, malt/yeast producers, established authors).
 * Every recipe carries a `fonte` (source) block with a URL and a verification
 * status so the agent can trust it as a style reference without inventing data.
 *
 * Supports lookup by BJCP style code (e.g. "21A"), style name, or free keyword.
 */

import { z } from 'zod';

import type { BuiltinTool, ToolExecution, ExecutableToolResult } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';
import { getAllReferenceRecipes } from './reference-recipes';

export const ReferenceRecipeSearchInputSchema = z.object({
  stile: z.string().describe('BJCP style code (e.g. "21A"), style name (e.g. "American IPA"), or keyword (e.g. "stout", "weizen").'),
  categoria: z.string().optional().describe('Optional BJCP category number (e.g. "21") to narrow the search.'),
  dettaglio: z.boolean().default(false).describe('When true, returns the full recipe details (grist, hops, yeast, mash, fermentation). Default false (summary only).'),
});

export type ReferenceRecipeSearchInput = z.infer<typeof ReferenceRecipeSearchInputSchema>;

interface ReferenceRecipeSummary {
  nome: string;
  stile: string;
  codice_bjcp: string;
  fonte: {
    nome: string;
    url: string;
    autore?: string;
    verifica: string;
  };
  parametri: {
    batch_size_litri?: number;
    og?: number;
    fg?: number;
    abv_percent?: number;
    ibu?: number;
    ebc?: number;
  };
  data: Record<string, unknown>;
}

function parseReferenceRecipe(recipe: { code: string; data: Record<string, unknown> }): ReferenceRecipeSummary | null {
  const d = recipe.data;
  const params = d['parametri'] as Record<string, unknown> | undefined;
  const fonte = d['fonte'] as Record<string, unknown> | undefined;
  if (
    typeof d['nome'] !== 'string' ||
    typeof d['stile'] !== 'string' ||
    typeof params !== 'object' || params === null ||
    typeof fonte !== 'object' || fonte === null ||
    typeof fonte['url'] !== 'string'
  ) {
    return null;
  }

  return {
    nome: String(d['nome']),
    stile: String(d['stile']),
    codice_bjcp: String(d['codice_bjcp'] ?? recipe.code),
    fonte: {
      nome: String(fonte['nome'] ?? ''),
      url: String(fonte['url'] ?? ''),
      autore: fonte['autore'] ? String(fonte['autore']) : undefined,
      verifica: String(fonte['verifica'] ?? ''),
    },
    parametri: {
      batch_size_litri: typeof params['batch_size_litri'] === 'number' ? params['batch_size_litri'] : undefined,
      og: typeof params['og'] === 'number' ? params['og'] : undefined,
      fg: typeof params['fg'] === 'number' ? params['fg'] : undefined,
      abv_percent: typeof params['abv_percent'] === 'number' ? params['abv_percent'] : undefined,
      ibu: typeof params['ibu'] === 'number' ? params['ibu'] : undefined,
      ebc: typeof params['ebc'] === 'number' ? params['ebc'] : undefined,
    },
    data: d,
  };
}

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function recipeMatches(recipe: ReferenceRecipeSummary, query: string, categoria?: string): boolean {
  const q = normalize(query);
  if (!q) return true;

  // Match by BJCP code (e.g. "21A", "21a")
  const code = recipe.codice_bjcp.toLowerCase();
  if (code === q || code.replace(/\s/g, '') === q.replace(/\s/g, '')) return true;

  // Match by style name or recipe name
  const haystack = normalize(`${recipe.stile} ${recipe.nome} ${recipe.codice_bjcp}`);
  if (haystack.includes(q)) return true;

  // Match by category
  if (categoria && recipe.codice_bjcp.startsWith(categoria)) return true;

  return false;
}

function formatSummary(r: ReferenceRecipeSummary): string {
  const p = r.parametri;
  const parts: string[] = [];
  parts.push(`**${r.nome}** — ${r.stile}${r.codice_bjcp ? ` (${r.codice_bjcp})` : ''}`);
  if (p.og) parts.push(`OG ${p.og.toFixed(3)}`);
  if (p.fg) parts.push(`FG ${p.fg.toFixed(3)}`);
  if (p.abv_percent) parts.push(`ABV ${p.abv_percent}%`);
  if (p.ibu) parts.push(`IBU ${p.ibu}`);
  if (p.ebc) parts.push(`EBC ${p.ebc}`);
  if (p.batch_size_litri) parts.push(`Batch ${p.batch_size_litri}L`);
  const header = parts.join(' | ');

  const src = r.fonte;
  const sourceLine = `📚 Fonte: ${src.nome}${src.autore ? ` (${src.autore})` : ''} — ${src.url}`;
  const verifyLine = `🔎 Verifica: ${src.verifica}`;
  return `${header}\n  ${sourceLine}\n  ${verifyLine}`;
}

function formatFull(r: ReferenceRecipeSummary): string {
  const lines: string[] = [formatSummary(r), ''];
  const d = r.data;
  const desc = d['descrizione'];
  if (typeof desc === 'string') lines.push(`📝 ${desc}`, '');

  const grist = d['grist'];
  if (Array.isArray(grist)) {
    lines.push('🌾 **Grist:**');
    for (const g of grist as Array<Record<string, unknown>>) {
      lines.push(`  - ${g['malto']} ${g['kg']}kg${g['percent'] ? ` (${g['percent']}%)` : ''}`);
    }
    lines.push('');
  }

  const hops = d['luppolatura'];
  if (Array.isArray(hops)) {
    lines.push('🌿 **Luppolatura:**');
    for (const h of hops as Array<Record<string, unknown>>) {
      lines.push(`  - ${h['varieta']} ${h['grammi']}g @ ${h['tempo_min']}min (${h['uso']})`);
    }
    lines.push('');
  }

  const yeast = d['lievito'];
  if (yeast && typeof yeast === 'object') {
    const y = yeast as Record<string, unknown>;
    lines.push(`🧫 **Lievito:** ${y['ceppo'] ?? ''}${y['forma'] ? ` (${y['forma']})` : ''}`);
    lines.push('');
  }

  const mash = d['mash'];
  if (mash && typeof mash === 'object') {
    const m = mash as Record<string, unknown>;
    lines.push(`♨️ **Mash:** ${m['temperatura_c'] ?? ''}°C per ${m['durata_min'] ?? ''}min`);
    lines.push('');
  }

  const ferment = d['fermentazione'];
  if (ferment && typeof ferment === 'object') {
    const f = ferment as Record<string, unknown>;
    lines.push(`🍺 **Fermentazione:** ${f['temperatura_c'] ?? ''}°C, ${f['primaria_giorni'] ?? ''} giorni`);
    lines.push('');
  }

  return lines.join('\n');
}

export class ReferenceRecipeSearchTool implements BuiltinTool<ReferenceRecipeSearchInput> {
  readonly name = 'reference_recipe_search' as const;
  readonly description =
    'Cerca nella libreria di ricette brassicole di riferimento (BJCP) una ricetta per stile. La libreria contiene solo ricette reali provenienti da fonti riconosciute (AHA, BYO, Craft Beer & Brewing, produttori di malti/lieviti, autori affermati), ognuna con fonte e link verificabile. Usa questo tool quando ti viene chiesto un riferimento certo per uno stile di birra. Cerca per codice BJCP (es. "21A"), nome stile (es. "American IPA") o parola chiave (es. "stout").';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(ReferenceRecipeSearchInputSchema);

  resolveExecution(args: ReferenceRecipeSearchInput): ToolExecution {
    return {
      description: `Reference recipe search for "${args.stile}"`,
      approvalRule: this.name,
      execute: () => this.execute(args),
    };
  }

  private execute(args: ReferenceRecipeSearchInput): Promise<ExecutableToolResult> {
    try {
      const recipes = getAllReferenceRecipes()
        .map(r => parseReferenceRecipe(r))
        .filter((r): r is ReferenceRecipeSummary => r !== null);

      if (recipes.length === 0) {
        return Promise.resolve({ output: 'Nessuna ricetta di riferimento trovata nella libreria.' });
      }

      const filtered = recipes.filter(r => recipeMatches(r, args.stile, args.categoria));

      if (filtered.length === 0) {
        return Promise.resolve({
          output: `Nessuna ricetta di riferimento trovata per "${args.stile}"${args.categoria ? ` (categoria ${args.categoria})` : ''}. La libreria contiene ${recipes.length} ricette. Prova con un codice BJCP (es. "21A") o un nome di stile.`,
        });
      }

      const lines: string[] = [
        `**${filtered.length} ricetta/e di riferimento trovata/e per "${args.stile}"** (${recipes.length} totali in libreria)`,
        '',
      ];

      filtered.sort((a, b) => a.codice_bjcp.localeCompare(b.codice_bjcp) || a.nome.localeCompare(b.nome, 'it'));

      for (const r of filtered) {
        lines.push(args.dettaglio ? formatFull(r) : formatSummary(r));
        lines.push('');
      }

      return Promise.resolve({ output: lines.join('\n') });
    } catch (error) {
      return Promise.resolve({ isError: true, output: error instanceof Error ? error.message : String(error) });
    }
  }
}

registerTool(ReferenceRecipeSearchTool);
