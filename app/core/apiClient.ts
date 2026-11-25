import { createApiPlatformClient } from '@metamask/core-backend';
import { getVersion } from 'react-native-device-info';
import {
  getBackendApiUrlsOption,
  isBackendAuthDisabled,
} from './coreBackendApiUrls';
import Engine from './Engine';

export const apiClient = createApiPlatformClient({
  clientProduct: 'metamask-mobile',
  clientVersion: getVersion(),
  getBearerToken: async () => {
    if (isBackendAuthDisabled()) {
      return undefined;
    }
    try {
      return await Engine.context.AuthenticationController.getBearerToken();
    } catch {
      return undefined;
    }
  },
  ...getBackendApiUrlsOption(),
});
