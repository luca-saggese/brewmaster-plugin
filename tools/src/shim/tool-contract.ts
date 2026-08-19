/**
 * Minimal standalone re-implementation of the subset of agent-core-v2's
 * `#/tool/toolContract` surface that the ported brewing tools rely on.
 *
 * The brewing tools were originally builtin agent-core-v2 tools; this plugin
 * runs them from a standalone MCP stdio server instead, so this shim only
 * needs to satisfy the type shapes each tool file imports (`BuiltinTool`,
 * `ToolExecution`, `ExecutableToolResult`, `ExecutableToolContext`) — no DI,
 * scheduling, or approval semantics are needed here.
 */

export type ExecutableToolOutput = string;

export interface ExecutableToolSuccessResult {
  readonly output: ExecutableToolOutput;
  readonly isError?: false | undefined;
}

export interface ExecutableToolErrorResult {
  readonly output: ExecutableToolOutput;
  readonly isError: true;
}

export type ExecutableToolResult = ExecutableToolSuccessResult | ExecutableToolErrorResult;

export interface ExecutableToolContext {
  readonly turnId: number;
  readonly toolCallId: string;
  readonly signal: AbortSignal;
}

export interface RunnableToolExecution {
  readonly description?: string;
  readonly approvalRule: string;
  readonly execute: (ctx: ExecutableToolContext) => Promise<ExecutableToolResult>;
}

export type ToolExecution = RunnableToolExecution;

export interface ExecutableTool<Input = unknown> {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  resolveExecution(input: Input): ToolExecution | Promise<ToolExecution>;
}

export type BuiltinTool<Input = unknown> = ExecutableTool<Input>;
