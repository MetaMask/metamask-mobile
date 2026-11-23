import { PERPS_LAST_ACTION_AT } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';

export const PERPS_RECENT_ACTION_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Called from order-execution success paths, so it must never throw or delay
 * them. The try/catch is load-bearing: the storage backend can throw
 * synchronously rather than returning a rejected promise.
 */
export const recordPerpsAction = (timestamp: number = Date.now()): void => {
  try {
    StorageWrapper.setItem(PERPS_LAST_ACTION_AT, String(timestamp))?.catch(
      () => undefined,
    );
  } catch {
    // A missed timestamp only costs this user the reordered section.
  }
};

/** Synchronous by design — see `useIsActivePerpsTrader`. */
export const hasRecentPerpsAction = (now: number = Date.now()): boolean => {
  const stored = StorageWrapper.getItemSync(PERPS_LAST_ACTION_AT);
  if (!stored) {
    return false;
  }

  const timestamp = Number(stored);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return false;
  }

  // Reject a backwards clock rather than granting an unbounded window.
  const elapsed = now - timestamp;
  return elapsed >= 0 && elapsed < PERPS_RECENT_ACTION_WINDOW_MS;
};
