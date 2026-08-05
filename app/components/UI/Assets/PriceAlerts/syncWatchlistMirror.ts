import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';

import Logger from '../../../../util/Logger';
import {
  addWatchlistAlert,
  assertOkResponse,
  fetchSupportedChains,
  removeWatchlistAlert,
} from './api';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

let cachedSupportedChains: string[] | null = null;
let cachedSupportedChainsAt = 0;

/**
 * Clears the in-memory supported-chains cache. Test-only.
 */
export const resetSupportedChainsCacheForTests = (): void => {
  cachedSupportedChains = null;
  cachedSupportedChainsAt = 0;
};

async function getSupportedChains(): Promise<string[] | null> {
  const now = Date.now();
  if (
    cachedSupportedChains !== null &&
    now - cachedSupportedChainsAt < TWENTY_FOUR_HOURS_MS
  ) {
    return cachedSupportedChains;
  }

  try {
    const response = await fetchSupportedChains();
    if (!response.ok) {
      return cachedSupportedChains;
    }
    const body = (await response.json()) as string[];
    if (!Array.isArray(body)) {
      return cachedSupportedChains;
    }
    cachedSupportedChains = body;
    cachedSupportedChainsAt = now;
    return cachedSupportedChains;
  } catch (error) {
    Logger.error(error as Error, {
      message:
        'Failed to fetch Price Alerts supported chains for watchlist mirror',
    });
    return cachedSupportedChains;
  }
}

const isSupportedAsset = (
  asset: string,
  supportedChains: readonly string[],
): boolean => {
  if (!isCaipAssetType(asset)) {
    return false;
  }
  const { chainId } = parseCaipAssetType(asset);
  return supportedChains.includes(chainId);
};

const softFailMirror = async (
  action: 'POST' | 'DELETE',
  asset: string,
  request: () => Promise<Response>,
): Promise<void> => {
  try {
    const response = await request();
    await assertOkResponse(response);
  } catch (error) {
    Logger.error(error as Error, {
      message: `Price Alerts watchlist ${action} soft-fail`,
      asset,
    });
  }
};

/**
 * After the real token watchlist blob is updated, mirror net membership
 * changes into Price Alerts for supported chains only.
 *
 * Soft-fails on every Price Alerts error — never throws, never rolls back
 * the real watchlist write.
 */
export async function syncPriceAlertsWatchlistMirror(
  previousAssets: readonly string[],
  nextAssets: readonly string[],
): Promise<void> {
  const previousLower = new Set(
    previousAssets.map((asset) => asset.toLowerCase()),
  );
  const nextLower = new Set(nextAssets.map((asset) => asset.toLowerCase()));

  const added = nextAssets.filter(
    (asset) => !previousLower.has(asset.toLowerCase()),
  );
  const removed = previousAssets.filter(
    (asset) => !nextLower.has(asset.toLowerCase()),
  );

  if (added.length === 0 && removed.length === 0) {
    return;
  }

  const supportedChains = await getSupportedChains();
  if (supportedChains === null) {
    return;
  }

  const supportedAdded = added.filter((asset) =>
    isSupportedAsset(asset, supportedChains),
  );
  const supportedRemoved = removed.filter((asset) =>
    isSupportedAsset(asset, supportedChains),
  );

  await Promise.all([
    ...supportedAdded.map((asset) =>
      softFailMirror('POST', asset, () => addWatchlistAlert(asset)),
    ),
    ...supportedRemoved.map((asset) =>
      softFailMirror('DELETE', asset, () => removeWatchlistAlert(asset)),
    ),
  ]);
}
