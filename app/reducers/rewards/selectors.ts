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

export const selectSubscriptionId = (state: RootState) =>
  state.rewards.subscriptionId;

export const selectCurrentTierId = (state: RootState) =>
  state.rewards.currentTierId;

export const selectBalanceRefereePortion = (state: RootState) =>
  state.rewards.balanceRefereePortion;

export const selectBalanceUpdatedAt = (state: RootState) =>
  state.rewards.balanceUpdatedAt;

export const selectSeasonStatusLoading = (state: RootState) =>
  state.rewards.seasonStatusLoading;

export const selectOnboardingActiveStep = (state: RootState): OnboardingStep =>
  state.rewards.onboardingActiveStep;

export const selectGeoLocation = (state: RootState) =>
  state.rewards.geoLocation;
