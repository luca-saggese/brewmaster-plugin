/**
 * Standalone replacement for agent-core-v2's `registerTool` module-contribution
 * registry. Each ported brewing tool file calls `registerTool(SomeToolClass)`
 * at import time; this shim just records the constructor so `server.ts` can
 * instantiate every tool after importing the `brewing/` barrel.
 */

import type { ExecutableTool } from './tool-contract';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyExecutableTool = ExecutableTool<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolCtor<T extends AnyExecutableTool = AnyExecutableTool> = new (...args: any[]) => T;

const _registered: ToolCtor[] = [];

export function registerTool<T extends AnyExecutableTool>(ctor: ToolCtor<T>): void {
  _registered.push(ctor as ToolCtor);
}

export function getRegisteredTools(): readonly ToolCtor[] {
  return _registered;
}
