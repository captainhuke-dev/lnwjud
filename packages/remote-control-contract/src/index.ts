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
