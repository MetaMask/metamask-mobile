import { queryOptions, useQuery } from '@tanstack/react-query';
import { getAssetId } from '@metamask/assets-controllers';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { parseCaipAssetType, type Hex } from '@metamask/utils';
import type { TokenI } from '../UI/Tokens/types';
import { getDecimalChainId } from '../../util/networks';
import { TraceName, endTrace, trace } from '../../util/trace';

export type TimePeriod =
  | '1h'
  | '1d'
  | '1w'
  | '7d'
  | '1m'
  | '3m'
  | '1y'
  | '3y'
  | 'all';

export type TokenPrice = [string, number];

export const DEFAULT_HISTORICAL_TIME_PERIOD: TimePeriod = '1d';

const HISTORICAL_PRICES_FETCH_TIMEOUT_MS = 3000;
const QUERY_STALE_TIME_MS = 30_000;

const HISTORICAL_PRICE_PLACEHOLDER: TokenPrice[] = Array(289).fill([
  '0',
  0,
] as TokenPrice);

const HOURS = 3_600_000;
const DAYS = 24 * HOURS;

const EXPECTED_DURATION_MS: Record<TimePeriod, number | null> = {
  '1h': 1 * HOURS,
  '1d': 1 * DAYS,
  '1w': 7 * DAYS,
  '7d': 7 * DAYS,
  '1m': 30 * DAYS,
  '3m': 90 * DAYS,
  '1y': 365 * DAYS,
  '3y': 3 * 365 * DAYS,
  all: null,
};

const MIN_COVERAGE_RATIO = 0.2;

export function hasInsufficientTimeCoverage(
  prices: TokenPrice[],
  timePeriod: TimePeriod,
): boolean {
  const expectedMs = EXPECTED_DURATION_MS[timePeriod];
  if (expectedMs === null || prices.length < 2) return false;

  const firstTs = Number(prices[0][0]);
  const lastTs = Number(prices[prices.length - 1][0]);
  const actualSpanMs = Math.abs(lastTs - firstTs);

  return actualSpanMs < expectedMs * MIN_COVERAGE_RATIO;
}

export interface HistoricalPricesRequest {
  assetChainId: string;
  assetAddress: string;
  address: string;
  chainId: Hex;
  timePeriod: TimePeriod;
  vsCurrency: string;
  from?: number;
  to?: number;
}

interface HistoricalPricesResult {
  prices: TokenPrice[];
  hasInsufficientCoverage: boolean;
  apiDurationMs: number;
  error?: Error;
}

const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error != null &&
  'name' in error &&
  (error as { name: string }).name === 'AbortError';

const buildHistoricalPricesUrl = (request: HistoricalPricesRequest): string => {
  const isNonEvmAsset =
    formatChainIdToCaip(request.assetChainId as Hex) === request.assetChainId;

  let caipChainId: string;
  let assetIdentifier: string;

  if (isNonEvmAsset) {
    caipChainId = request.assetChainId;
    assetIdentifier = request.assetAddress.split('/')[1];
  } else {
    const caipAssetType = getAssetId({
      chainId: request.chainId,
      tokenAddress: request.assetAddress,
    });
    if (caipAssetType) {
      const parsedCaipAsset = parseCaipAssetType(caipAssetType);
      caipChainId = parsedCaipAsset.chainId;
      assetIdentifier = `${parsedCaipAsset.assetNamespace}:${parsedCaipAsset.assetReference}`;
    } else {
      caipChainId = `eip155:${getDecimalChainId(request.chainId)}`;
      assetIdentifier = `erc20:${request.address}`;
    }
  }

  const uri = new URL(
    `https://price.api.cx.metamask.io/v3/historical-prices/${caipChainId}/${assetIdentifier}`,
  );
  uri.searchParams.set(
    'timePeriod',
    request.timePeriod === '1w' ? '7d' : request.timePeriod,
  );
  uri.searchParams.set('vsCurrency', request.vsCurrency);
  if (request.from && request.to) {
    uri.searchParams.set('from', request.from.toString());
    uri.searchParams.set('to', request.to.toString());
  }
  return uri.toString();
};

const fetchHistoricalPrices = async (
  request: HistoricalPricesRequest,
  signal?: AbortSignal,
): Promise<HistoricalPricesResult> => {
  const fetchStart = Date.now();
  const url = buildHistoricalPricesUrl(request);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    trace({
      name: TraceName.FetchHistoricalPrices,
      data: { uri: url },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Historical prices fetch timeout')),
        HISTORICAL_PRICES_FETCH_TIMEOUT_MS,
      );
    });

    const response = await Promise.race([
      fetch(url, { signal }),
      timeoutPromise,
    ]);

    endTrace({ name: TraceName.FetchHistoricalPrices });

    if (response.status === 204) {
      return {
        prices: [],
        hasInsufficientCoverage: true,
        apiDurationMs: Date.now() - fetchStart,
      };
    }

    const data: { prices: TokenPrice[] } = await response.json();
    const sortedPrices = [...data.prices].sort(
      (a, b) => Number(a[0]) - Number(b[0]),
    );
    return {
      prices: sortedPrices,
      hasInsufficientCoverage: hasInsufficientTimeCoverage(
        sortedPrices,
        request.timePeriod,
      ),
      apiDurationMs: Date.now() - fetchStart,
    };
  } catch (error: unknown) {
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }
    return {
      prices: HISTORICAL_PRICE_PLACEHOLDER,
      hasInsufficientCoverage: false,
      apiDurationMs: Date.now() - fetchStart,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

export const historicalPricesQueryOptions = (
  request: HistoricalPricesRequest,
) =>
  queryOptions({
    queryKey: [
      'token-details',
      'historical-prices',
      request.chainId,
      request.address,
      request.assetChainId,
      request.assetAddress,
      request.timePeriod,
      request.vsCurrency,
      request.from ?? null,
      request.to ?? null,
    ],
    queryFn: ({ signal }) => fetchHistoricalPrices(request, signal),
    retry: false,
    staleTime: QUERY_STALE_TIME_MS,
  });

const toHistoricalPricesRequest = ({
  asset,
  address,
  chainId,
  timePeriod,
  from,
  to,
  vsCurrency,
}: {
  asset: Pick<TokenI, 'address' | 'chainId'>;
  address: string;
  chainId: Hex;
  timePeriod: TimePeriod;
  from?: number;
  to?: number;
  vsCurrency: string;
}): HistoricalPricesRequest => ({
  assetChainId: String(asset.chainId ?? ''),
  assetAddress: asset.address,
  address,
  chainId,
  timePeriod,
  vsCurrency,
  from,
  to,
});

const useTokenHistoricalPrices = ({
  asset,
  address,
  chainId,
  timePeriod,
  from,
  to,
  vsCurrency,
}: {
  asset: TokenI;
  address: string;
  chainId: Hex;
  timePeriod: TimePeriod;
  from?: number | undefined;
  to?: number | undefined;
  vsCurrency: string;
}): {
  data: TokenPrice[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  hasInsufficientCoverage: boolean;
  apiDurationMs: number | undefined;
} => {
  const query = useQuery(
    historicalPricesQueryOptions(
      toHistoricalPricesRequest({
        asset,
        address,
        chainId,
        timePeriod,
        vsCurrency,
        from,
        to,
      }),
    ),
  );

  const payload = query.data;

  return {
    data: payload?.prices ?? HISTORICAL_PRICE_PLACEHOLDER,
    isLoading: query.isPending,
    error: payload?.error,
    hasInsufficientCoverage: payload?.hasInsufficientCoverage ?? false,
    apiDurationMs: payload?.apiDurationMs,
  };
};

export default useTokenHistoricalPrices;
