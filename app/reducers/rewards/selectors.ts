import { RootState } from '..';

export const selectActiveTab = (state: RootState) => state.rewards.activeTab;

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
