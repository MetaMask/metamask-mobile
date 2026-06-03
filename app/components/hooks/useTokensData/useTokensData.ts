// TODO: Once all usages of tokensChainsCache are removed from this repo, this
// fetching logic should be moved to the core package (e.g. TokenListController
// or a dedicated tokens API service), and this hook should be updated to read
// from Redux state rather than calling the API directly.
import { useState, useEffect } from 'react';
import { handleFetch } from '@metamask/controller-utils';
import type { TokenRwaData } from '@metamask/assets-controllers';

export interface TokenAsset {
  assetId: string;
  decimals?: number;
  iconUrl: string;
  name: string;
  symbol: string;
  rwaData?: TokenRwaData;
}

export interface FetchTokensOptions {
  includeRwaData?: boolean;
}

const TOKEN_API_V3_BASE_URL = 'https://tokens.api.cx.metamask.io/v3';

// Maximum number of asset IDs per API request. Requests with more IDs are
// split into parallel batches of this size.
export const MAX_BATCH_SIZE = 25;

// Module-level cache and in-flight deduplication so multiple hook instances
// share a single HTTP request for the same batch of asset IDs.
// Per-asset cache keys include a suffix for each option flag so that results
// fetched without a flag (e.g. without rwaData) don't satisfy requests that
// need it.
const tokenCache: Record<string, TokenAsset> = {};
const inFlight = new Map<string, Promise<TokenAsset[]>>();

function optionsSuffix(options: FetchTokensOptions): string {
  return options.includeRwaData ? '|rwa' : '';
}

function fetchTokenBatch(
  assetIds: string[],
  options: FetchTokensOptions = {},
): Promise<TokenAsset[]> {
  const suffix = optionsSuffix(options);
  const inFlightKey = assetIds.join(',') + suffix;

  const existing = inFlight.get(inFlightKey);
  if (existing) {
    return existing;
  }

  if (assetIds.every((id) => tokenCache[id + suffix])) {
    return Promise.resolve(assetIds.map((id) => tokenCache[id + suffix]));
  }

  const params = new URLSearchParams({
    assetIds: assetIds.join(','),
    includeIconUrl: 'true',
  });

  if (options.includeRwaData) {
    params.set('includeRwaData', 'true');
  }

  const promise = (async () => {
    try {
      const data: TokenAsset[] = await handleFetch(
        `${TOKEN_API_V3_BASE_URL}/assets?${params}`,
      );
      // Normalize keys to lowercase so they match the locally-constructed
      // asset IDs (addresses are lowercased before building the CAIP-19 ID).
      // The API may return EIP-55 checksummed addresses (e.g. 0xABc…) which
      // would otherwise cause every cache lookup and state lookup to miss.
      data.forEach((t) => {
        tokenCache[t.assetId.toLowerCase() + suffix] = t;
      });
      return data;
    } finally {
      inFlight.delete(inFlightKey);
    }
  })();

  inFlight.set(inFlightKey, promise);
  return promise;
}

async function fetchTokenAssets(
  assetIds: string[],
  options: FetchTokensOptions = {},
): Promise<TokenAsset[]> {
  const batches: string[][] = [];
  for (let i = 0; i < assetIds.length; i += MAX_BATCH_SIZE) {
    batches.push(assetIds.slice(i, i + MAX_BATCH_SIZE));
  }
  const results = await Promise.all(
    batches.map((batch) => fetchTokenBatch(batch, options)),
  );
  return results.flat();
}

/**
 * Returns whether an asset ID has been fetched and confirmed with the
 * `includeRwaData` option. Reads from the module-level cache — not reactive
 * on its own, but safe to call during renders triggered by useTokensData
 * state updates.
 *
 * If this returns true and the corresponding TokenAsset has no rwaData,
 * the token is confirmed to be a non-RWA asset.
 */
export function isRwaChecked(assetId: string): boolean {
  return assetId + '|rwa' in tokenCache;
}

/**
 * Returns the cached `rwaData` for an asset that has been fetched with the
 * `includeRwaData` option, or `undefined` if it has not been checked or is a
 * confirmed non-RWA. Reads from the module-level cache, which persists across
 * component mounts — unlike the per-instance state returned by
 * {@link useTokensData}. This is the source of truth callers should use to
 * resolve RWA status, so that confirmed assets excluded from re-fetch (see
 * {@link isRwaChecked}) still resolve correctly on remount.
 */
export function getCheckedRwaData(assetId: string): TokenRwaData | undefined {
  return tokenCache[assetId + '|rwa']?.rwaData;
}

export interface UseTokensDataResult {
  tokens: Record<string, TokenAsset>;
  isLoading: boolean;
}

/**
 * Fetches token metadata (name, symbol, iconUrl) for the given CAIP-19 asset IDs
 * from the MetaMask tokens API.
 *
 * Large inputs are automatically split into parallel batches of at most
 * {@link MAX_BATCH_SIZE} IDs to keep individual requests within a safe size.
 * Each batch is independently cached and deduplicated so that multiple
 * simultaneous hook instances for the same assets share a single HTTP request.
 *
 * @param assetIds - Array of CAIP-19 asset identifiers (e.g. "eip155:1/erc20:0xabc…")
 * @param options - Optional fetch configuration
 * @param options.includeRwaData - Whether to request RWA metadata in the response (default: false)
 * @returns tokens map from asset ID to {@link TokenAsset}, and isLoading flag.
 */
export function useTokensData(
  assetIds: string[],
  options: FetchTokensOptions = {},
): UseTokensDataResult {
  const assetIdsKey = assetIds.join(',');
  const { includeRwaData = false } = options;
  const suffix = optionsSuffix(options);

  const allCached =
    assetIds.length === 0 || assetIds.every((id) => tokenCache[id + suffix]);

  const [tokensByAssetId, setTokensByAssetId] = useState<
    Record<string, TokenAsset>
  >(() =>
    Object.fromEntries(
      assetIds
        .filter((id) => tokenCache[id + suffix])
        .map((id) => [id, tokenCache[id + suffix]]),
    ),
  );

  const [isLoading, setIsLoading] = useState(!allCached);

  useEffect(() => {
    if (!assetIdsKey) {
      setIsLoading(false);
      return;
    }

    const ids = assetIdsKey.split(',');
    if (ids.every((id) => tokenCache[id + suffix])) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchTokenAssets(assetIdsKey.split(','), {
          includeRwaData,
        });
        if (!cancelled) {
          setTokensByAssetId((prev) => ({
            ...prev,
            ...Object.fromEntries(
              data.map((t) => [t.assetId.toLowerCase(), t]),
            ),
          }));
        }
      } catch {
        // Silently ignore fetch errors. On failure the cache is not populated,
        // so isRwaChecked stays false and these IDs are retried on the next
        // input change. Callers relying on RWA status should treat a resolved
        // isLoading with missing data as "status unknown" (see useTokensWithBalance).
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetIdsKey, includeRwaData, suffix]);

  return { tokens: tokensByAssetId, isLoading };
}
