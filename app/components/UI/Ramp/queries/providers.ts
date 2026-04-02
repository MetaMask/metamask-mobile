import { queryOptions } from '@tanstack/react-query';
import type { Provider } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

interface ProvidersQueryParams {
  regionCode: string;
}

export const rampsProvidersKeys = {
  all: () => ['ramps', 'providers'] as const,
  detail: ({ regionCode }: ProvidersQueryParams) =>
    [...rampsProvidersKeys.all(), regionCode.trim().toLowerCase()] as const,
};

export const rampsProvidersOptions = (params: ProvidersQueryParams) =>
  queryOptions({
    queryKey: rampsProvidersKeys.detail(params),
    queryFn: async (): Promise<Provider[]> => {
      const response = await Engine.context.RampsController.getProviders(
        params.regionCode,
        { forceRefresh: true },
      );

      return response.providers;
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchOnMount: true,
  });
