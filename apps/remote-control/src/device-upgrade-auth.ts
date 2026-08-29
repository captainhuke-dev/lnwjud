import { verifyDeviceToken } from './auth/device-auth.js';
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
  if (request.url === undefined) throw new Error('Device upgrade URL is required');
  const url = new URL(request.url, 'https://remote-control.invalid');
  if (url.pathname !== '/device/ws' || url.hash !== '') {
    throw new Error('Device upgrade URL is not allowed');
  }

  const parameters = url.searchParams;
  if (
    parameters.size !== 2
    || parameters.getAll('deviceId').length !== 1
    || parameters.getAll('protocolVersion').length !== 1
  ) {
    throw new Error('Device upgrade query is not allowed');
  }

  const deviceId = parameters.get('deviceId');
  if (deviceId === null || deviceId.trim().length === 0) {
    throw new Error('Device upgrade device id is required');
  }
  if (parameters.get('protocolVersion') !== '1') {
    throw new Error('Device upgrade protocol version is not supported');
  }

  const authorization = request.authorization;
  const bearer = authorization?.match(/^Bearer ([^\s]+)$/);
  if (!bearer) throw new Error('Device upgrade authorization is invalid');

  const token = bearer[1];
  if (token === undefined || !verifyDeviceToken(db, deviceId, token)) {
    throw new Error('Device upgrade authorization is invalid');
  }

  return { deviceId, protocolVersion: 1 };
}
