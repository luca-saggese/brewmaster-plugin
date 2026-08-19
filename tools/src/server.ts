#!/usr/bin/env node
// Stdio MCP server for the brewmaster plugin.
//
// Speaks newline-delimited JSON-RPC 2.0 on stdin/stdout per the MCP "stdio"
// transport, mirroring the minimal surface used by the other Kimi Code
// plugins (initialize, notifications/initialized, tools/list, tools/call,
// ping). Every brewing tool is a ported agent-core-v2 `BuiltinTool`
// implementation (see ../brewing/*.ts); this file just adapts that contract
// to MCP requests.

import readline from 'node:readline';

import './brewing/index';
import { getRegisteredTools } from './shim/tool-registry';
import type { ExecutableTool } from './shim/tool-contract';

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_NAME = 'brewmaster';
const SERVER_VERSION = '1.0.0';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tools: ExecutableTool<any>[] = getRegisteredTools().map((Ctor) => new Ctor());
const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

async function handleRequest(message: {
  method: string;
  params?: Record<string, unknown>;
}): Promise<unknown> {
  switch (message.method) {
    case 'initialize':
      return {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      };
    case 'ping':
      return {};
    case 'tools/list':
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.parameters,
        })),
      };
    case 'tools/call':
      return runTool(message.params);
    default:
      throw jsonRpcError(-32601, `Method not found: ${message.method}`);
  }
}

async function runTool(params?: Record<string, unknown>): Promise<unknown> {
  const name = typeof params?.['name'] === 'string' ? (params['name'] as string) : undefined;
  const args = (params?.['arguments'] as Record<string, unknown> | undefined) ?? {};
  if (!name) throw jsonRpcError(-32602, 'Missing tool name.');

  const tool = toolsByName.get(name);
  if (!tool) throw jsonRpcError(-32602, `Unknown tool: ${name}`);

  try {
    const execution = await tool.resolveExecution(args);
    const controller = new AbortController();
    const result = await execution.execute({
      turnId: 0,
      toolCallId: `${name}-${Date.now()}`,
      signal: controller.signal,
    });
    return {
      content: [{ type: 'text', text: result.output }],
      isError: result.isError === true,
    };
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text }], isError: true };
  }
}

function jsonRpcError(code: number, message: string): Error & { code: number } {
  const error = new Error(message) as Error & { code: number };
  error.code = code;
  return error;
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let message: { jsonrpc?: string; id?: unknown; method?: string; params?: Record<string, unknown> };
  try {
    message = JSON.parse(trimmed);
  } catch {
    return;
  }

  // Notifications (no `id`) never receive a response.
  if (message.id === undefined) return;
  if (!message.method) return;

  handleRequest({ method: message.method, params: message.params })
    .then((result) => {
      process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id, result })}\n`);
    })
    .catch((error: Error & { code?: number }) => {
      process.stdout.write(
        `${JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          error: { code: error.code ?? -32000, message: error.message },
        })}\n`,
      );
    });
});
