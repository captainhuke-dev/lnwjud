import { describe, expect, it } from 'vitest';
import { parseDevicePresenceMessageV1 } from './index.js';

function health(overrides: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    machine: { state: 'reachable', observedAt: '2026-08-29T12:10:00.000Z', evidenceClass: 'supervisor-heartbeat' },
    supervisor: { state: 'online', observedAt: '2026-08-29T12:10:00.000Z', evidenceClass: 'supervisor-heartbeat' },
    desktop: { state: 'stopped', observedAt: '2026-08-29T12:09:59.000Z', evidenceClass: 'process-probe' },
    mcp: { state: 'unknown', observedAt: '2026-08-29T12:09:59.000Z', evidenceClass: 'loopback-probe' },
    tunnel: { state: 'disconnected', observedAt: '2026-08-29T12:09:58.000Z', evidenceClass: 'tunnel-state-probe' },
    ...overrides,
  };
}

describe('remote-control presence protocol v1', () => {
  it('accepts a hello without carrying a bearer token', () => {
    expect(parseDevicePresenceMessageV1({
      type: 'hello',
      protocolVersion: 1,
      deviceId: 'device-1',
    })).toEqual({ type: 'hello', protocolVersion: 1, deviceId: 'device-1' });
  });

  it('accepts a welcome with server time', () => {
    expect(parseDevicePresenceMessageV1({
      type: 'welcome',
      protocolVersion: 1,
      serverTime: '2026-08-29T12:10:00.000Z',
    })).toEqual({ type: 'welcome', protocolVersion: 1, serverTime: '2026-08-29T12:10:00.000Z' });
  });

  it('accepts a heartbeat with five independently reported health components', () => {
    const parsed = parseDevicePresenceMessageV1({
      type: 'heartbeat',
      protocolVersion: 1,
      deviceId: 'device-1',
      health: health(),
    });
    expect(parsed.type).toBe('heartbeat');
    if (parsed.type === 'heartbeat') {
      expect(Object.keys(parsed.health)).toEqual(['machine', 'supervisor', 'desktop', 'mcp', 'tunnel']);
      expect(parsed.health.desktop.state).toBe('stopped');
      expect(parsed.health.mcp.state).toBe('unknown');
    }
  });

  it.each([
    { type: 'hello', protocolVersion: 2, deviceId: 'device-1' },
    { type: 'hello', protocolVersion: 1, deviceId: '   ' },
    { type: 'welcome', protocolVersion: 1, serverTime: 'not-a-time' },
    { type: 'heartbeat', protocolVersion: 1, deviceId: 'device-1', health: health(), deviceToken: 'secret' },
  ])('rejects malformed or secret-bearing top-level message %#', (value) => {
    expect(() => parseDevicePresenceMessageV1(value)).toThrow();
  });

  it.each([
    ['machine', 'online'],
    ['supervisor', 'reachable'],
    ['desktop', 'connected'],
    ['mcp', 'connected'],
    ['tunnel', 'healthy'],
  ])('rejects an invalid %s health state', (component, state) => {
    expect(() => parseDevicePresenceMessageV1({
      type: 'heartbeat',
      protocolVersion: 1,
      deviceId: 'device-1',
      health: health({
        [component]: { state, observedAt: '2026-08-29T12:10:00.000Z', evidenceClass: 'probe' },
      }),
    })).toThrow();
  });

  it.each([
    { state: 'reachable', observedAt: 'not-a-time', evidenceClass: 'probe' },
    { state: 'reachable', observedAt: '2026-08-29T12:10:00.000Z', evidenceClass: '' },
    { state: 'reachable', observedAt: '2026-08-29T12:10:00.000Z', evidenceClass: 'probe', detail: 'raw secret' },
  ])('rejects malformed or extended nested health samples %#', (machine) => {
    expect(() => parseDevicePresenceMessageV1({
      type: 'heartbeat',
      protocolVersion: 1,
      deviceId: 'device-1',
      health: health({ machine }),
    })).toThrow();
  });

  it('rejects unknown message types', () => {
    expect(() => parseDevicePresenceMessageV1({
      type: 'shell',
      protocolVersion: 1,
      deviceId: 'device-1',
    })).toThrow();
  });
});
