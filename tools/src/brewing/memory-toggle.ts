/**
 * Memory toggle tool — enable or disable persistent memory for this session.
 * When disabled, memory_save is a no-op and the agent won't read/write memories.
 */

import { z } from 'zod';

import type { BuiltinTool, ToolExecution } from '../shim/tool-contract';
import { registerTool } from '../shim/tool-registry';
import { toInputJsonSchema } from '../shim/input-schema';

export const MemoryToggleInputSchema = z.object({
  enabled: z.boolean().describe('true = enable memory (default), false = disable (temporary session).'),
});

export type MemoryToggleInput = z.infer<typeof MemoryToggleInputSchema>;

/** Module-level flag: when false, memory_save is a no-op. Default true. */
let memoryEnabled = true;

export function isMemoryEnabled(): boolean {
  return memoryEnabled;
}

export function _resetMemoryEnabledForTests(): void {
  memoryEnabled = true;
}

export class MemoryToggleTool implements BuiltinTool<MemoryToggleInput> {
  readonly name = 'memory_toggle' as const;
  readonly description =
    'Enable or disable persistent cross-session memory. Use to start a temporary session where nothing is remembered.';
  readonly parameters: Record<string, unknown> = toInputJsonSchema(MemoryToggleInputSchema);

  resolveExecution(args: MemoryToggleInput): ToolExecution {
    return {
      description: `Memory ${args.enabled ? 'enabled' : 'disabled'}`,
      approvalRule: this.name,
      execute: () => {
        memoryEnabled = args.enabled;
        return Promise.resolve({
          output: args.enabled
            ? 'Memoria cross-session **attivata**. Le informazioni importanti verranno ricordate tra una chat e l\'altra.'
            : 'Memoria cross-session **disattivata**. Questa è una sessione temporanea — nulla verrà ricordato.',
        });
      },
    };
  }
}

registerTool(MemoryToggleTool);
