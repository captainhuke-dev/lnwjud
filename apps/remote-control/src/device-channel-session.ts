import type { RemoteControlDatabase } from './db.js';
import {
  DeviceChannelRegistry,
  recordAuthenticatedHeartbeat,
  type ClosableDeviceChannel,
} from './device-channel-state.js';
import type { AuthorizedDeviceUpgrade } from './device-upgrade-auth.js';

export interface AttachedDeviceChannelSession {
  readonly deviceId: string;
  readonly protocolVersion: 1;
  heartbeat(observedAt: Date): void;
  detach(): void;
}

export function attachAuthorizedDeviceChannel<T extends ClosableDeviceChannel>(
  db: RemoteControlDatabase,
  registry: DeviceChannelRegistry<T>,
  authorized: AuthorizedDeviceUpgrade,
  channel: T,
  connectedAt: Date,
): AttachedDeviceChannelSession {
  const { deviceId, protocolVersion } = authorized;
  registry.register(deviceId, channel);

  try {
    recordAuthenticatedHeartbeat(db, deviceId, connectedAt);
  } catch (error) {
    registry.unregister(deviceId, channel);
    channel.close();
    throw error;
  }

  return {
    deviceId,
    protocolVersion,
    heartbeat(observedAt: Date): void {
      if (registry.get(deviceId) !== channel) {
        throw new Error('Device channel is no longer current');
      }

      try {
        recordAuthenticatedHeartbeat(db, deviceId, observedAt);
      } catch (error) {
        registry.unregister(deviceId, channel);
        channel.close();
        throw error;
      }
    },
    detach(): void {
      registry.unregister(deviceId, channel);
    },
  };
}
