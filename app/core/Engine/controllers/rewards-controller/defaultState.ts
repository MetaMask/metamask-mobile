import type { RewardsControllerState } from './types';

/**
 * Get the default state for the RewardsController.
 */
export const getRewardsControllerDefaultState = (): RewardsControllerState => ({
  activeAccount: null,
  accounts: {},
  subscriptions: {},
  subscriptionBenefits: {},
  vipDashboard: {},
  vipPerpsFees: {},
  seasons: {},
  subscriptionReferralDetails: {},
  seasonStatuses: {},
  activeBoosts: {},
  unlockedRewards: {},
  pointsEvents: {},
  offDeviceSubscriptionAccounts: {},
  campaigns: {},
  campaignParticipantStatus: {},
  ondoCampaignLeaderboard: {},
  ondoCampaignLeaderboardPositions: {},
  ondoCampaignPortfolio: {},
  ondoCampaignActivity: {},
  ondoCampaignDeposits: {},
  perpsTradingCampaignLeaderboard: {},
  perpsTradingCampaignLeaderboardPositions: {},
  perpsTradingCampaignVolume: {},
  predictThePitchEligibleMarkets: null,
  predictThePitchLeaderboard: {},
  predictThePitchLeaderboardPositions: {},
  predictThePitchPositions: {},
  predictThePitchPrizePool: {},
  clientVersionRequirements: null,
  pointsEstimateHistory: [],
  rewardsEnvUrl: null,
});

export const defaultRewardsControllerState = getRewardsControllerDefaultState();
