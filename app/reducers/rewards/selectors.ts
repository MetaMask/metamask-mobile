import { RootState } from '..';
import { RewardsTab, OnboardingStep } from './types';

export const selectActiveTab = (state: RootState): RewardsTab =>
  state.rewards.activeTab;

export const selectReferralCode = (state: RootState) =>
  state.rewards.referralCode;

export const selectBalanceTotal = (state: RootState) =>
  state.rewards.balanceTotal;

export const selectReferralCount = (state: RootState) =>
  state.rewards.refereeCount;

export const selectCurrentTier = (state: RootState) =>
  state.rewards.currentTier;

export const selectNextTier = (state: RootState) => state.rewards.nextTier;

export const selectNextTierPointsNeeded = (state: RootState) =>
  state.rewards.nextTierPointsNeeded;

export const selectBalanceRefereePortion = (state: RootState) =>
  state.rewards.balanceRefereePortion;

export const selectBalanceUpdatedAt = (state: RootState) =>
  state.rewards.balanceUpdatedAt;

export const selectSeasonStatusLoading = (state: RootState) =>
  state.rewards.seasonStatusLoading;

export const selectSeasonId = (state: RootState) => state.rewards.seasonId;

export const selectSeasonName = (state: RootState) => state.rewards.seasonName;

export const selectSeasonStartDate = (state: RootState) =>
  state.rewards.seasonStartDate;

export const selectSeasonEndDate = (state: RootState) =>
  state.rewards.seasonEndDate;

export const selectSeasonTiers = (state: RootState) =>
  state.rewards.seasonTiers;

export const selectOnboardingActiveStep = (state: RootState): OnboardingStep =>
  state.rewards.onboardingActiveStep;

export const selectGeoLocation = (state: RootState) =>
  state.rewards.geoLocation;

export const selectOptinAllowedForGeo = (state: RootState) =>
  state.rewards.optinAllowedForGeo;

export const selectOptinAllowedForGeoLoading = (state: RootState) =>
  state.rewards.optinAllowedForGeoLoading;

export const selectReferralDetailsLoading = (state: RootState) =>
  state.rewards.referralDetailsLoading;

export const selectCandidateSubscriptionId = (state: RootState) =>
  state.rewards.candidateSubscriptionId;

export const selectHideUnlinkedAccountsBanner = (state: RootState) =>
  state.rewards.hideUnlinkedAccountsBanner;

export const selectActiveBoosts = (state: RootState) =>
  state.rewards.activeBoosts;

export const selectActiveBoostsLoading = (state: RootState) =>
  state.rewards.activeBoostsLoading;

export const selectActiveBoostsError = (state: RootState) =>
  state.rewards.activeBoostsError;

export const selectUnlockedRewards = (state: RootState) =>
  state.rewards.unlockedRewards;

export const selectUnlockedRewardLoading = (state: RootState) =>
  state.rewards.unlockedRewardLoading;

export const selectSeasonRewardById =
  (rewardId: string) => (state: RootState) =>
    (state.rewards.seasonTiers || [])
      .flatMap((tier) => tier.rewards)
      ?.find((reward) => reward.id === rewardId);
