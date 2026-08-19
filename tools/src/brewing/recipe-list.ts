/**
 * Recipe list tool — scans the workspace for beer recipe YAML files.
 *
 * Searches recursively for .yaml/.yml files, parses them, and returns
 * a list of recipes with key parameters. Supports filtering by style,
 * ingredient keyword, and limiting search depth.
 */

import { z } from 'zod';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as yaml from 'js-yaml';

import type { BuiltinTool, ToolExecution, ExecutableToolResult } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

export const RecipeListInputSchema = z.object({
  search_dir: z.string().optional().describe('Directory to scan. Defaults to the current workspace directory. Use ~ to refer to home directory.'),
  filter: z.string().optional().describe('Filter recipes by keyword. Searches in recipe name, style, description, and ingredients. Examples: "rum", "IPA", "lambic", "miele".'),
  max_depth: z.number().int().min(1).max(10).default(6).describe('Max directory depth for recursive scan. Default 6.'),
});

export type RecipeListInput = z.infer<typeof RecipeListInputSchema>;

interface RecipeSummary {
  path: string;
  nome: string;
  stile: string;
  parametri: {
    batch_size_litri?: number;
    og?: number;
    fg?: number;
    abv_percent?: number;
    ibu?: number;
    ebc?: number;
    impianto?: string;
  };
  ingredienti_principali: {
    malti: string[];
    luppoli: string[];
    lievito: string;
    spezie?: string[];
    zuccheri?: string[];
  };
}

function isRecipeYaml(data: Record<string, unknown>): boolean {
  // A recipe must have at least: nome, parametri (with og or batch_size), grist
  const params = data['parametri'] as Record<string, unknown> | undefined;
  return (
    typeof data['nome'] === 'string' &&
    typeof params === 'object' &&
    params !== null &&
    (typeof params['og'] === 'number' ||
     typeof params['batch_size_litri'] === 'number') &&
    (Array.isArray(data['grist']) || Array.isArray(data['luppolatura']))
  );
}

function parseRecipeYaml(filePath: string): RecipeSummary | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data = yaml.load(raw) as unknown;
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Record<string, unknown>;

    if (!isRecipeYaml(d)) return null;

    const params = d['parametri'] as Record<string, unknown>;
    const grist = Array.isArray(d['grist']) ? d['grist'] as Array<Record<string, unknown>> : [];
    const luppolatura = Array.isArray(d['luppolatura']) ? d['luppolatura'] as Array<Record<string, unknown>> : [];
    const lievito = d['lievito'] as Record<string, unknown> | undefined;

    return {
      path: filePath,
      nome: String(d['nome'] ?? 'Sconosciuta'),
      stile: String(d['stile'] ?? 'Non specificato'),
      parametri: {
        batch_size_litri: typeof params['batch_size_litri'] === 'number' ? params['batch_size_litri'] : undefined,
        og: typeof params['og'] === 'number' ? params['og'] : undefined,
        fg: typeof params['fg'] === 'number' ? params['fg'] : undefined,
        abv_percent: typeof params['abv_percent'] === 'number' ? params['abv_percent'] : undefined,
        ibu: typeof params['ibu'] === 'number' ? params['ibu'] : undefined,
        ebc: typeof params['ebc'] === 'number' ? params['ebc'] : undefined,
        impianto: typeof params['impianto'] === 'string' ? params['impianto'] : undefined,
      },
      ingredienti_principali: {
        malti: grist.map(m => String(m['malto'] ?? '')).filter(Boolean),
        luppoli: luppolatura.map(h => String(h['varieta'] ?? '')).filter(Boolean),
        lievito: lievito?.['ceppo'] ? String(lievito['ceppo']) : 'Non specificato',
        spezie: Array.isArray(d['spezie']) ? (d['spezie'] as Array<Record<string, unknown>>).map(s => String(s['nome'] ?? '')).filter(Boolean) : undefined,
        zuccheri: Array.isArray(d['zuccheri']) ? (d['zuccheri'] as Array<Record<string, unknown>>).map(z => String(z['tipo'] ?? '')).filter(Boolean) : undefined,
      },
    };
  } catch {
    return null;
  }
}

function scanYamlFiles(dir: string, maxDepth: number, currentDepth: number = 0): string[] {
  if (currentDepth > maxDepth) return [];
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      try {
        const st = statSync(fullPath);
        if (st.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          results.push(...scanYamlFiles(fullPath, maxDepth, currentDepth + 1));
        } else if (st.isFile() && (entry.endsWith('.yaml') || entry.endsWith('.yml'))) {
          results.push(fullPath);
        }
      } catch {
        // skip inaccessible entries
      }
    }
  } catch {
    // skip inaccessible directories
  }
  return results;
}

function recipeMatchesFilter(recipe: RecipeSummary, filter: string): boolean {
  const f = filter.toLowerCase();
  // Search in name, style, malti, luppoli, lievito, spezie
  if (recipe.nome.toLowerCase().includes(f)) return true;
  if (recipe.stile.toLowerCase().includes(f)) return true;
  if (recipe.ingredienti_principali.malti.some(m => m.toLowerCase().includes(f))) return true;
  if (recipe.ingredienti_principali.luppoli.some(h => h.toLowerCase().includes(f))) return true;
  if (recipe.ingredienti_principali.lievito.toLowerCase().includes(f)) return true;
  if (recipe.ingredienti_principali.spezie?.some(s => s.toLowerCase().includes(f))) return true;
  if (recipe.ingredienti_principali.zuccheri?.some(z => z.toLowerCase().includes(f))) return true;
  return false;
}

function formatRecipeSummary(r: RecipeSummary): string {
  const p = r.parametri;
  const parts: string[] = [];
  parts.push(`**${r.nome}** — ${r.stile}`);
  if (p.og) parts.push(`OG: ${p.og.toFixed(3)}`);
  if (p.fg) parts.push(`FG: ${p.fg.toFixed(3)}`);
  if (p.abv_percent) parts.push(`ABV: ${p.abv_percent}%`);
  if (p.ibu) parts.push(`IBU: ${p.ibu}`);
  if (p.ebc) parts.push(`EBC: ${p.ebc}`);
  if (p.batch_size_litri) parts.push(`Batch: ${p.batch_size_litri}L`);
  if (p.impianto) parts.push(`Impianto: ${p.impianto}`);
  const header = parts.join(' | ');

  const details: string[] = [];
  details.push(`📄 \`${r.path}\``);
  if (r.ingredienti_principali.malti.length > 0) {
    details.push(`🌾 Malti: ${r.ingredienti_principali.malti.slice(0, 8).join(', ')}${r.ingredienti_principali.malti.length > 8 ? '...' : ''}`);
  }
  if (r.ingredienti_principali.luppoli.length > 0) {
    details.push(`🌿 Luppoli: ${r.ingredienti_principali.luppoli.join(', ')}`);
  }
  details.push(`🧫 Lievito: ${r.ingredienti_principali.lievito}`);
  if (r.ingredienti_principali.spezie?.length) {
    details.push(`🌶️ Spezie: ${r.ingredienti_principali.spezie.join(', ')}`);
  }
  if (r.ingredienti_principali.zuccheri?.length) {
    details.push(`🍯 Zuccheri: ${r.ingredienti_principali.zuccheri.join(', ')}`);
  }
  return `${header}\n  ${details.join('\n  ')}`;
}

function resolveDir(searchDir: string | undefined): string {
  if (!searchDir) return process.cwd();
  if (searchDir.startsWith('~')) {
    const home = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '/';
    return join(home, searchDir.slice(1));
  }
  return resolve(searchDir);
}

export class RecipeListTool implements BuiltinTool<RecipeListInput> {
  readonly name = 'recipe_list' as const;
  readonly description =
    'Scansiona il workspace alla ricerca di file .yaml/.yml di ricette brassicole. Restituisce un elenco con nome, stile, parametri (OG/FG/ABV/IBU/EBC), ingredienti principali e percorso file. Supporta filtro per stile, ingrediente o parola chiave (es. "rum", "IPA", "sour", "miele").';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(RecipeListInputSchema);

  resolveExecution(args: RecipeListInput): ToolExecution {
    return {
      description: `Recipe list${args.filter ? ` for "${args.filter}"` : ''}`,
      approvalRule: this.name,
      execute: () => this.execute(args),
    };
  }

  private execute(args: RecipeListInput): Promise<ExecutableToolResult> {
    try {
      const dir = resolveDir(args.search_dir);
      const files = scanYamlFiles(dir, args.max_depth);
      const recipes = files
        .map(f => parseRecipeYaml(f))
        .filter((r): r is RecipeSummary => r !== null);

      if (recipes.length === 0) {
        return Promise.resolve({ output: `Nessuna ricetta trovata in \`${dir}\`.` });
      }

      let filtered = recipes;
      if (args.filter) {
        const f = args.filter;
        filtered = recipes.filter(r => recipeMatchesFilter(r, f));
        if (filtered.length === 0) {
          return Promise.resolve({ output: `Nessuna ricetta corrisponde al filtro "${args.filter}" (${recipes.length} ricette totali trovate in \`${dir}\`).` });
        }
      }

      const lines: string[] = [
        `**${filtered.length} ricetta/e trovata/e${args.filter ? ` per "${args.filter}"` : ''}** in \`${dir}\` (${recipes.length} totali)`,
        '',
      ];

      // Sort by name
      filtered.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

      for (const r of filtered) {
        lines.push(formatRecipeSummary(r));
        lines.push('');
      }

      return Promise.resolve({ output: lines.join('\n') });
    } catch (error) {
      return Promise.resolve({ isError: true, output: error instanceof Error ? error.message : String(error) });
    }
  }
}

registerTool(RecipeListTool);
