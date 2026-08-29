import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseRemoteCommandV1, REMOTE_ACTIONS } from './index.js';

function validCommand(overrides: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    protocolVersion: 1,
    commandId: randomUUID(),
    deviceId: 'dev-1',
    action: 'status.refresh',
    actorId: 'operator-1',
    deliverySequence: 1,
    createdAt: '2026-08-29T09:00:00.000Z',
    expiresAt: '2026-08-29T09:01:00.000Z',
    parameters: {},
    ...overrides,
  };
}

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
    expect(parseRemoteCommandV1(validCommand()).action).toBe('status.refresh');
  });

  it.each(['shell', 'mcp.call', 'file.write', 'system.reboot'])('rejects unapproved action %s', (action) => {
    expect(() => parseRemoteCommandV1(validCommand({ action }))).toThrow();
  });

  it('rejects unknown top-level fields', () => {
    expect(() => parseRemoteCommandV1(validCommand({ shell: 'whoami' }))).toThrow();
  });

  it('rejects protocol versions other than 1', () => {
    expect(() => parseRemoteCommandV1(validCommand({ protocolVersion: 2 }))).toThrow();
  });

  it('requires a UUID command id', () => {
    expect(() => parseRemoteCommandV1(validCommand({ commandId: 'not-a-uuid' }))).toThrow();
  });

  it.each([
    ['deviceId', ''],
    ['deviceId', '   '],
    ['actorId', ''],
    ['actorId', '   '],
  ])('requires non-empty %s', (field, value) => {
    expect(() => parseRemoteCommandV1(validCommand({ [field]: value }))).toThrow();
  });

  it.each([0, -1, 1.5, '1'])('requires a positive integer delivery sequence: %s', (deliverySequence) => {
    expect(() => parseRemoteCommandV1(validCommand({ deliverySequence }))).toThrow();
  });

  it.each([
    ['createdAt', 'not-a-time'],
    ['expiresAt', 'not-a-time'],
  ])('requires a valid %s timestamp', (field, value) => {
    expect(() => parseRemoteCommandV1(validCommand({ [field]: value }))).toThrow();
  });

  it.each([
    '2026-08-29T09:00:00.000Z',
    '2026-08-29T08:59:59.999Z',
  ])('requires expiresAt to be after createdAt: %s', (expiresAt) => {
    expect(() => parseRemoteCommandV1(validCommand({ expiresAt }))).toThrow();
  });

  it('requires parameters to be an object', () => {
    expect(() => parseRemoteCommandV1(validCommand({ parameters: null }))).toThrow();
    expect(() => parseRemoteCommandV1(validCommand({ parameters: [] }))).toThrow();
  });

  it.each([1, 200])('accepts bounded recovery-log limit %s', (limit) => {
    const command = parseRemoteCommandV1(validCommand({
      action: 'logs.recovery.read',
      parameters: { limit },
    }));
    expect(command.parameters).toEqual({ limit });
  });

  it.each([0, 201, 1.5, '10'])('rejects invalid recovery-log limit %s', (limit) => {
    expect(() => parseRemoteCommandV1(validCommand({
      action: 'logs.recovery.read',
      parameters: { limit },
    }))).toThrow();
  });

  it('rejects unknown recovery-log parameters', () => {
    expect(() => parseRemoteCommandV1(validCommand({
      action: 'logs.recovery.read',
      parameters: { path: 'C:\\secret.log' },
    }))).toThrow();
  });

  it('requires empty parameter objects for non-log actions in protocol v1', () => {
    expect(() => parseRemoteCommandV1(validCommand({ parameters: { limit: 10 } }))).toThrow();
  });
});
