import { createApiPlatformClient } from '@metamask/core-backend';
import Engine from './Engine';
import ReactQueryService from './ReactQueryService/ReactQueryService';

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
      queryClient: ReactQueryService.queryClient,
    });
  }

  return apiClient;
};
