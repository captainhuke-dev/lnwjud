import { invokeViaRegistry, type McpServerOptions } from '@lnwjud/mcp-server';
import { ToolRegistry } from '@lnwjud/mcp-server';

/**
 * Task 2.1 — bridge between the RelayAgent and the desktop MCP tool surface.
 *
 * The relay agent invokes tools through the same ToolRegistry the stdio/HTTP
 * transports use, so permissions, audit, activity tracking and budget guard
 * all apply identically regardless of transport.
 */

export type McpServerOptionsLike = McpServerOptions;

/** Invoke a single tool through a fresh registry bound to the given services. */
export async function invokeToolViaRegistry(
  options: McpServerOptions,
  name: string,
  input: unknown,
): Promise<unknown> {
  return invokeViaRegistry(options, name, input);
}

/** List tool metadata (name/description/schema) for catalog publication. */
export function listRegistryTools(options: McpServerOptions): readonly unknown[] {
  const registry = new ToolRegistry(options.services, options.actor, {
    ...(options.diagnostic === undefined ? {} : { diagnostic: options.diagnostic }),
    ...(options.activity === undefined ? {} : { activity: options.activity }),
    ...(options.activityTracker === undefined ? {} : { activityTracker: options.activityTracker }),
    ...(options.profileProvider === undefined ? {} : { profileProvider: options.profileProvider }),
    ...(options.allowAiDeleteProvider === undefined ? {} : { allowAiDeleteProvider: options.allowAiDeleteProvider }),
    ...(options.codexToolsEnabled === undefined ? {} : { codexToolsEnabled: options.codexToolsEnabled }),
    ...(options.incrementalVerifier === undefined ? {} : { incrementalVerifier: options.incrementalVerifier }),
  });
  return registry.list().map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
  }));
}
