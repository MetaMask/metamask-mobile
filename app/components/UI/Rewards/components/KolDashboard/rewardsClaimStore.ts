import { useSyncExternalStore } from 'react';
import { KOL_EARNINGS_FIXTURE } from './rewardsUiFixtures';

/**
 * Claim state shared by the Rewards Claims tab and the Money tab card, so a
 * claim or a tax form submitted on either surface settles both. It lives
 * outside React because the Rewards tab unmounts on blur, and outside Redux
 * because the balance is still fixture data — engineers replace this with the
 * claims controller.
 */
let claimableRewards = KOL_EARNINGS_FIXTURE.availableToClaim;
let isTaxFormPending = false;
let isClaimOnHold = false;
let isClaimsPaused = false;

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const emit = (): void => {
  listeners.forEach((listener) => listener());
};

export const getClaimableRewards = (): number => claimableRewards;

const setClaimableRewards = (amount: number): void => {
  if (amount === claimableRewards) {
    return;
  }
  claimableRewards = amount;
  emit();
};

/** Zeroes the balance on every surface that reads this store. */
export const claimAllRewards = (): void => setClaimableRewards(0);

/** Restores the fixture balance. */
export const resetClaimableRewards = (): void =>
  setClaimableRewards(KOL_EARNINGS_FIXTURE.availableToClaim);

export const getIsTaxFormPending = (): boolean => isTaxFormPending;

const setIsTaxFormPending = (pending: boolean): void => {
  if (pending === isTaxFormPending) {
    return;
  }
  isTaxFormPending = pending;
  emit();
};

/**
 * Records that the user left for the partner tax form, which puts later claim
 * attempts into pending review until the form clears.
 */
export const markTaxFormPending = (): void => setIsTaxFormPending(true);

/** Clears the pending tax form review. */
export const resetTaxFormPending = (): void => setIsTaxFormPending(false);

export const getIsClaimOnHold = (): boolean => isClaimOnHold;

const setIsClaimOnHold = (onHold: boolean): void => {
  if (onHold === isClaimOnHold) {
    return;
  }
  isClaimOnHold = onHold;
  emit();
};

/** Flags claims as on hold so the Claims tab shows On hold instead of Claim. */
export const markClaimOnHold = (): void => setIsClaimOnHold(true);

/** Clears the on-hold claim gate. */
export const resetClaimOnHold = (): void => setIsClaimOnHold(false);

export const getIsClaimsPaused = (): boolean => isClaimsPaused;

const setIsClaimsPaused = (paused: boolean): void => {
  if (paused === isClaimsPaused) {
    return;
  }
  isClaimsPaused = paused;
  emit();
};

/** Flags claims as paused so the Claims tab shows Paused instead of Claim. */
export const markClaimsPaused = (): void => setIsClaimsPaused(true);

/** Clears the paused claim gate. */
export const resetClaimsPaused = (): void => setIsClaimsPaused(false);

export const useClaimableRewards = (): number =>
  useSyncExternalStore(subscribe, getClaimableRewards);

export const useIsTaxFormPending = (): boolean =>
  useSyncExternalStore(subscribe, getIsTaxFormPending);

export const useIsClaimOnHold = (): boolean =>
  useSyncExternalStore(subscribe, getIsClaimOnHold);

export const useIsClaimsPaused = (): boolean =>
  useSyncExternalStore(subscribe, getIsClaimsPaused);
