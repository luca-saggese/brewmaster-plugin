/**
 * Memory search tool — retrieves persisted brewing memories.
 * Can search, list all, list by category, or delete memories.
 */

import { z } from 'zod';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';
import { loadMemories, searchMemories, getMemoriesByCategory, deleteMemory } from './memory-store';
import { dataRoot } from './data-root';

export const MemorySearchInputSchema = z.object({
  action: z.enum(['search', 'list', 'by_category', 'delete', 'summary']).describe('Action: search (by query), list (all), by_category, delete, or summary (condensed).'),
  query: z.string().optional().describe('Search query for action=search.'),
  category: z.string().optional().describe('Category filter for action=by_category. Valori: equipment, preference, constraint, goal, note, technique, ingredient, water, other, recipe.'),
  key: z.string().optional().describe('Memory key to delete (for action=delete).'),
});

export type MemorySearchInput = z.infer<typeof MemorySearchInputSchema>;

export class MemorySearchTool implements BuiltinTool<MemorySearchInput> {
  readonly name = 'memory_search' as const;
  readonly description =
    'Search, list, or delete persisted brewing memories. Use to recall user preferences, equipment specs, and learned facts from previous sessions.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(MemorySearchInputSchema);

  resolveExecution(args: MemorySearchInput): ToolExecution {
    const root = dataRoot(args);
    return {
      description: `Memory ${args.action}: ${args.query ?? args.category ?? 'all'}`,
      approvalRule: this.name,
      execute: () => {
        try {
          switch (args.action) {
            case 'search': {
              const q = args.query ?? '';
              const results = searchMemories(root, q);
              if (results.length === 0) return Promise.resolve({ output: `Nessun ricordo trovato per "${q}".` });
              const lines = [`**${results.length} ricordi trovati:**`, ''];
              for (const m of results) {
                lines.push(`- [${m.category}] **${m.key}**: ${m.content} (aggiornato: ${m.updatedAt.slice(0, 10)})`);
              }
              return Promise.resolve({ output: lines.join('\n') });
            }

            case 'list': {
              const all = loadMemories(root);
              if (all.length === 0) return Promise.resolve({ output: 'Nessun ricordo salvato.' });
              const lines = [`**${all.length} ricordi salvati:**`, ''];
              for (const m of all) {
                lines.push(`- [${m.category}] **${m.key}**: ${m.content}`);
              }
              return Promise.resolve({ output: lines.join('\n') });
            }

            case 'by_category': {
              const groups = getMemoriesByCategory(root);
              const category = args.category;
              if (category && groups[category]) {
                const lines = [`**${category} (${groups[category].length} ricordi):**`, ''];
                for (const m of groups[category]) {
                  lines.push(`- **${m.key}**: ${m.content}`);
                }
                return Promise.resolve({ output: lines.join('\n') });
              }
              const lines = ['**Ricordi per categoria:**', ''];
              for (const [cat, entries] of Object.entries(groups)) {
                lines.push(`## ${cat} (${entries.length})`);
                for (const m of entries) {
                  lines.push(`- **${m.key}**: ${m.content}`);
                }
                lines.push('');
              }
              return Promise.resolve({ output: lines.join('\n') });
            }

            case 'delete': {
              if (!args.key) return Promise.resolve({ isError: true, output: 'key is required for delete action.' });
              const ok = deleteMemory(root, args.key);
              return Promise.resolve({ output: ok ? `Ricordo "${args.key}" eliminato.` : `Ricordo "${args.key}" non trovato.` });
            }

            case 'summary': {
              const all = loadMemories(root);
              if (all.length === 0) return Promise.resolve({ output: 'Nessun ricordo salvato.' });
              const groups = getMemoriesByCategory(root);
              const lines = [`**${all.length} ricordi — Riepilogo**`, ''];
              for (const [cat, entries] of Object.entries(groups)) {
                lines.push(`**${cat}:**`);
                for (const m of entries) lines.push(`  • ${m.content}`);
                lines.push('');
              }
              return Promise.resolve({ output: lines.join('\n') });
            }
          }
        } catch (error) {
          return Promise.resolve({ isError: true, output: error instanceof Error ? error.message : String(error) });
        }
      },
    };
  }
}

registerTool(MemorySearchTool);
