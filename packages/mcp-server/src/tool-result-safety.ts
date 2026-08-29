import type { CallToolResult } from '@modelcontextprotocol/server';

export const MAX_SAFE_MCP_RESPONSE_BYTES = 8 * 1024 * 1024;

export async function executeToolCallSafely(
  invoke: () => Promise<CallToolResult>,
  maxBytes = MAX_SAFE_MCP_RESPONSE_BYTES,
): Promise<CallToolResult> {
  try {
    return enforceResponsePayloadLimit(await invoke(), maxBytes);
  } catch (cause: unknown) {
    return recoverableErrorResult('INTERNAL_ERROR', errorMessage(cause));
  }
}

export function enforceResponsePayloadLimit(
  result: CallToolResult,
  maxBytes = MAX_SAFE_MCP_RESPONSE_BYTES,
): CallToolResult {
  let serialized: string;
  try {
    serialized = JSON.stringify(result);
  } catch (cause: unknown) {
    return recoverableErrorResult('RESPONSE_SERIALIZATION_FAILED', errorMessage(cause));
  }
  const bytes = Buffer.byteLength(serialized, 'utf8');
  if (bytes <= maxBytes) return result;
  return recoverableErrorResult(
    'RESPONSE_TOO_LARGE',
    `Tool response is ${bytes} bytes, exceeding the ${maxBytes}-byte tunnel safety threshold`,
  );
}

function recoverableErrorResult(code: string, message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: `${code}: ${message}` }],
    structuredContent: {
      error: { code, message, recoverable: true },
    },
  };
}

function errorMessage(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim().length > 0) return cause.message;
  if (typeof cause === 'string' && cause.trim().length > 0) return cause.trim();
  return 'Unexpected tool failure';
}
