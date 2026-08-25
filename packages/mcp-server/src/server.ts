import { McpServer, type CallToolResult } from '@modelcontextprotocol/server';
import type { DiagnosticLogger, FileActor } from '@lnwjud/application';
import type { PermissionProfile } from '@lnwjud/permissions';
import { APP_NAME, APP_VERSION, type DestructiveAutoApprovalPolicy } from '@lnwjud/shared';
import { readTraceContext, type ActivitySink, type ActivityTracker } from './activity-tracker.js';
import { withProgressHeartbeat, type ProgressNotifyContext } from './progress-heartbeat.js';
import { IncrementalVerifier } from './incremental-verifier.js';
import { RunBudgetGuard, type RunBudgetContext } from './run-budget.js';
import { registerTasksProtocol } from './tasks-protocol.js';
import { ToolRegistry, type ActiveProjectScope, type McpApplicationServices, type WorkspaceScope } from './tool-registry.js';
import { actorForRequestScope, type McpRequestScope } from './request-scope.js';

export interface McpServerOptions {
  readonly services: McpApplicationServices;
  readonly actor: FileActor;
  readonly requestScope?: McpRequestScope;
  readonly diagnostic?: DiagnosticLogger;
  readonly activity?: ActivitySink;
  readonly activityTracker?: ActivityTracker;
  readonly profileProvider?: () => PermissionProfile;
  readonly allowAiDeleteProvider?: () => boolean;
  readonly destructivePolicyProvider?: () => DestructiveAutoApprovalPolicy;
  readonly workspaceScopeResolver?: (workspaceId: string) => WorkspaceScope | null | Promise<WorkspaceScope | null>;
  /** @deprecated Compatibility only. Prefer workspaceScopeResolver. */
  readonly activeProjectProvider?: () => ActiveProjectScope | null;
  /** Exposes quota-consuming Codex delegation tools. Disabled unless explicitly enabled. */
  readonly codexToolsEnabled?: boolean;
  /** Shared across per-request server factories so repeated diff fingerprints can hit cache. */
  readonly incrementalVerifier?: IncrementalVerifier;
  /** Shared across per-request server factories so the run clock starts at the first tool call. */
  readonly runBudgetGuard?: RunBudgetGuard;
}

export function createMcpServer(options: McpServerOptions): McpServer {
  const actor = actorForRequestScope(options.actor, options.requestScope);
  const registry = new ToolRegistry(options.services, actor, {
    ...(options.diagnostic === undefined ? {} : { diagnostic: options.diagnostic }),
    ...(options.activity === undefined ? {} : { activity: options.activity }),
    ...(options.activityTracker === undefined ? {} : { activityTracker: options.activityTracker }),
    ...(options.requestScope === undefined ? {} : { sessionId: options.requestScope.sessionId }),
    ...(options.profileProvider === undefined ? {} : { profileProvider: options.profileProvider }),
    ...(options.allowAiDeleteProvider === undefined ? {} : { allowAiDeleteProvider: options.allowAiDeleteProvider }),
    ...(options.destructivePolicyProvider === undefined ? {} : { destructivePolicyProvider: options.destructivePolicyProvider }),
    ...(options.workspaceScopeResolver === undefined ? {} : { workspaceScopeResolver: options.workspaceScopeResolver }),
    ...(options.activeProjectProvider === undefined ? {} : { activeProjectProvider: options.activeProjectProvider }),
    ...(options.codexToolsEnabled === undefined ? {} : { codexToolsEnabled: options.codexToolsEnabled }),
    ...(options.incrementalVerifier === undefined ? {} : { incrementalVerifier: options.incrementalVerifier }),
  });
  const runBudgetGuard = options.runBudgetGuard ?? new RunBudgetGuard();
  // tasks capability (MCP spec 2025-11-25) exposes existing durable shell
  // background tasks via tasks/get/result/list/cancel. requests.tools.call is
  // intentionally not declared, so clients will not send task-augmented
  // tool calls.
  const server = new McpServer({ name: APP_NAME, version: APP_VERSION }, {
    capabilities: {
      tools: {},
      tasks: { list: {}, cancel: {} },
    },
  });
  registerTasksProtocol(server, options.services, { actor });
  for (const tool of registry.list()) {
    server.registerTool(tool.name, {
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    }, async (input: unknown, context): Promise<CallToolResult> => {
      const dispatchContext = context as ProgressNotifyContext & RunBudgetContext;
      // Task Extend-V1.0.0 #2.2 (graceful degradation): a single failing tool call must
      // never escape as a transport-level fault. The stdio tunnel-client treats an
      // unexpected child exit as fatal ("stdio MCP command failed; requesting
      // tunnel-client shutdown"), which took the whole tunnel down. Convert every
      // unhandled failure into a normal isError result instead.
      try {
        runBudgetGuard.begin(dispatchContext);
        const result = await withProgressHeartbeat(dispatchContext, tool.name, async () => (
          registry.invoke(tool.name, input, readTraceContext(context)) as unknown as Promise<CallToolResult>
        ));
        // Task Extend-V1.0.0 #2.1 (payload guard): the control plane rejects tunnel
        // request/response payloads above 10 MiB with a hard 413
        // (request_body_too_large). Keep serialized responses comfortably below that
        // ceiling so oversized results degrade into an explicit error message instead
        // of killing the stdio transport.
        return enforceResponsePayloadLimit(runBudgetGuard.finish(dispatchContext, result));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Operation failed';
        return {
          isError: true,
          content: [{ type: 'text', text: `INTERNAL_ERROR: ${message}` }],
          structuredContent: { error: { code: 'INTERNAL_ERROR', message, recoverable: true } },
        };
      }
    });
  }
  return server;
}

/** Control-plane hard limit is 10 MiB (10485760); stay safely below it. */
const MAX_TUNNEL_RESPONSE_BYTES = 8 * 1024 * 1024;

export function enforceResponsePayloadLimit(result: CallToolResult): CallToolResult {
  let serializedSize = 0;
  for (const part of result.content ?? []) {
    if (part.type === 'text') serializedSize += Buffer.byteLength(part.text, 'utf8');
    else if (part.type === 'image') serializedSize += Buffer.byteLength(part.data, 'utf8');
  }
  if (result.structuredContent !== undefined) {
    serializedSize += Buffer.byteLength(safeSerialize(result.structuredContent), 'utf8');
  }
  if (serializedSize <= MAX_TUNNEL_RESPONSE_BYTES) return result;
  const message = `RESPONSE_TOO_LARGE: tool response is ${serializedSize} bytes which exceeds the ${MAX_TUNNEL_RESPONSE_BYTES}-byte tunnel payload limit; narrow the request (pagination, filters, smaller limit) instead of requesting the full result`;
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
    structuredContent: { error: { code: 'RESPONSE_TOO_LARGE', message, recoverable: true } },
  };
}

function safeSerialize(value: unknown): string {
  try { return JSON.stringify(value) ?? ''; } catch { return ''; }
}
