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

/**
 * Cleared values for every profile-scoped cache bucket. Omits
 * `rewardsMoneyEnvUrl` (and any future device/build config) so
 * `clearProfileCache` can wipe Hydra-profile data without dropping
 * local overrides.
 * Add new profile-scoped fields to {@link getRewardsMoneyControllerDefaultState}
 * only — this helper derives from that.
 */
export const emptyProfileCache = (): Omit<
  RewardsMoneyControllerState,
  'rewardsMoneyEnvUrl'
> => {
  const { rewardsMoneyEnvUrl: _ignored, ...profileScoped } =
    getRewardsMoneyControllerDefaultState();
  return profileScoped;
};

export const defaultRewardsMoneyControllerState =
  getRewardsMoneyControllerDefaultState();
