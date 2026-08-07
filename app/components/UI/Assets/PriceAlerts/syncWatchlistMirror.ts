import Logger from '../../../../util/Logger';
import {
  addWatchlistAlerts,
  assertOkResponse,
  removeWatchlistAlerts,
  type WatchlistAlertsResult,
} from './api';

const softFailBatchMirror = async (
  action: 'POST' | 'DELETE',
  assetIds: string[],
  request: () => Promise<Response>,
): Promise<void> => {
  if (assetIds.length === 0) {
    return;
  }

  try {
    const response = await request();
    await assertOkResponse(response);
    const body = (await response.json()) as WatchlistAlertsResult;
    if (body.unprocessedAssetIds?.length) {
      // Expected for unsupported chains / rejected assets — do not fail UX.
      Logger.log('Price Alerts watchlist partial processing', {
        action,
        unprocessedAssetIds: body.unprocessedAssetIds,
        processedAssetIds: body.processedAssetIds ?? [],
      });
    }
  } catch (error) {
    Logger.error(error as Error, {
      message: `Price Alerts watchlist ${action} soft-fail`,
      assetIds,
    });
  }
};

/**
 * After the real token watchlist blob is updated, mirror net membership
 * changes into Price Alerts as batched POST/DELETE `{ assetIds }`.
 *
 * Soft-fails on every Price Alerts error or partial processing — never
 * throws, never rolls back the real watchlist write. CAIP-19 IDs are sent
 * with original casing (Solana mint refs must not be lowercased).
 */
export async function syncPriceAlertsWatchlistMirror(
  previousAssets: readonly string[],
  nextAssets: readonly string[],
): Promise<void> {
  // EVM identity is case-insensitive; keep original strings for the request
  // body so Solana mint casing is preserved when sent.
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

  await Promise.all([
    softFailBatchMirror('POST', added, () => addWatchlistAlerts(added)),
    softFailBatchMirror('DELETE', removed, () =>
      removeWatchlistAlerts(removed),
    ),
  ]);
}
