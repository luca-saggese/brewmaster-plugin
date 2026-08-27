/**
 * Memory save tool — persistently remembers a fact across sessions.
 */

import { z } from 'zod';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';
import { saveMemory } from './memory-store';
import { isMemoryEnabled } from './memory-toggle';
import { dataRoot } from './data-root';

export const MemorySaveInputSchema = z.object({
  key: z.string().describe('Short identifier for this memory (e.g. "brewzilla_efficiency", "preferred_hops").'),
  category: z.enum(['equipment', 'preference', 'constraint', 'goal', 'note', 'technique', 'ingredient', 'water', 'other', 'recipe', 'brewday']).describe('Categoria della memoria. Valori validi: equipment, preference, constraint, goal, note, technique, ingredient, water, other, recipe, brewday.'),
  content: z.string().describe('The fact or preference to remember, written as a complete sentence.'),
});

export type MemorySaveInput = z.infer<typeof MemorySaveInputSchema>;

export class MemorySaveTool implements BuiltinTool<MemorySaveInput> {
  readonly name = 'memory_save' as const;
  readonly description =
    'Persistently remember a brewing-related fact or preference across sessions. Use for equipment specs, user preferences, recurring goals, or learned constraints.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(MemorySaveInputSchema);

  resolveExecution(args: MemorySaveInput): ToolExecution {
    const root = dataRoot(args);
    return {
      description: `Remember: ${args.key}`,
      approvalRule: this.name,
      execute: () => {
        try {
          if (!isMemoryEnabled()) {
            return Promise.resolve({ output: 'Memoria disattivata (sessione temporanea). Il dato non è stato salvato.' });
          }
          saveMemory(root, { key: args.key, category: args.category, content: args.content });
          return Promise.resolve({ output: `Memorizzato: [${args.category}] ${args.content} (key: ${args.key})` });
        } catch (error) {
          return Promise.resolve({ isError: true, output: error instanceof Error ? error.message : String(error) });
        }
      },
    };
  }
}

registerTool(MemorySaveTool);
