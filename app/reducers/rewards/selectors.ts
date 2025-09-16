import { RootState } from '..';
import { RewardsTab, OnboardingStep } from './types';

export const selectActiveTab = (state: RootState): RewardsTab | null =>
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
