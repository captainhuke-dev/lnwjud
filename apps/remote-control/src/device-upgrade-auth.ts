import type { RemoteControlDatabase } from './db.js';

export interface DeviceUpgradeRequest {
  readonly url: string | undefined;
  readonly authorization: string | undefined;
}

export interface AuthorizedDeviceUpgrade {
  readonly deviceId: string;
  readonly protocolVersion: 1;
}

export function authorizeDeviceUpgrade(
  db: RemoteControlDatabase,
  request: DeviceUpgradeRequest,
): AuthorizedDeviceUpgrade {
  void db;
  void request;
  throw new Error('REMOTE_CONTROL_DEVICE_UPGRADE_AUTH_NOT_IMPLEMENTED');
}
