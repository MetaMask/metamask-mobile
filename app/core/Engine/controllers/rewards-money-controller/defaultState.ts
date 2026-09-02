import type { RewardsMoneyControllerState } from './types';

/**
 * Get the default state for the RewardsMoneyController.
 */
export const getRewardsMoneyControllerDefaultState =
  (): RewardsMoneyControllerState => ({
    referralMe: null,
    earningsSummary: {},
    earningsLedgerFirstPage: {},
    optimisticClaim: null,
  });

export const defaultRewardsMoneyControllerState =
  getRewardsMoneyControllerDefaultState();
