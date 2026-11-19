import { queryOptions } from '@tanstack/react-query';
import type { Provider } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

interface ProvidersQueryParams {
  regionCode: string;
}

interface ProvidersResponse {
  providers: Provider[];
  sorted?: { sortBy: string; ids: string[] }[];
}

export const rampsProvidersKeys = {
  all: () => ['ramps', 'providers'] as const,
  detail: ({ regionCode }: ProvidersQueryParams) =>
    [...rampsProvidersKeys.all(), regionCode.trim().toLowerCase()] as const,
};

export const rampsProvidersOptions = (params: ProvidersQueryParams) =>
  queryOptions({
    queryKey: rampsProvidersKeys.detail(params),
    queryFn: async (): Promise<ProvidersResponse> => {
      const response = (await Engine.context.RampsController.getProviders(
        params.regionCode,
      )) as ProvidersResponse;

      // MiCA mock mode: inject transak-native for EU regions when excluded
      // by onramp-api (dev-only, off by default)
      if (__DEV__) {
        const {
          injectMockNativeProviderIfNeeded,
        } = require('../utils/micaMockMode');
        response.providers = injectMockNativeProviderIfNeeded(
          response.providers,
          params.regionCode,
        );
      }

      return response;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
