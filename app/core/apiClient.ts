import { createApiPlatformClient } from '@metamask/core-backend';
import { getVersion } from 'react-native-device-info';
import Engine from './Engine';

export const apiClient = createApiPlatformClient({
  clientProduct: 'metamask-mobile',
  clientVersion: getVersion(),
  getBearerToken: async () => {
    try {
      return await Engine.context.AuthenticationController.getBearerToken();
    } catch {
      return undefined;
    }
  },
});
