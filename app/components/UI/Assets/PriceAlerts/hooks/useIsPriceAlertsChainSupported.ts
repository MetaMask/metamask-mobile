import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import { fetchSupportedChains } from '../api';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// Backoff between retries: 5s → 30s → 1m (3 retries, then give up).
const SUPPORTED_CHAINS_MAX_RETRIES = 3;
const SUPPORTED_CHAINS_RETRY_DELAYS_MS = [5_000, 30_000, 60_000] as const;

export const PRICE_ALERTS_SUPPORTED_CHAINS_QUERY_KEY = [
  'priceAlerts',
  'supportedChains',
] as const;

async function fetchSupportedChainsData(): Promise<string[]> {
  const response = await fetchSupportedChains();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const body = (await response.json()) as string[];
  return body;
}

/**
 * Returns whether the chain of the given CAIP-19 asset id is supported for price alerts.
 * Supported chains are fetched once and cached for 24 hours.
 */
export function useIsPriceAlertsChainSupported(
  assetId: string | null | undefined,
  options?: { enabled?: boolean },
): boolean {
  const { data: supportedChains } = useQuery({
    queryKey: PRICE_ALERTS_SUPPORTED_CHAINS_QUERY_KEY,
    queryFn: fetchSupportedChainsData,
    staleTime: TWENTY_FOUR_HOURS_MS,
    gcTime: TWENTY_FOUR_HOURS_MS,
    retry: SUPPORTED_CHAINS_MAX_RETRIES,
    retryDelay: (attempt) => SUPPORTED_CHAINS_RETRY_DELAYS_MS[attempt],
    enabled: options?.enabled,
  });

  return useMemo(() => {
    if (!assetId || !supportedChains || !isCaipAssetType(assetId)) {
      return false;
    }

    const { chainId } = parseCaipAssetType(assetId);
    return supportedChains.includes(chainId);
  }, [assetId, supportedChains]);
}
