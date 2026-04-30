import { createApiPlatformClient } from '@metamask/core-backend';
import Engine from './Engine';

let apiClient: ReturnType<typeof createApiPlatformClient> | undefined;

export const getApiClient = () => {
  if (!apiClient) {
    apiClient = createApiPlatformClient({
      clientProduct: 'metamask-mobile',
      getBearerToken: async () => {
        try {
          return await Engine.context.AuthenticationController.getBearerToken();
        } catch {
          return undefined;
        }
      },
    });
  }

  return apiClient;
};
