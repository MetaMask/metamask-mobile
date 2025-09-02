import { RootState } from '..';
import { RewardsTab } from './types';

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

export const selectTierStatus = (state: RootState) => state.rewards.tierStatus;

export const selectBalanceRefereePortion = (state: RootState) =>
  state.rewards.balanceRefereePortion;

export const selectBalanceUpdatedAt = (state: RootState) =>
  state.rewards.balanceUpdatedAt;

export const selectSeasonStatusLoading = (state: RootState) =>
  state.rewards.seasonStatusLoading;
