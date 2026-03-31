import { queryOptions } from '@tanstack/react-query';
import type { QuotesResponse } from '@metamask/ramps-controller';
import type { GetQuotesOptions } from '../hooks/useRampsQuotes';
import Engine from '../../../../core/Engine';

type RampsQuotesQueryParams = Pick<
  GetQuotesOptions,
  | 'assetId'
  | 'amount'
  | 'walletAddress'
  | 'redirectUrl'
  | 'forceRefresh'
  | 'ttl'
  | 'paymentMethods'
  | 'providers'
>;

export const rampsQuotesKeys = {
  all: () => ['ramps', 'quotes'] as const,
  detail: (params: RampsQuotesQueryParams) =>
    [
      ...rampsQuotesKeys.all(),
      params.assetId ?? '',
      params.amount,
      params.walletAddress,
      (params.paymentMethods ?? []).join(','),
      (params.providers ?? []).join(','),
    ] as const,
};

export const rampsQuotesOptions = (params: RampsQuotesQueryParams) =>
  queryOptions({
    queryKey: rampsQuotesKeys.detail(params),
    queryFn: async (): Promise<QuotesResponse> =>
      Engine.context.RampsController.getQuotes({
        assetId: params.assetId,
        amount: params.amount,
        walletAddress: params.walletAddress,
        redirectUrl: params.redirectUrl,
        paymentMethods: params.paymentMethods,
        providers: params.providers,
        forceRefresh: params.forceRefresh,
        ttl: params.ttl,
      }),
    staleTime: 0,
  });
