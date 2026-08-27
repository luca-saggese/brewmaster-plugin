/**
 * Brewday log tool — journaling tool for tracking brew sessions.
 *
 * Stores a structured timeline for each brew session linked to a recipe.
 * Each entry records: timestamp, phase (mash/boil/fermentation/etc),
 * measurements (OG, temp, pH, etc), notes, issues, and improvements.
 *
 * Data stored per-user under the data root (`.brewing-data` inside the user's
 * chroot, else `~/.kimi-code/brewing`) in `brewday/{recipe_key}.json`.
 */

import { z } from 'zod';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import { join, dirname, basename } from 'node:path';

import type { BuiltinTool, ToolExecution, ExecutableToolResult } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';
import { dataRoot } from './data-root';

// ── Types ────────────────────────────────────────────────────────────────────

interface BrewdayEntry {
  timestamp: string;         // ISO 8601
  phase: string;             // mash, boil, whirlpool, cooling, fermentation, dry_hop, cold_crash, bottling, kegging, tasting, other
  measurements?: Record<string, unknown>;  // es. { og: 1.052, temp_c: 67, ph: 5.4 }
  notes: string;             // testo libero
  issues?: string;           // cosa è andato storto
  improvements?: string;     // cosa fare meglio la prossima volta
  duration_minutes?: number; // durata della fase
}

interface BrewdayLog {
  version: 1;
  recipe_name: string;
  recipe_key: string;        // sanitized key for file naming
  recipe_path?: string;      // original YAML path
  brew_number: number;       // which brew of this recipe (1, 2, 3...)
  brew_date: string;         // ISO date when the brew started
  batch_size_litres?: number;
  target_og?: number;
  target_fg?: number;
  actual_og?: number;
  actual_fg?: number;
  actual_abv?: number;
  efficiency_percent?: number;
  entries: BrewdayEntry[];
  summary?: string;          // overall summary written at end
  rating?: number;           // 1-10
  status: 'planned' | 'in_progress' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface BrewdayLogFile {
  version: 1;
  logs: BrewdayLog[];
}

// ── Storage ──────────────────────────────────────────────────────────────────

function brewdayDir(root: string): string {
  return join(root, 'brewday');
}

function logFilePath(root: string, recipeKey: string): string {
  return join(brewdayDir(root), `${sanitizeKey(recipeKey)}.json`);
}

function sanitizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
}

function ensureBrewdayDir(root: string): void {
  const dir = brewdayDir(root);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadLogFile(root: string, recipeKey: string): BrewdayLog[] {
  const path = logFilePath(root, recipeKey);
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as BrewdayLogFile;
    if (parsed.version === 1 && Array.isArray(parsed.logs)) {
      return parsed.logs;
    }
    return [];
  } catch {
    return [];
  }
}

function saveLogFile(root: string, recipeKey: string, logs: BrewdayLog[]): void {
  ensureBrewdayDir(root);
  const path = logFilePath(root, recipeKey);
  const file: BrewdayLogFile = { version: 1, logs };
  writeFileSync(path, JSON.stringify(file, null, 2), 'utf-8');
}

function listAllRecipeKeys(root: string): string[] {
  ensureBrewdayDir(root);
  try {
    return readdirSync(brewdayDir(root))
      .filter(f => f.endsWith('.json'))
      .map(f => basename(f, '.json'));
  } catch {
    return [];
  }
}

// ── Input Schema ─────────────────────────────────────────────────────────────

export const BrewdayLogInputSchema = z.object({
  action: z.enum(['start', 'add_entry', 'log', 'list', 'read', 'summary', 'delete']).describe(
    "Action: 'start' (create new brew log), 'add_entry'/'log' (add a timed entry), 'list' (all brew logs for a recipe), 'read' (full log of a specific brew), 'summary' (set final summary/rating), 'delete' (remove a brew log)."
  ),
  recipe_name: z.string().optional().describe('Recipe name (required for most actions).'),
  recipe_key: z.string().optional().describe('Recipe key override for file naming (auto-generated from recipe_name if omitted).'),
  recipe_path: z.string().optional().describe('Path to the recipe YAML file (auto-detected from recipe_list if omitted).'),
  brew_number: z.number().optional().describe('Which brew number (auto-incremented for start, required for add_entry/log/summary on existing brews).'),
  // for start
  batch_size_litres: z.number().optional(),
  target_og: z.number().optional(),
  target_fg: z.number().optional(),
  brew_date: z.string().optional().describe('Brew date (ISO format). Defaults to today.'),
  // for add_entry / log
  phase: z.string().optional().describe('Phase: mash, boil, whirlpool, cooling, fermentation, dry_hop, cold_crash, bottling, kegging, tasting, measurement, other.'),
  notes: z.string().optional().describe('What happened, observations, measurements.'),
  issues: z.string().optional().describe('What went wrong or unexpected.'),
  improvements: z.string().optional().describe('What to do better next time.'),
  measurements_json: z.string().optional().describe('JSON string of key-value measurements. Example: \'{"og":1.052,"temp_c":67,"ph":5.4}\'.'),
  duration_minutes: z.number().optional().describe('Duration of this phase in minutes.'),
  timestamp: z.string().optional().describe('ISO timestamp for the entry. Defaults to now.'),
  // for summary
  actual_og: z.number().optional(),
  actual_fg: z.number().optional(),
  actual_abv: z.number().optional(),
  efficiency_percent: z.number().optional(),
  summary: z.string().optional().describe('Overall summary of the brew session.'),
  rating: z.number().optional().describe('Rating 1-10.'),
  status: z.string().optional().describe('Brew status: planned, in_progress, completed, archived. Default "in_progress" for start, "completed" when summary is set.'),
});

export type BrewdayLogInput = z.infer<typeof BrewdayLogInputSchema>;

// ── Formatting ───────────────────────────────────────────────────────────────

function formatBrewdayEntry(e: BrewdayEntry): string {
  const date = e.timestamp.slice(0, 19).replace('T', ' ');
  let line = `⏱️ \`${date}\` **[${e.phase}]** ${e.notes}`;
  if (e.measurements && Object.keys(e.measurements).length > 0) {
    const m = Object.entries(e.measurements).map(([k, v]) => `${k}: ${v}`).join(', ');
    line += `\n    📏 ${m}`;
  }
  if (e.duration_minutes) line += ` (${e.duration_minutes} min)`;
  if (e.issues) line += `\n    ⚠️ Problema: ${e.issues}`;
  if (e.improvements) line += `\n    💡 Miglioramento: ${e.improvements}`;
  return line;
}

function formatBrewdayLog(log: BrewdayLog): string {
  const lines: string[] = [];
  const statusEmoji = { planned: '📋', in_progress: '🔄', completed: '✅', archived: '📦' };
  const se = statusEmoji[log.status] ?? '❓';

  lines.push(`## ${se} ${log.recipe_name} — Cotta #${log.brew_number} (${log.status})`);
  lines.push(`📅 Data cotta: ${log.brew_date ?? 'Non specificata'}`);
  if (log.batch_size_litres) lines.push(`📦 Batch: ${log.batch_size_litres}L`);
  if (log.target_og) lines.push(`🎯 Target OG: ${log.target_og.toFixed(3)}`);
  if (log.actual_og) lines.push(`🔬 OG misurato: ${log.actual_og.toFixed(3)}`);
  if (log.target_fg) lines.push(`🎯 Target FG: ${log.target_fg.toFixed(3)}`);
  if (log.actual_fg) lines.push(`🔬 FG misurato: ${log.actual_fg.toFixed(3)}`);
  if (log.actual_abv) lines.push(`🍺 ABV effettivo: ${log.actual_abv}%`);
  if (log.efficiency_percent) lines.push(`⚙️ Efficienza: ${log.efficiency_percent}%`);
  if (log.rating) lines.push(`⭐ Valutazione: ${log.rating}/10`);

  if (log.entries.length > 0) {
    lines.push('');
    lines.push('### Cronologia');
    // Sort entries by timestamp
    const sorted = [...log.entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    for (const e of sorted) {
      lines.push(formatBrewdayEntry(e));
    }
  }

  if (log.summary) {
    lines.push('');
    lines.push(`### 📝 Riepilogo\n${log.summary}`);
  }

  lines.push(`\n_creato: ${log.createdAt.slice(0, 10)}, aggiornato: ${log.updatedAt.slice(0, 10)}_`);
  return lines.join('\n');
}

// ── Tool ─────────────────────────────────────────────────────────────────────

export class BrewdayLogTool implements BuiltinTool<BrewdayLogInput> {
  readonly name = 'brewday_log' as const;
  readonly description =
    'Diario di cotta brassicola. Registra ogni fase della produzione (mash, boil, fermentazione, dry hop, imbottigliamento, ecc.) con misure, note, problemi e miglioramenti. Ogni cotta è collegata a una ricetta. Usalo per tracciare tutto ciò che succede durante una cotta e poterlo consultare in futuro.';
  readonly parameters: Record<string, unknown> = {
    type: 'object',
    properties: {
      action: { type: 'string', description: "Action: 'start' (create new brew log), 'add_entry'/'log' (add a timed entry), 'list' (all brew logs for a recipe), 'read' (full log of a specific brew), 'summary' (set final summary/rating), 'delete' (remove a brew log)." },
      recipe_name: { type: 'string', description: 'Recipe name (required for most actions).' },
      recipe_key: { type: 'string', description: 'Recipe key for file naming (auto-generated from recipe_name if omitted).' },
      recipe_path: { type: 'string', description: 'Path to the recipe YAML file.' },
      brew_number: { type: 'number', description: 'Which brew number (auto-incremented for start).' },
      batch_size_litres: { type: 'number' },
      target_og: { type: 'number' },
      target_fg: { type: 'number' },
      brew_date: { type: 'string', description: 'Brew date (ISO format). Defaults to today.' },
      phase: { type: 'string', description: 'Phase: mash, boil, whirlpool, cooling, fermentation, dry_hop, cold_crash, bottling, kegging, tasting, measurement, other.' },
      notes: { type: 'string', description: 'What happened, observations, measurements.' },
      issues: { type: 'string', description: 'What went wrong or unexpected.' },
      improvements: { type: 'string', description: 'What to do better next time.' },
      measurements_json: { type: 'string', description: 'JSON string of key-value measurements. Example: \'{"og":1.052,"temp_c":67,"ph":5.4}\'.' },
      duration_minutes: { type: 'number', description: 'Duration of this phase in minutes.' },
      timestamp: { type: 'string', description: 'ISO timestamp for the entry. Defaults to now.' },
      actual_og: { type: 'number' },
      actual_fg: { type: 'number' },
      actual_abv: { type: 'number' },
      efficiency_percent: { type: 'number' },
      summary: { type: 'string', description: 'Overall summary of the brew session.' },
      rating: { type: 'number', description: 'Rating 1-10.' },
      status: { type: 'string', description: 'Brew status: planned, in_progress, completed, archived.' },
    },
    required: ['action'],
    additionalProperties: false,
  };

  resolveExecution(args: BrewdayLogInput): ToolExecution {
    const root = dataRoot(args);
    const desc = args.action === 'start'
      ? `Start brew log: ${args.recipe_name ?? 'unknown'}`
      : `Brewday ${args.action}: ${args.recipe_name ?? ''}`;
    return {
      description: desc,
      approvalRule: this.name,
      execute: () => this.execute(args, root),
    };
  }

  private execute(args: BrewdayLogInput, root: string): Promise<ExecutableToolResult> {
    try {
      switch (args.action) {
        case 'start': return this.handleStart(args, root);
        case 'add_entry':
        case 'log': return this.handleAddEntry(args, root);
        case 'list': return this.handleList(args, root);
        case 'read': return this.handleRead(args, root);
        case 'summary': return this.handleSummary(args, root);
        case 'delete': return this.handleDelete(args, root);
        default:
          return Promise.resolve({ isError: true, output: `Azione sconosciuta: ${args.action}` });
      }
    } catch (error) {
      return Promise.resolve({ isError: true, output: error instanceof Error ? error.message : String(error) });
    }
  }

  private handleStart(args: BrewdayLogInput, root: string): Promise<ExecutableToolResult> {
    if (!args.recipe_name) return Promise.resolve({ isError: true, output: 'recipe_name è obbligatorio per start.' });

    const recipeKey = args.recipe_key ?? sanitizeKey(args.recipe_name);
    const logs = loadLogFile(root, recipeKey);
    const brewNumber = logs.length + 1;
    const now = new Date().toISOString();

    const newLog: BrewdayLog = {
      version: 1,
      recipe_name: args.recipe_name,
      recipe_key: recipeKey,
      recipe_path: args.recipe_path,
      brew_number: brewNumber,
      brew_date: args.brew_date ?? now.slice(0, 10),
      batch_size_litres: args.batch_size_litres,
      target_og: args.target_og,
      target_fg: args.target_fg,
      entries: [],
      status: (args.status as BrewdayLog['status']) ?? 'in_progress',
      createdAt: now,
      updatedAt: now,
    };

    logs.push(newLog);
    saveLogFile(root, recipeKey, logs);

    return Promise.resolve({
      output: [
        `✅ **Cotta #${brewNumber} avviata:** ${args.recipe_name}`,
        `📅 Data: ${newLog.brew_date}`,
        args.batch_size_litres ? `📦 Batch: ${args.batch_size_litres}L` : '',
        `📂 File: \`${logFilePath(root, recipeKey)}\` (key: ${recipeKey})`,
        '',
        `Usa \`brewday_log action:"add_entry" recipe_name:"${args.recipe_name}" ...\` per registrare gli eventi.`,
      ].filter(Boolean).join('\n'),
    });
  }

  private parseMeasurements(rawJson?: string): Record<string, unknown> | undefined {
    if (!rawJson) return undefined;
    try {
      const parsed = JSON.parse(rawJson);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through
    }
    return undefined;
  }

  private handleAddEntry(args: BrewdayLogInput, root: string): Promise<ExecutableToolResult> {
    if (!args.recipe_name) return Promise.resolve({ isError: true, output: 'recipe_name è obbligatorio.' });
    if (!args.notes) return Promise.resolve({ isError: true, output: 'notes è obbligatorio per add_entry.' });

    const recipeKey = args.recipe_key ?? sanitizeKey(args.recipe_name);
    const logs = loadLogFile(root, recipeKey);
    if (logs.length === 0) {
      return Promise.resolve({ isError: true, output: `Nessuna cotta trovata per "${args.recipe_name}". Usa action:"start" prima.` });
    }

    // Find the right brew
    const brewNumber = args.brew_number ?? logs.length; // default to last
    const idx = logs.findIndex(l => l.brew_number === brewNumber);
    if (idx < 0) {
      return Promise.resolve({ isError: true, output: `Cotta #${brewNumber} non trovata per "${args.recipe_name}". Cotte disponibili: ${logs.map(l => l.brew_number).join(', ')}` });
    }

    const target = logs[idx]!;

    const measurements = this.parseMeasurements(args.measurements_json);
    const entry: BrewdayEntry = {
      timestamp: args.timestamp ?? new Date().toISOString(),
      phase: args.phase ?? 'other',
      notes: args.notes ?? '',
      issues: args.issues,
      improvements: args.improvements,
      duration_minutes: args.duration_minutes,
      measurements,
    };

    // Auto-update og/fg if provided in measurements
    if (measurements) {
      const mOg = measurements['og'];
      const mFg = measurements['fg'];
      if (typeof mOg === 'number') target.actual_og = mOg;
      if (typeof mFg === 'number') target.actual_fg = mFg;
    }

    target.entries.push(entry);
    target.updatedAt = new Date().toISOString();
    saveLogFile(root, recipeKey, logs);

    return Promise.resolve({
      output: [
        `📝 **Entry aggiunta alla Cotta #${brewNumber}** di "${args.recipe_name}"`,
        formatBrewdayEntry(entry),
      ].join('\n'),
    });
  }

  private handleList(args: BrewdayLogInput, root: string): Promise<ExecutableToolResult> {
    if (args.recipe_name) {
      const recipeKey = args.recipe_key ?? sanitizeKey(args.recipe_name);
      const logs = loadLogFile(root, recipeKey);
      if (logs.length === 0) {
        return Promise.resolve({ output: `Nessuna cotta registrata per "${args.recipe_name}".` });
      }

      const lines = [`**${logs.length} cotta/e per "${args.recipe_name}":**`, ''];
      for (const log of logs) {
        const se = { planned: '📋', in_progress: '🔄', completed: '✅', archived: '📦' }[log.status] ?? '❓';
        lines.push(`${se} **#${log.brew_number}** — ${log.brew_date} — ${log.status} — ${log.entries.length} entry — Rating: ${log.rating ?? 'n/a'}/10`);
        if (log.summary) lines.push(`   ${log.summary.slice(0, 120)}${log.summary.length > 120 ? '...' : ''}`);
      }
      return Promise.resolve({ output: lines.join('\n') });
    }

    // List all recipes with brew logs
    const keys = listAllRecipeKeys(root);
    if (keys.length === 0) {
      return Promise.resolve({ output: 'Nessun diario di cotta trovato. Usa `brewday_log action:"start"` per iniziarne uno.' });
    }

    const lines = [`**${keys.length} ricette con diario di cotta:**`, ''];
    for (const key of keys.sort()) {
      const logs = loadLogFile(root, key);
      const name = logs[0]?.recipe_name ?? key;
      const activeCount = logs.filter(l => l.status === 'in_progress').length;
      const completedCount = logs.filter(l => l.status === 'completed').length;
      const total = logs.length;
      lines.push(`📋 **${name}** — ${total} cotta/e (${activeCount} in corso, ${completedCount} completate)`);
    }
    return Promise.resolve({ output: lines.join('\n') });
  }

  private handleRead(args: BrewdayLogInput, root: string): Promise<ExecutableToolResult> {
    if (!args.recipe_name) return Promise.resolve({ isError: true, output: 'recipe_name è obbligatorio per read.' });

    const recipeKey = args.recipe_key ?? sanitizeKey(args.recipe_name);
    const logs = loadLogFile(root, recipeKey);
    if (logs.length === 0) {
      return Promise.resolve({ output: `Nessuna cotta registrata per "${args.recipe_name}".` });
    }

    if (args.brew_number) {
      const log = logs.find(l => l.brew_number === args.brew_number);
      if (!log) return Promise.resolve({ isError: true, output: `Cotta #${args.brew_number} non trovata. Disponibili: ${logs.map(l => l.brew_number).join(', ')}` });
      return Promise.resolve({ output: formatBrewdayLog(log) });
    }

    // Return all brews for this recipe
    const lines: string[] = [`# Diario di cotta: ${args.recipe_name}`, ''];
    for (const log of logs) {
      lines.push(formatBrewdayLog(log));
      lines.push('---');
    }
    return Promise.resolve({ output: lines.join('\n') });
  }

  private handleSummary(args: BrewdayLogInput, root: string): Promise<ExecutableToolResult> {
    if (!args.recipe_name) return Promise.resolve({ isError: true, output: 'recipe_name è obbligatorio.' });

    const recipeKey = args.recipe_key ?? sanitizeKey(args.recipe_name);
    const logs = loadLogFile(root, recipeKey);
    const brewNumber = args.brew_number ?? logs.length;
    const idx = logs.findIndex(l => l.brew_number === brewNumber);
    if (idx < 0) {
      return Promise.resolve({ isError: true, output: `Cotta #${brewNumber} non trovata.` });
    }

    const target = logs[idx]!;

    if (args.summary) target.summary = args.summary;
    if (args.rating) target.rating = args.rating;
    if (args.actual_og) target.actual_og = args.actual_og;
    if (args.actual_fg) target.actual_fg = args.actual_fg;
    if (args.actual_abv) target.actual_abv = args.actual_abv;
    if (args.efficiency_percent) target.efficiency_percent = args.efficiency_percent;
    if (args.status) target.status = args.status as BrewdayLog['status'];
    // Auto-complete if summary is set and status is still in_progress
    if (args.summary && target.status === 'in_progress') {
      target.status = 'completed';
    }

    target.updatedAt = new Date().toISOString();
    saveLogFile(root, recipeKey, logs);

    return Promise.resolve({
      output: [
        `✅ **Riepilogo aggiornato** per Cotta #${brewNumber} di "${args.recipe_name}"`,
        `📊 Status: ${target.status}`,
        target.rating ? `⭐ Rating: ${target.rating}/10` : '',
        target.actual_og ? `🔬 OG: ${target.actual_og.toFixed(3)}` : '',
        target.actual_fg ? `🔬 FG: ${target.actual_fg.toFixed(3)}` : '',
        target.actual_abv ? `🍺 ABV: ${target.actual_abv}%` : '',
        target.efficiency_percent ? `⚙️ Efficienza: ${target.efficiency_percent}%` : '',
        '',
        target.summary ?? '(nessun riepilogo testuale)',
      ].filter(Boolean).join('\n'),
    });
  }

  private handleDelete(args: BrewdayLogInput, root: string): Promise<ExecutableToolResult> {
    if (!args.recipe_name) return Promise.resolve({ isError: true, output: 'recipe_name è obbligatorio per delete.' });

    const recipeKey = args.recipe_key ?? sanitizeKey(args.recipe_name);
    const logs = loadLogFile(root, recipeKey);

    if (args.brew_number) {
      const idx = logs.findIndex(l => l.brew_number === args.brew_number);
      if (idx < 0) return Promise.resolve({ isError: true, output: `Cotta #${args.brew_number} non trovata.` });
      logs.splice(idx, 1);
      if (logs.length === 0) {
        // Remove the file entirely
        const path = logFilePath(root, recipeKey);
        if (existsSync(path)) unlinkSync(path);
        return Promise.resolve({ output: `🗑️ Cotta #${args.brew_number} eliminata. File rimosso (nessuna altra cotta per "${args.recipe_name}").` });
      }
      saveLogFile(root, recipeKey, logs);
      return Promise.resolve({ output: `🗑️ Cotta #${args.brew_number} eliminata da "${args.recipe_name}". ${logs.length} cotta/e rimanenti.` });
    }

    // Delete all brews for this recipe
    const path = logFilePath(root, recipeKey);
    if (existsSync(path)) unlinkSync(path);
    return Promise.resolve({ output: `🗑️ Tutte le cotte per "${args.recipe_name}" eliminate.` });
  }
}

registerTool(BrewdayLogTool);
