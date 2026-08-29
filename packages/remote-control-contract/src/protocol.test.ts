import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseRemoteCommandV1, REMOTE_ACTIONS } from './index.js';

describe('remote-control protocol v1', () => {
  it('exports exactly the approved action identifiers', () => {
    expect([...REMOTE_ACTIONS]).toEqual([
      'status.refresh',
      'logs.recovery.read',
      'desktop.start',
      'diagnostics.collect',
      'tunnel.status',
      'desktop.stop',
      'desktop.restart',
      'tunnel.start',
      'tunnel.stop',
      'tunnel.restart',
      'tunnel.recover_stale',
    ]);
  });

  it('accepts a bounded status command', () => {
    const command = parseRemoteCommandV1({
      protocolVersion: 1,
      commandId: randomUUID(),
      deviceId: 'dev-1',
      action: 'status.refresh',
      actorId: 'operator-1',
      deliverySequence: 1,
      createdAt: '2026-08-29T09:00:00.000Z',
      expiresAt: '2026-08-29T09:01:00.000Z',
      parameters: {},
    });
    expect(command.action).toBe('status.refresh');
  });

  it.each(['shell', 'mcp.call', 'file.write', 'system.reboot'])('rejects unapproved action %s', (action) => {
    expect(() => parseRemoteCommandV1({
      protocolVersion: 1,
      commandId: randomUUID(),
      deviceId: 'dev-1',
      action,
      actorId: 'operator-1',
      deliverySequence: 1,
      createdAt: '2026-08-29T09:00:00.000Z',
      expiresAt: '2026-08-29T09:01:00.000Z',
      parameters: {},
    })).toThrow();
  });

  it('rejects unknown top-level fields', () => {
    expect(() => parseRemoteCommandV1({
      protocolVersion: 1,
      commandId: randomUUID(),
      deviceId: 'dev-1',
      action: 'status.refresh',
      actorId: 'operator-1',
      deliverySequence: 1,
      createdAt: '2026-08-29T09:00:00.000Z',
      expiresAt: '2026-08-29T09:01:00.000Z',
      parameters: {},
      shell: 'whoami',
    })).toThrow();
  });
});
