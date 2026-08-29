import { describe, expect, it } from 'vitest';
import { executeToolCallSafely } from './tool-result-safety.js';

describe('tool result transport safety', () => {
  it('converts an unhandled tool failure into a recoverable MCP error result', async () => {
    const result = await executeToolCallSafely(async () => {
      throw new Error('boom');
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: 'text', text: 'INTERNAL_ERROR: boom' }]);
    expect(result.structuredContent).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'boom', recoverable: true },
    });
  });

  it('replaces a response above the 8 MiB tunnel safety threshold', async () => {
    const result = await executeToolCallSafely(async () => ({
      content: [{ type: 'text' as const, text: 'x'.repeat((8 * 1024 * 1024) + 1) }],
    }));

    expect(result.isError).toBe(true);
    expect((result.structuredContent as { error?: { code?: string } } | undefined)?.error?.code).toBe('RESPONSE_TOO_LARGE');
    expect(result.content[0]).toMatchObject({ type: 'text' });
  });
});
