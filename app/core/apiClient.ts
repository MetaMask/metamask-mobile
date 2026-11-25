import { createApiPlatformClient } from '@metamask/core-backend';
import { getVersion } from 'react-native-device-info';
import { getBackendApiUrlsOption } from './coreBackendApiUrls';
import { getBackendBearerToken } from './backendBearerToken';

export const apiClient = createApiPlatformClient({
  clientProduct: 'metamask-mobile',
  clientVersion: getVersion(),
  getBearerToken: getBackendBearerToken,
  ...getBackendApiUrlsOption(),
});
