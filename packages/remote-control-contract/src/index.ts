export const REMOTE_CONTROL_PROTOCOL_VERSION = 1 as const;

export const REMOTE_ACTIONS = [
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
] as const;

export type RemoteAction = (typeof REMOTE_ACTIONS)[number];

export interface RemoteCommandV1 {
  readonly protocolVersion: 1;
  readonly commandId: string;
  readonly deviceId: string;
  readonly action: RemoteAction;
  readonly actorId: string;
  readonly deliverySequence: number;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export type MachineHealthState = 'reachable' | 'unreachable' | 'unknown';
export type SupervisorHealthState = 'online' | 'offline' | 'unknown';
export type LocalHealthState = 'healthy' | 'unhealthy' | 'stopped' | 'unknown';
export type TunnelHealthState = 'connected' | 'disconnected' | 'stopped' | 'unknown';

export interface HealthSampleV1<State extends string> {
  readonly state: State;
  readonly observedAt: string;
  readonly evidenceClass: string;
}

export interface HealthSnapshotV1 {
  readonly machine: HealthSampleV1<MachineHealthState>;
  readonly supervisor: HealthSampleV1<SupervisorHealthState>;
  readonly desktop: HealthSampleV1<LocalHealthState>;
  readonly mcp: HealthSampleV1<LocalHealthState>;
  readonly tunnel: HealthSampleV1<TunnelHealthState>;
}

export interface DeviceHelloV1 {
  readonly type: 'hello';
  readonly protocolVersion: 1;
  readonly deviceId: string;
}

export interface DeviceWelcomeV1 {
  readonly type: 'welcome';
  readonly protocolVersion: 1;
  readonly serverTime: string;
}

export interface DeviceHeartbeatV1 {
  readonly type: 'heartbeat';
  readonly protocolVersion: 1;
  readonly deviceId: string;
  readonly health: HealthSnapshotV1;
}

export type DevicePresenceMessageV1 = DeviceHelloV1 | DeviceWelcomeV1 | DeviceHeartbeatV1;
export type DeviceInboundMessageV1 = DeviceHelloV1 | DeviceHeartbeatV1;

const REMOTE_COMMAND_KEYS = new Set([
  'protocolVersion',
  'commandId',
  'deviceId',
  'action',
  'actorId',
  'deliverySequence',
  'createdAt',
  'expiresAt',
  'parameters',
]);

const HELLO_KEYS = new Set(['type', 'protocolVersion', 'deviceId']);
const WELCOME_KEYS = new Set(['type', 'protocolVersion', 'serverTime']);
const HEARTBEAT_KEYS = new Set(['type', 'protocolVersion', 'deviceId', 'health']);
const HEALTH_KEYS = new Set(['machine', 'supervisor', 'desktop', 'mcp', 'tunnel']);
const HEALTH_SAMPLE_KEYS = new Set(['state', 'observedAt', 'evidenceClass']);

const MACHINE_HEALTH_STATES = new Set<MachineHealthState>(['reachable', 'unreachable', 'unknown']);
const SUPERVISOR_HEALTH_STATES = new Set<SupervisorHealthState>(['online', 'offline', 'unknown']);
const LOCAL_HEALTH_STATES = new Set<LocalHealthState>(['healthy', 'unhealthy', 'stopped', 'unknown']);
const TUNNEL_HEALTH_STATES = new Set<TunnelHealthState>(['connected', 'disconnected', 'stopped', 'unknown']);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseRemoteCommandV1(value: unknown): RemoteCommandV1 {
  if (!isRecord(value)) throw new Error('Remote command must be an object');
  for (const key of Object.keys(value)) {
    if (!REMOTE_COMMAND_KEYS.has(key)) throw new Error(`Unknown remote command field: ${key}`);
  }

  if (value.protocolVersion !== REMOTE_CONTROL_PROTOCOL_VERSION) {
    throw new Error('Remote command protocol version is not supported');
  }
  if (typeof value.commandId !== 'string' || !UUID_PATTERN.test(value.commandId)) {
    throw new Error('Remote command id must be a UUID');
  }
  if (!isNonEmptyString(value.deviceId)) {
    throw new Error('Remote command device id must be non-empty');
  }
  if (!isNonEmptyString(value.actorId)) {
    throw new Error('Remote command actor id must be non-empty');
  }
  if (typeof value.deliverySequence !== 'number' || !Number.isInteger(value.deliverySequence) || value.deliverySequence < 1) {
    throw new Error('Remote command delivery sequence must be a positive integer');
  }

  const action = value.action;
  if (typeof action !== 'string' || !isRemoteAction(action)) {
    throw new Error('Remote command action is not allowed');
  }

  const createdAt = requireTimestamp(value.createdAt, 'createdAt');
  const expiresAt = requireTimestamp(value.expiresAt, 'expiresAt');
  if (Date.parse(expiresAt) <= Date.parse(createdAt)) {
    throw new Error('Remote command expiry must be after creation');
  }

  if (!isRecord(value.parameters)) {
    throw new Error('Remote command parameters must be an object');
  }
  validateParameters(action, value.parameters);

  return {
    protocolVersion: REMOTE_CONTROL_PROTOCOL_VERSION,
    commandId: value.commandId,
    deviceId: value.deviceId,
    action,
    actorId: value.actorId,
    deliverySequence: value.deliverySequence,
    createdAt,
    expiresAt,
    parameters: value.parameters,
  };
}

export function parseDevicePresenceMessageV1(value: unknown): DevicePresenceMessageV1 {
  if (!isRecord(value)) throw new Error('Device presence message must be an object');
  if (value.protocolVersion !== REMOTE_CONTROL_PROTOCOL_VERSION) {
    throw new Error('Device presence protocol version is not supported');
  }

  if (value.type === 'hello') {
    requireExactKeys(value, HELLO_KEYS, 'device hello');
    if (!isNonEmptyString(value.deviceId)) throw new Error('Device hello id must be non-empty');
    return {
      type: 'hello',
      protocolVersion: REMOTE_CONTROL_PROTOCOL_VERSION,
      deviceId: value.deviceId,
    };
  }

  if (value.type === 'welcome') {
    requireExactKeys(value, WELCOME_KEYS, 'device welcome');
    return {
      type: 'welcome',
      protocolVersion: REMOTE_CONTROL_PROTOCOL_VERSION,
      serverTime: requirePresenceTimestamp(value.serverTime, 'serverTime'),
    };
  }

  if (value.type === 'heartbeat') {
    requireExactKeys(value, HEARTBEAT_KEYS, 'device heartbeat');
    if (!isNonEmptyString(value.deviceId)) throw new Error('Device heartbeat id must be non-empty');
    return {
      type: 'heartbeat',
      protocolVersion: REMOTE_CONTROL_PROTOCOL_VERSION,
      deviceId: value.deviceId,
      health: parseHealthSnapshotV1(value.health),
    };
  }

  throw new Error('Device presence message type is not supported');
}

export function parseDeviceInboundMessageV1(value: unknown, expectedDeviceId: string): DeviceInboundMessageV1 {
  const parsed = parseDevicePresenceMessageV1(value);
  if (parsed.type === 'welcome') {
    throw new Error('Device welcome message is server-only');
  }
  if (parsed.deviceId !== expectedDeviceId) {
    throw new Error('Device message identity does not match the authenticated device');
  }
  return parsed;
}

function parseHealthSnapshotV1(value: unknown): HealthSnapshotV1 {
  if (!isRecord(value)) throw new Error('Health snapshot must be an object');
  requireExactKeys(value, HEALTH_KEYS, 'health snapshot');
  return {
    machine: parseHealthSample(value.machine, MACHINE_HEALTH_STATES, 'machine'),
    supervisor: parseHealthSample(value.supervisor, SUPERVISOR_HEALTH_STATES, 'supervisor'),
    desktop: parseHealthSample(value.desktop, LOCAL_HEALTH_STATES, 'desktop'),
    mcp: parseHealthSample(value.mcp, LOCAL_HEALTH_STATES, 'mcp'),
    tunnel: parseHealthSample(value.tunnel, TUNNEL_HEALTH_STATES, 'tunnel'),
  };
}

function parseHealthSample<State extends string>(
  value: unknown,
  allowedStates: ReadonlySet<State>,
  component: string,
): HealthSampleV1<State> {
  if (!isRecord(value)) throw new Error(`Health sample ${component} must be an object`);
  requireExactKeys(value, HEALTH_SAMPLE_KEYS, `health sample ${component}`);
  if (typeof value.state !== 'string' || !allowedStates.has(value.state as State)) {
    throw new Error(`Health sample ${component} state is not supported`);
  }
  if (!isNonEmptyString(value.evidenceClass)) {
    throw new Error(`Health sample ${component} evidence class must be non-empty`);
  }
  return {
    state: value.state as State,
    observedAt: requirePresenceTimestamp(value.observedAt, `${component}.observedAt`),
    evidenceClass: value.evidenceClass,
  };
}

function requireExactKeys(value: Readonly<Record<string, unknown>>, allowedKeys: ReadonlySet<string>, label: string): void {
  const keys = Object.keys(value);
  if (keys.length !== allowedKeys.size || keys.some((key) => !allowedKeys.has(key))) {
    throw new Error(`${label} contains unknown or missing fields`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRemoteAction(value: string): value is RemoteAction {
  return (REMOTE_ACTIONS as readonly string[]).includes(value);
}

function requireTimestamp(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new Error(`Remote command ${field} must be a timestamp`);
  if (!Number.isFinite(Date.parse(value))) throw new Error(`Remote command ${field} must be a timestamp`);
  return value;
}

function requirePresenceTimestamp(value: unknown, field: string): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Device presence ${field} must be a timestamp`);
  }
  return value;
}

function validateParameters(action: RemoteAction, parameters: Readonly<Record<string, unknown>>): void {
  const keys = Object.keys(parameters);
  if (action !== 'logs.recovery.read') {
    if (keys.length !== 0) throw new Error(`Remote command ${action} does not accept parameters`);
    return;
  }

  if (keys.length !== 1 || keys[0] !== 'limit') {
    throw new Error('Recovery log command accepts only the limit parameter');
  }
  const limit = parameters.limit;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new Error('Recovery log limit must be an integer from 1 through 200');
  }
}
