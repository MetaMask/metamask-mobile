import type { RewardsMoneyControllerState } from './types';

/**
 * Get the default state for the RewardsMoneyController.
 */
export const getRewardsMoneyControllerDefaultState =
  (): RewardsMoneyControllerState => ({
    referralMe: null,
    earningsSummary: {},
    earningsLedgerFirstPage: {},
  });

export const defaultRewardsMoneyControllerState =
  getRewardsMoneyControllerDefaultState();
