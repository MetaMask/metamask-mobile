import { PERPS_SIZE_DENOMINATION } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';

/**
 * Order-form size denomination shared by Lite and Pro.
 * `asset` is the coin amount (BTC, ETH, …); USD stays the canonical order amount.
 */
export type PerpsSizeDenomination = 'usd' | 'asset';

const DEFAULT_PERPS_SIZE_DENOMINATION: PerpsSizeDenomination = 'usd';

type SizeDenominationListener = (denomination: PerpsSizeDenomination) => void;

let cachedDenomination: PerpsSizeDenomination | undefined;
const listeners = new Set<SizeDenominationListener>();

const isPerpsSizeDenomination = (
  value: string | null | undefined,
): value is PerpsSizeDenomination => value === 'usd' || value === 'asset';

/** Storage mocks in tests return undefined instead of a Promise. */
const ignoreStorageFailure = (
  operation: Promise<unknown> | undefined,
): void => {
  // eslint-disable-next-line no-void -- test mocks return undefined, not a Promise
  void Promise.resolve(operation).catch(() => {
    // The in-memory value still applies for this session.
  });
};

/**
 * Segment value for the `size_unit` analytics property.
 * Coin matches the order-form label; the stored unit stays `asset`.
 */
export const toPerpsSizeUnitAnalyticsValue = (
  denomination: PerpsSizeDenomination,
): 'usd' | 'coin' => (denomination === 'asset' ? 'coin' : 'usd');

/**
 * Last chosen size denomination. Defaults to USD until the user switches to coin.
 * The in-memory value is synchronous; MMKV restores it after an app restart.
 */
export const readPerpsSizeDenomination = (): PerpsSizeDenomination => {
  if (cachedDenomination) {
    return cachedDenomination;
  }

  const stored = StorageWrapper.getItemSync(PERPS_SIZE_DENOMINATION);
  cachedDenomination = isPerpsSizeDenomination(stored)
    ? stored
    : DEFAULT_PERPS_SIZE_DENOMINATION;
  return cachedDenomination;
};

/** Remember the size denomination for later markets and app sessions. */
export const writePerpsSizeDenomination = (
  denomination: PerpsSizeDenomination,
): void => {
  if (cachedDenomination === denomination) {
    return;
  }

  cachedDenomination = denomination;
  listeners.forEach((listener) => {
    listener(denomination);
  });
  // MMKV writes resolve on the next microtask, which is enough to survive
  // process death after the toggle. The in-memory value covers the same session.
  ignoreStorageFailure(
    StorageWrapper.setItem(PERPS_SIZE_DENOMINATION, denomination),
  );
};

/** Subscribe to denomination changes from another mounted order form. */
export const subscribePerpsSizeDenomination = (
  listener: SizeDenominationListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Drop the cached choice so the next read reloads MMKV. Test-only. */
export const clearPerpsSizeDenominationMemoryForTests = (): void => {
  cachedDenomination = undefined;
};

/** Restore the USD default and clear persisted storage. Test-only. */
export const resetPerpsSizeDenominationForTests = (): void => {
  cachedDenomination = DEFAULT_PERPS_SIZE_DENOMINATION;
  ignoreStorageFailure(StorageWrapper.removeItem(PERPS_SIZE_DENOMINATION));
};
