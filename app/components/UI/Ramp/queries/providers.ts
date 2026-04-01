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
      );

      return response.providers;
    },
    staleTime: 0, // always run queryFn so controller state stays in sync
  });
