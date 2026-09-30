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

export const useClaimableRewards = (): number =>
  useSyncExternalStore(subscribe, getClaimableRewards);

export const useIsTaxFormPending = (): boolean =>
  useSyncExternalStore(subscribe, getIsTaxFormPending);
