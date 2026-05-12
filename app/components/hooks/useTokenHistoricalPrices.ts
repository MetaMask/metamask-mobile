import {
  CaipAssetType,
  CaipChainId,
  Hex,
  isCaipChainId,
  parseCaipAssetType,
} from '@metamask/utils';
import { getDecimalChainId } from '../../util/networks';
import { useQuery } from '@tanstack/react-query';
import { TraceName, endTrace, trace } from '../../util/trace';

export type TimePeriod = '1d' | '1w' | '7d' | '1m' | '3m' | '1y' | '3y' | 'all';

export type TokenPrice = [string, number];

const placeholderPrices = Array(289).fill(['0', 0] as TokenPrice);

const PRICE_API_BASE_URL = 'https://price.api.cx.metamask.io/v3';

/**
 * Maps the chart's user-facing time period to the Price API `timePeriod`
 * query parameter format (e.g. `1D`, `7D`, `1M`, `1000Y`).
 *
 * See https://price.api.cx.metamask.io/docs#/Historical%20Prices/PriceController_getHistoricalPricesByCaipAssetId
 */
const toPriceApiTimePeriod = (timePeriod: TimePeriod): string => {
  switch (timePeriod) {
    case '1d':
      return '1D';
    case '1w':
    case '7d':
      return '7D';
    case '1m':
      return '1M';
    case '3m':
      return '3M';
    case '1y':
      return '1Y';
    case '3y':
      return '3Y';
    case 'all':
      return '1000Y';
    default:
      return '1D';
  }
};

/**
 * Resolves the CAIP-2 chain id and the `assetNamespace:assetReference` path
 * segment expected by the Price API v3 historical-prices endpoint.
 *
 * - Non-EVM tokens use a CAIP chain id (e.g. `solana:5eykt4Us…`) and either a full CAIP-19 asset id or a raw token reference as `address` (the bridge flow currently passes the latter).
 * - EVM tokens use a hex chain id and a hex token `address`, which we combine into `eip155:{decimal}` and `erc20:{address}`.
 */
const getPriceApiSegments = ({
  address,
  chainId,
}: {
  address: string;
  chainId: Hex | CaipChainId;
}): { caipChainId: string; assetSegment: string } | null => {
  if (isCaipChainId(chainId)) {
    // TODO: useTopTokens returns the address for non-EVM as a raw token
    // reference instead of a CAIP-19 asset id when coming from the bridge
    // flow. Once that is fixed upstream, drop the second branch.
    const caipAssetType: CaipAssetType = address.startsWith(`${chainId}`)
      ? (address as CaipAssetType)
      : (`${chainId}/token:${address}` as CaipAssetType);

    try {
      const {
        chainId: caipChainId,
        assetNamespace,
        assetReference,
      } = parseCaipAssetType(caipAssetType);
      return {
        caipChainId,
        assetSegment: `${assetNamespace}:${assetReference}`,
      };
    } catch {
      return null;
    }
  }

  if (!address) {
    return null;
  }

  return {
    caipChainId: `eip155:${getDecimalChainId(chainId)}`,
    assetSegment: `erc20:${address}`,
  };
};

/**
 * Fetches and transforms historical prices from the Price API v3 endpoint.
 * Returns an empty array for HTTP 204 (no content) responses.
 */
const fetchHistoricalPrices = async ({
  segments,
  timePeriod,
  vsCurrency,
  from,
  to,
}: {
  segments: { caipChainId: string; assetSegment: string };
  timePeriod: TimePeriod;
  vsCurrency: string;
  from?: number;
  to?: number;
}): Promise<TokenPrice[]> => {
  const uri = new URL(
    `${PRICE_API_BASE_URL}/historical-prices/${segments.caipChainId}/${segments.assetSegment}`,
  );
  uri.searchParams.set('timePeriod', toPriceApiTimePeriod(timePeriod));
  uri.searchParams.set('vsCurrency', vsCurrency);
  if (from && to) {
    uri.searchParams.set('from', from.toString());
    uri.searchParams.set('to', to.toString());
  }

  trace({
    name: TraceName.FetchHistoricalPrices,
    data: { uri: uri.toString() },
  });
  const response = await fetch(uri.toString());
  endTrace({ name: TraceName.FetchHistoricalPrices });

  if (response.status === 204) {
    return [];
  }

  const json: { prices?: [number, number][] } = await response.json();
  return (json.prices ?? []).map(
    ([timestamp, price]) => [timestamp.toString(), Number(price)] as TokenPrice,
  );
};

/**
 * Fetches historical prices for a given asset over a given duration using the
 * Price API v3 endpoint for both EVM and non-EVM chains.
 *
 * Previously this hook used `MultichainAssetsRatesController.fetchHistoricalPricesForAsset`
 * for the non-EVM branch and read `MultichainAssetsRatesController.historicalPrices`
 * from Redux. It now uses the same `/v3/historical-prices/{caipChainId}/{assetType}`
 * endpoint for both branches, removing the controller dependency.
 */
const useTokenHistoricalPrices = ({
  address,
  chainId,
  timePeriod,
  from,
  to,
  vsCurrency,
}: {
  address: string;
  chainId: Hex | CaipChainId;
  timePeriod: TimePeriod;
  from?: number | undefined;
  to?: number | undefined;
  vsCurrency: string;
}): {
  data: TokenPrice[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
} => {
  const segments = getPriceApiSegments({ address, chainId });

  const { data, isFetching, error } = useQuery({
    queryKey: [
      'tokenHistoricalPrices',
      address,
      chainId,
      timePeriod,
      from,
      to,
      vsCurrency,
    ],
    queryFn: () => {
      if (!segments) throw new Error('segments unavailable');
      return fetchHistoricalPrices({
        segments,
        timePeriod,
        vsCurrency,
        from,
        to,
      });
    },
    enabled: segments !== null,
    placeholderData: placeholderPrices,
    staleTime: 5 * 60 * 1000,
  });

  if (segments === null) {
    return { data: [], isLoading: false, error: undefined };
  }

  return {
    data,
    isLoading: isFetching,
    error: error as Error | undefined,
  };
};

export default useTokenHistoricalPrices;
