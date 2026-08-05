import Logger from '../../../../util/Logger';
import {
  addWatchlistAlert,
  assertOkResponse,
  removeWatchlistAlert,
} from './api';

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
 * changes into Price Alerts. The client always calls the API; support /
 * validation is handled server-side. Soft-fails on every Price Alerts
 * error — never throws, never rolls back the real watchlist write.
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

  await Promise.all([
    ...added.map((asset) =>
      softFailMirror('POST', asset, () => addWatchlistAlert(asset)),
    ),
    ...removed.map((asset) =>
      softFailMirror('DELETE', asset, () => removeWatchlistAlert(asset)),
    ),
  ]);
}
