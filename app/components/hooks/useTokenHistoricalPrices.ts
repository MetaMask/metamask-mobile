import { Hex, parseCaipAssetType } from '@metamask/utils';
import { getAssetId } from '@metamask/assets-controllers';
import { getDecimalChainId } from '../../util/networks';
import { useState, useEffect } from 'react';
import { TraceName, endTrace, trace } from '../../util/trace';
import { TokenI } from '../UI/Tokens/types';
import { formatChainIdToCaip } from '@metamask/bridge-controller';

export type TimePeriod = '1d' | '1w' | '7d' | '1m' | '3m' | '1y' | '3y' | 'all';

export type TokenPrice = [string, number];

const placeholderPrices = Array(289).fill(['0', 0] as TokenPrice);

const HOURS = 3_600_000;
const DAYS = 24 * HOURS;

/**
 * Expected durations (in ms) for each time period.
 * `null` means no coverage check (e.g. "all" has no fixed expected span).
 */
const EXPECTED_DURATION_MS: Record<TimePeriod, number | null> = {
  '1d': 1 * DAYS,
  '1w': 7 * DAYS,
  '7d': 7 * DAYS,
  '1m': 30 * DAYS,
  '3m': 90 * DAYS,
  '1y': 365 * DAYS,
  '3y': 3 * 365 * DAYS,
  all: null,
};

/**
 * Minimum fraction of the requested time period that the returned data must
 * cover. Below this threshold we show the "no data" overlay instead of
 * rendering a misleading chart. 0.20 = data must span at least 20% of the
 * expected duration (e.g. ~5 h for a 1D request).
 */
const MIN_COVERAGE_RATIO = 0.2;

/**
 * Returns true when the historical-prices data covers less than
 * {@link MIN_COVERAGE_RATIO} of the requested time period.
 */
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
} => {
  const resultChainId = formatChainIdToCaip(asset.chainId as Hex);
  const isNonEvmAsset = resultChainId === asset.chainId;
  const [prices, setPrices] = useState<TokenPrice[]>(placeholderPrices);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [insufficientCoverage, setInsufficientCoverage] = useState(false);

  useEffect(() => {
    const fetchPrices = async () => {
      setIsLoading(true);
      setInsufficientCoverage(false);

      try {
        const baseUri = 'https://price.api.cx.metamask.io/v3';

        let caipChainId: string;
        let assetIdentifier: string;

        if (isNonEvmAsset) {
          caipChainId = asset.chainId as string;
          assetIdentifier = asset.address.split('/')[1];
        } else {
          // Trying to use same getAssetId logic as for spot-prices
          const caipAssetType = getAssetId({
            chainId,
            tokenAddress: asset.address,
          });
          if (caipAssetType) {
            const parsedCaipAsset = parseCaipAssetType(caipAssetType);
            caipChainId = parsedCaipAsset.chainId;
            assetIdentifier = `${parsedCaipAsset.assetNamespace}:${parsedCaipAsset.assetReference}`;
          } else {
            // Fallback into legacy way of building URL params
            caipChainId = `eip155:${getDecimalChainId(chainId)}`;
            assetIdentifier = `erc20:${address}`;
          }
        }

        const uri = new URL(
          `${baseUri}/historical-prices/${caipChainId}/${assetIdentifier}`,
        );
        uri.searchParams.set(
          'timePeriod',
          timePeriod === '1w' ? '7d' : timePeriod,
        );
        uri.searchParams.set('vsCurrency', vsCurrency);
        if (from && to) {
          uri.searchParams.set('from', from.toString());
          uri.searchParams.set('to', to.toString());
        }

        trace({
          name: TraceName.FetchHistoricalPrices,
          data: { uri: uri.toString() },
        });

        // Add 3 second timeout to prevent infinite hang
        const FETCH_TIMEOUT_MS = 3000;
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Historical prices fetch timeout')),
            FETCH_TIMEOUT_MS,
          );
        });

        const response = await Promise.race([
          fetch(uri.toString()),
          timeoutPromise,
        ]);

        endTrace({ name: TraceName.FetchHistoricalPrices });
        if (response.status === 204) {
          setPrices([]);
          setInsufficientCoverage(true);
          return;
        }
        const data: { prices: TokenPrice[] } = await response.json();
        const sortedPrices = [...data.prices].sort(
          (a, b) => Number(a[0]) - Number(b[0]),
        );
        setPrices(sortedPrices as TokenPrice[]);
        setInsufficientCoverage(
          hasInsufficientTimeCoverage(sortedPrices, timePeriod),
        );
      } catch (e: unknown) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrices();
  }, [
    address,
    chainId,
    timePeriod,
    from,
    to,
    vsCurrency,
    isNonEvmAsset,
    asset.address,
    asset.chainId,
  ]);

  return {
    data: prices,
    isLoading,
    error,
    hasInsufficientCoverage: insufficientCoverage,
  };
};

export default useTokenHistoricalPrices;
