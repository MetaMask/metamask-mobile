import { getVersion } from 'react-native-device-info';
import type { ClientConfig } from '@metamask/snaps-controllers';
import { SemVerVersion } from '@metamask/utils';

/**
 * Get the client config (type and version) for the client.
 *
 * @returns The client config.
 */
export function getClientConfig(): ClientConfig {
  return {
    type: 'mobile',
    version: getVersion() as SemVerVersion,
  };
}
