import type { RewardsMoneyControllerState } from './types';

/**
 * Get the default state for the RewardsMoneyController.
 */
export const getRewardsMoneyControllerDefaultState =
  (): RewardsMoneyControllerState => ({
    referralMe: {},
    referralCodes: {},
    referralFunnel: {},
    earningsSummary: {},
    earningsLedgerFirstPage: {},
    claimHistoryFirstPage: {},
    commissionsFirstPage: {},
    claimById: {},
    rewardsMoneyEnvUrl: null,
  });

export const defaultRewardsMoneyControllerState =
  getRewardsMoneyControllerDefaultState();
