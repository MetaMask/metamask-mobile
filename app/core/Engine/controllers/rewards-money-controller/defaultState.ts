import type { RewardsMoneyControllerState } from './types';

/**
 * Get the default state for the RewardsMoneyController.
 */
export const getRewardsMoneyControllerDefaultState =
  (): RewardsMoneyControllerState => ({
    referralMe: null,
    referralCodes: null,
    referralFunnel: null,
    earningsSummary: {},
    earningsLedgerFirstPage: {},
    claimHistoryFirstPage: null,
    claimById: {},
    rewardsMoneyEnvUrl: null,
  });

export const defaultRewardsMoneyControllerState =
  getRewardsMoneyControllerDefaultState();
