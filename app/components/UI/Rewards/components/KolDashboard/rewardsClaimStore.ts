import { useSyncExternalStore } from 'react';
import { KOL_EARNINGS_FIXTURE } from './rewardsUiFixtures';

/**
 * Claimable balance shared by the Rewards Claims tab and the Money tab card,
 * so a claim on either surface settles both. It lives outside React because
 * the Rewards tab unmounts on blur, and outside Redux because the balance is
 * still fixture data — engineers replace this with the claims controller.
 */
let claimableRewards = KOL_EARNINGS_FIXTURE.availableToClaim;

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getClaimableRewards = (): number => claimableRewards;

const setClaimableRewards = (amount: number): void => {
  if (amount === claimableRewards) {
    return;
  }
  claimableRewards = amount;
  listeners.forEach((listener) => listener());
};

/** Zeroes the balance on every surface that reads this store. */
export const claimAllRewards = (): void => setClaimableRewards(0);

/** Restores the fixture balance. */
export const resetClaimableRewards = (): void =>
  setClaimableRewards(KOL_EARNINGS_FIXTURE.availableToClaim);

export const useClaimableRewards = (): number =>
  useSyncExternalStore(subscribe, getClaimableRewards);
