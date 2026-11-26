import { useSyncExternalStore } from 'react';

/**
 * PROTOTYPE: "Auto payout" for card cashback.
 *
 * Real auto payout is backend work (the reward service would pay out each
 * time the balance reaches the payout increment). Until then this is a
 * local, in-memory toggle that only exists in development builds so the
 * Card home panel can show the auto payout state. It calls no API and is
 * not persisted.
 */
export const IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED = __DEV__;

let isAutoPayoutOn = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () =>
  IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED && isAutoPayoutOn;

export const setCashbackAutoPayoutPrototype = (value: boolean): void => {
  if (!IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED || value === isAutoPayoutOn) {
    return;
  }
  isAutoPayoutOn = value;
  listeners.forEach((listener) => listener());
};

/** Whether the prototype auto payout toggle is on (always false in production). */
export const useCashbackAutoPayoutPrototype = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
