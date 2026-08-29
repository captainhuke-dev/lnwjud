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

export function parseRemoteCommandV1(value: unknown): RemoteCommandV1 {
  if (!isRecord(value)) throw new Error('Remote command must be an object');
  for (const key of Object.keys(value)) {
    if (!REMOTE_COMMAND_KEYS.has(key)) throw new Error(`Unknown remote command field: ${key}`);
  }
  const action = value.action;
  if (typeof action !== 'string' || !isRemoteAction(action)) {
    throw new Error('Remote command action is not allowed');
  }
  return {
    protocolVersion: value.protocolVersion as 1,
    commandId: value.commandId as string,
    deviceId: value.deviceId as string,
    action,
    actorId: value.actorId as string,
    deliverySequence: value.deliverySequence as number,
    createdAt: value.createdAt as string,
    expiresAt: value.expiresAt as string,
    parameters: value.parameters as Readonly<Record<string, unknown>>,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRemoteAction(value: string): value is RemoteAction {
  return (REMOTE_ACTIONS as readonly string[]).includes(value);
}
