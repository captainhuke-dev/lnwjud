import { describe, expect, it } from 'vitest';
import * as contract from './index.js';

function health(): Record<string, unknown> {
  return {
    machine: { state: 'reachable', observedAt: '2026-08-29T15:20:00.000Z', evidenceClass: 'supervisor-heartbeat' },
    supervisor: { state: 'online', observedAt: '2026-08-29T15:20:00.000Z', evidenceClass: 'supervisor-heartbeat' },
    desktop: { state: 'healthy', observedAt: '2026-08-29T15:20:00.000Z', evidenceClass: 'process-probe' },
    mcp: { state: 'healthy', observedAt: '2026-08-29T15:20:00.000Z', evidenceClass: 'loopback-probe' },
    tunnel: { state: 'connected', observedAt: '2026-08-29T15:20:00.000Z', evidenceClass: 'tunnel-state-probe' },
  };
}

function parseInbound(value: unknown, expectedDeviceId: string): unknown {
  const parser = Reflect.get(contract, 'parseDeviceInboundMessageV1');
  if (typeof parser !== 'function') {
    throw new Error('DEVICE_INBOUND_PARSER_NOT_IMPLEMENTED');
  }
  return Reflect.apply(parser, undefined, [value, expectedDeviceId]);
}

describe('remote-control authenticated inbound device protocol v1', () => {
  it('accepts hello only for the authenticated device identity', () => {
    expect(parseInbound({
      type: 'hello',
      protocolVersion: 1,
      deviceId: 'device-1',
    }, 'device-1')).toEqual({
      type: 'hello',
      protocolVersion: 1,
      deviceId: 'device-1',
    });

    expect(() => parseInbound({
      type: 'hello',
      protocolVersion: 1,
      deviceId: 'device-2',
    }, 'device-1')).toThrow();
  });

  it('accepts heartbeat only for the authenticated device identity', () => {
    const heartbeat = {
      type: 'heartbeat',
      protocolVersion: 1,
      deviceId: 'device-1',
      health: health(),
    };

    expect(parseInbound(heartbeat, 'device-1')).toEqual(heartbeat);
    expect(() => parseInbound({ ...heartbeat, deviceId: 'device-2' }, 'device-1')).toThrow();
  });

  it('rejects server-only welcome messages from the device side', () => {
    expect(() => parseInbound({
      type: 'welcome',
      protocolVersion: 1,
      serverTime: '2026-08-29T15:20:00.000Z',
    }, 'device-1')).toThrow();
  });

  it('inherits strict malformed-message rejection from the presence parser', () => {
    expect(() => parseInbound({
      type: 'heartbeat',
      protocolVersion: 1,
      deviceId: 'device-1',
      health: health(),
      command: 'shell',
    }, 'device-1')).toThrow();
  });
});
