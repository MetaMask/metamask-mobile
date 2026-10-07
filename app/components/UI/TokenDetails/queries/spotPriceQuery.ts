import type { MarketDataDetails } from '@metamask/assets-controllers';
import type { CaipChainId, Hex } from '@metamask/utils';
import { queryOptions } from '@tanstack/react-query';
import { getTokenExchangeRate } from '../../Bridge/utils/exchange-rates';

const QUERY_STALE_TIME_MS = 30_000;

export interface SpotPriceQueryRequest {
  chainId: Hex | CaipChainId;
  tokenAddress: string;
  currency: string;
}

export interface SpotPriceQueryResult {
  marketData: MarketDataDetails;
  apiDurationMs: number;
}

const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error != null &&
  'name' in error &&
  (error as { name: string }).name === 'AbortError';

const emptyMarketData = {} as MarketDataDetails;

export const fetchSpotPrice = async (
  request: SpotPriceQueryRequest,
  signal?: AbortSignal,
): Promise<SpotPriceQueryResult> => {
  const fetchStart = Date.now();
  try {
    if (signal?.aborted) {
      throw new DOMException('The user aborted a request.', 'AbortError');
    }
    const data = (await getTokenExchangeRate({
      chainId: request.chainId,
      tokenAddress: request.tokenAddress,
      currency: request.currency,
      includeMarketData: true,
    })) as MarketDataDetails | undefined;

    return {
      marketData: data?.price ? data : emptyMarketData,
      apiDurationMs: Date.now() - fetchStart,
    };
  } catch (error: unknown) {
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }
    return {
      marketData: emptyMarketData,
      apiDurationMs: Date.now() - fetchStart,
    };
  }
};

export const spotPriceQueryOptions = (request: SpotPriceQueryRequest) =>
  queryOptions({
    queryKey: [
      'token-details',
      'spot-price',
      request.chainId,
      request.tokenAddress,
      request.currency,
    ],
    queryFn: ({ signal }) => fetchSpotPrice(request, signal),
    retry: false,
    staleTime: QUERY_STALE_TIME_MS,
  });
