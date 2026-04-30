import { createApiPlatformClient } from '@metamask/core-backend';
import Engine from './Engine';

export const apiClient = createApiPlatformClient({
  clientProduct: 'metamask-mobile',
  getBearerToken: async () => {
    try {
      return await Engine.context.AuthenticationController.getBearerToken();
    } catch {
      return undefined;
    }
  },
});
