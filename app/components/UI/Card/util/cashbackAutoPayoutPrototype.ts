import { useSyncExternalStore } from 'react';

/**
 * PROTOTYPE toggles for the Card home cashback panel.
 *
 * Auto payout: real auto payout is backend work (the reward service would pay
 * out each time the balance reaches the payout increment). Until then this is
 * a local toggle so Card home can show the auto payout state.
 *
 * Ring layout: shows cashback as a radial ring above the card instead of the
 * panel, so both layouts can be compared on a device.
 *
 * Both are in-memory, call no API, are not persisted and only exist in
 * development builds.
 */
export const IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED = __DEV__;

const createPrototypeToggle = () => {
  let isOn = false;
  const listeners = new Set<() => void>();

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = () => IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED && isOn;

  const set = (value: boolean): void => {
    if (!IS_CASHBACK_AUTO_PAYOUT_PROTOTYPE_ENABLED || value === isOn) {
      return;
    }
    isOn = value;
    listeners.forEach((listener) => listener());
  };

  const useValue = (): boolean =>
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { set, useValue };
};

const autoPayout = createPrototypeToggle();
const ringLayout = createPrototypeToggle();

export const setCashbackAutoPayoutPrototype = autoPayout.set;

/** Whether the prototype auto payout toggle is on (always false in production). */
export const useCashbackAutoPayoutPrototype = autoPayout.useValue;

export const setCashbackRingPrototype = ringLayout.set;

/** Whether the prototype ring layout is on (always false in production). */
export const useCashbackRingPrototype = ringLayout.useValue;
