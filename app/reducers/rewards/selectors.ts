import { createSelector } from 'reselect';
import type { RootState } from '..';
import { initialState } from '.';
import { RewardsTab, OnboardingStep } from './types';
import { hasMinimumRequiredVersion } from '../../util/remoteFeatureFlag';
import {
  buildSubscriptionCampaignCompositeKey,
  buildCampaignOutcomeToastCompositeKey,
  type CampaignOutcomeToastVariant,
} from './compositeKeys';
import type {
  CampaignLeaderboardDto,
  OndoGmCampaignDepositsDto,
  PerpsTradingCampaignLeaderboardDto,
  PerpsTradingCampaignVolumeDto,
  PredictThePitchLeaderboardDto,
  PredictThePitchPrizePoolDto,
} from '../../core/Engine/controllers/rewards-controller/types';

export const selectActiveTab = (state: RootState): RewardsTab =>
  state.rewards.activeTab;

export const selectReferralCode = (state: RootState) =>
  state.rewards.referralCode;

export const selectBalanceTotal = (state: RootState) =>
  state.rewards.balanceTotal;

export const selectReferralCount = (state: RootState) =>
  state.rewards.refereeCount;

export const selectReferredByCode = (state: RootState) =>
  state.rewards.referredByCode;

export const selectIsVipReferee = (state: RootState) =>
  state.rewards.isVipReferee;

export const selectReferredByVipCode = (state: RootState) =>
  state.rewards.referredByVipCode;

export const selectCurrentTier = (state: RootState) =>
  state.rewards.currentTier;

export const selectNextTier = (state: RootState) => state.rewards.nextTier;

export const selectNextTierPointsNeeded = (state: RootState) =>
  state.rewards.nextTierPointsNeeded;

export const selectBalanceUpdatedAt = (state: RootState) =>
  state.rewards.balanceUpdatedAt;

export const selectSeasonStatusLoading = (state: RootState) =>
  state.rewards.seasonStatusLoading;

export const selectSeasonStatusError = (state: RootState) =>
  state.rewards.seasonStatusError;

export const selectSeasonId = (state: RootState) => state.rewards.seasonId;

export const selectSeasonName = (state: RootState) => state.rewards.seasonName;

export const selectSeasonStartDate = (state: RootState) =>
  state.rewards.seasonStartDate;

export const selectSeasonEndDate = (state: RootState) =>
  state.rewards.seasonEndDate;

export const selectSeasonTiers = (
  state: RootState,
): RootState['rewards']['seasonTiers'] =>
  state.rewards.seasonTiers ?? initialState.seasonTiers;

export const selectSeasonActivityTypes = (
  state: RootState,
): RootState['rewards']['seasonActivityTypes'] =>
  state.rewards.seasonActivityTypes ?? initialState.seasonActivityTypes;

export const selectSeasonWaysToEarn = (
  state: RootState,
): RootState['rewards']['seasonWaysToEarn'] =>
  state.rewards.seasonWaysToEarn ?? initialState.seasonWaysToEarn;

export const selectOnboardingActiveStep = (state: RootState): OnboardingStep =>
  state.rewards.onboardingActiveStep;

export const selectOnboardingReferralCode = (state: RootState) =>
  state.rewards.onboardingReferralCode;

export const selectGeoLocation = (state: RootState) =>
  state.rewards.geoLocation;

export const selectOptinAllowedForGeo = (state: RootState) =>
  state.rewards.optinAllowedForGeo;

export const selectOptinAllowedForGeoLoading = (state: RootState) =>
  state.rewards.optinAllowedForGeoLoading;

export const selectOptinAllowedForGeoError = (state: RootState) =>
  state.rewards.optinAllowedForGeoError;

export const selectReferralDetailsLoading = (state: RootState) =>
  state.rewards.referralDetailsLoading;

export const selectReferralDetailsError = (state: RootState) =>
  state.rewards.referralDetailsError;

export const selectCandidateSubscriptionId = (state: RootState) =>
  state.rewards.candidateSubscriptionId;

export const selectHideUnlinkedAccountsBanner = (state: RootState) =>
  state.rewards.hideUnlinkedAccountsBanner;

export const selectHideCurrentAccountNotOptedInBannerArray = (
  state: RootState,
): RootState['rewards']['hideCurrentAccountNotOptedInBanner'] =>
  state.rewards.hideCurrentAccountNotOptedInBanner ??
  initialState.hideCurrentAccountNotOptedInBanner;

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

export const selectUnlockedRewardError = (state: RootState) =>
  state.rewards.unlockedRewardError;

export const selectSeasonRewardById =
  (rewardId: string) => (state: RootState) =>
    (state.rewards.seasonTiers || [])
      .flatMap((tier) => tier.rewards)
      ?.find((reward) => reward.id === rewardId);

export const selectPointsEvents = (state: RootState) =>
  state.rewards.pointsEvents;

// Bulk link selectors
export const selectBulkLinkState = (state: RootState) => state.rewards.bulkLink;

export const selectBulkLinkIsRunning = (state: RootState) =>
  state.rewards.bulkLink.isRunning;

export const selectBulkLinkTotalAccounts = (state: RootState) =>
  state.rewards.bulkLink.totalAccounts;

export const selectBulkLinkLinkedAccounts = (state: RootState) =>
  state.rewards.bulkLink.linkedAccounts;

export const selectBulkLinkFailedAccounts = (state: RootState) =>
  state.rewards.bulkLink.failedAccounts;

/**
 * Returns whether the bulk link process was interrupted (e.g., app closed during processing).
 * When true, the user can resume the process by dispatching resumeBulkLink().
 */
export const selectBulkLinkWasInterrupted = (state: RootState) =>
  state.rewards.bulkLink.wasInterrupted;

/**
 * Returns account-level progress as a percentage (0-1)
 */
export const selectBulkLinkAccountProgress = (state: RootState) => {
  const { linkedAccounts, failedAccounts, totalAccounts } =
    state.rewards.bulkLink;
  if (totalAccounts === 0) return 0;
  return (linkedAccounts + failedAccounts) / totalAccounts;
};

// Benefits selectors
export const selectBenefits = (
  state: RootState,
): RootState['rewards']['benefits'] =>
  state.rewards.benefits ?? initialState.benefits;

export const selectBenefitsLoading = (state: RootState): boolean =>
  state.rewards.benefitsLoading;

// VIP dashboard selectors
export const selectVipDashboard =
  (subscriptionId: string | null | undefined) => (state: RootState) =>
    subscriptionId
      ? (state.rewards.vipDashboard?.[subscriptionId] ?? null)
      : null;

export const selectVipDashboardLoading = (state: RootState): boolean =>
  state.rewards.vipDashboardLoading;

export const selectVipDashboardError = (state: RootState): boolean =>
  state.rewards.vipDashboardError;

export const selectVipRefereeDashboard =
  (subscriptionId: string | null | undefined) => (state: RootState) =>
    subscriptionId
      ? (state.rewards.vipRefereeDashboard?.[subscriptionId] ?? null)
      : null;

export const selectVipRefereeDashboardLoading = (state: RootState): boolean =>
  state.rewards.vipRefereeDashboardLoading;

export const selectVipRefereeDashboardError = (state: RootState): boolean =>
  state.rewards.vipRefereeDashboardError;

export const selectHasAcceptedVipInvite =
  (subscriptionId: string | null | undefined) =>
  (state: RootState): boolean =>
    subscriptionId
      ? state.rewards.vipSplashAccepted?.[subscriptionId] === true
      : false;

export const selectHasAcceptedVipRefereeInvite =
  (subscriptionId: string | null | undefined) =>
  (state: RootState): boolean =>
    subscriptionId
      ? state.rewards.vipRefereeSplashAccepted?.[subscriptionId] === true
      : false;

// Campaigns selectors
export const selectCampaigns = (
  state: RootState,
): RootState['rewards']['campaigns'] =>
  state.rewards.campaigns ?? initialState.campaigns;

export const selectCampaignById = (campaignId: string) => (state: RootState) =>
  state.rewards.campaigns?.find((c) => c.id === campaignId) ?? null;

export const selectCampaignsLoading = (state: RootState) =>
  state.rewards.campaignsLoading;

export const selectCampaignsError = (state: RootState) =>
  state.rewards.campaignsError;

export const selectCampaignsHasLoaded = (state: RootState) =>
  state.rewards.campaignsHasLoaded;

// Campaign participant status selectors
export const selectCampaignParticipantStatuses = (state: RootState) =>
  state.rewards.campaignParticipantStatuses;

export const selectCampaignParticipantStatus =
  (
    subscriptionId: string | undefined | null,
    campaignId: string | undefined | null,
  ) =>
  (state: RootState) => {
    if (!subscriptionId || !campaignId) return null;
    const key = buildSubscriptionCampaignCompositeKey(
      subscriptionId,
      campaignId,
    );
    return state.rewards.campaignParticipantStatuses?.[key] ?? null;
  };

export const selectCampaignParticipantOptedIn =
  (
    subscriptionId: string | undefined | null,
    campaignId: string | undefined | null,
  ) =>
  (state: RootState): boolean =>
    selectCampaignParticipantStatus(subscriptionId, campaignId)(state)
      ?.optedIn === true;

export const selectCampaignParticipantCount =
  (subscriptionId: string | undefined, campaignId: string | undefined) =>
  (state: RootState) => {
    if (!subscriptionId || !campaignId) return null;
    const key = buildSubscriptionCampaignCompositeKey(
      subscriptionId,
      campaignId,
    );
    return (
      state.rewards.campaignParticipantStatuses?.[key]?.participantCount ?? null
    );
  };

// Version guard selectors
export const selectVersionGuardMinimumMobileVersion = (state: RootState) =>
  state.rewards.versionGuardMinimumMobileVersion ??
  initialState.versionGuardMinimumMobileVersion;

export const selectVersionGuardLoading = (state: RootState) =>
  state.rewards.versionGuardLoading ?? initialState.versionGuardLoading;

export const selectVersionGuardError = (state: RootState) =>
  state.rewards.versionGuardError ?? initialState.versionGuardError;

/**
 * Returns true when the current app version is below the minimum required
 * by the rewards backend, meaning the user must update to use Rewards.
 * Returns false when requirements have not been fetched yet.
 */
export const selectIsRewardsVersionBlocked = (state: RootState): boolean => {
  const minVersion = selectVersionGuardMinimumMobileVersion(state);
  if (!minVersion) return false;
  return !hasMinimumRequiredVersion(minVersion);
};

// Campaign leaderboard selectors
export const selectOndoCampaignLeaderboardByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): CampaignLeaderboardDto | null =>
    campaignId
      ? (state.rewards.ondoCampaignLeaderboards[campaignId]?.data ?? null)
      : null;

export const selectOndoCampaignLeaderboardLoadingByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.ondoCampaignLeaderboards[campaignId]?.loading ?? false)
      : false;

export const selectOndoCampaignLeaderboardErrorByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.ondoCampaignLeaderboards[campaignId]?.error ?? false)
      : false;

export const selectOndoCampaignLeaderboardSelectedTierByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): string | null =>
    campaignId
      ? (state.rewards.ondoCampaignLeaderboards[campaignId]?.selectedTier ??
        null)
      : null;

// Stable fallbacks to avoid returning new references from input selectors
const EMPTY_TIERS: Record<string, never> = {};
const EMPTY_ENTRIES: never[] = [];

export const selectOndoCampaignLeaderboardTiersByCampaignId =
  (campaignId: string | undefined) => (state: RootState) =>
    campaignId
      ? (state.rewards.ondoCampaignLeaderboards[campaignId]?.data?.tiers ??
        EMPTY_TIERS)
      : EMPTY_TIERS;

export const selectOndoCampaignLeaderboardComputedAtByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): string | null =>
    campaignId
      ? (state.rewards.ondoCampaignLeaderboards[campaignId]?.data?.computedAt ??
        null)
      : null;

export const selectOndoCampaignLeaderboardTierNamesByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): string[] =>
    Object.keys(
      selectOndoCampaignLeaderboardTiersByCampaignId(campaignId)(state),
    );

export const selectOndoCampaignLeaderboardEntriesByTier =
  (campaignId: string | undefined, tierName: string | null) =>
  (state: RootState) => {
    if (!campaignId || !tierName) {
      return EMPTY_ENTRIES;
    }
    const tiers =
      state.rewards.ondoCampaignLeaderboards[campaignId]?.data?.tiers;
    return tiers?.[tierName]?.entries ?? EMPTY_ENTRIES;
  };

export const selectOndoCampaignLeaderboardTotalParticipantsByTier =
  (campaignId: string | undefined, tierName: string | null) =>
  (state: RootState): number => {
    if (!campaignId || !tierName) {
      return 0;
    }
    const tiers =
      state.rewards.ondoCampaignLeaderboards[campaignId]?.data?.tiers;
    return tiers?.[tierName]?.totalParticipants ?? 0;
  };

// Campaign leaderboard position selectors
export const selectOndoCampaignLeaderboardPositions = (state: RootState) =>
  state.rewards.ondoCampaignLeaderboardPositions;

export const selectOndoCampaignLeaderboardPositionById =
  (subscriptionId: string | undefined, campaignId: string | undefined) =>
  (state: RootState) =>
    subscriptionId &&
    campaignId &&
    state.rewards.ondoCampaignLeaderboardPositions
      ? (state.rewards.ondoCampaignLeaderboardPositions[
          buildSubscriptionCampaignCompositeKey(subscriptionId, campaignId)
        ] ?? null)
      : null;

export const selectOndoCampaignPortfolio = (state: RootState) =>
  state.rewards.ondoCampaignPortfolio;

export const selectOndoCampaignPortfolioById =
  (subscriptionId: string | undefined, campaignId: string | undefined) =>
  (state: RootState) =>
    subscriptionId && campaignId && state.rewards.ondoCampaignPortfolio
      ? (state.rewards.ondoCampaignPortfolio[
          buildSubscriptionCampaignCompositeKey(subscriptionId, campaignId)
        ] ?? null)
      : null;

export const selectOndoCampaignActivityById =
  (subscriptionId: string | undefined, campaignId: string | undefined) =>
  (state: RootState) =>
    subscriptionId && campaignId && state.rewards.ondoCampaignActivity
      ? (state.rewards.ondoCampaignActivity[
          buildSubscriptionCampaignCompositeKey(subscriptionId, campaignId)
        ] ?? null)
      : null;

// Campaign deposits selectors
export const selectOndoCampaignDepositsByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): OndoGmCampaignDepositsDto | null =>
    campaignId
      ? (state.rewards.ondoCampaignDeposits[campaignId]?.data ?? null)
      : null;

export const selectOndoCampaignDepositsLoadingByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.ondoCampaignDeposits[campaignId]?.loading ?? false)
      : false;

export const selectOndoCampaignDepositsErrorByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.ondoCampaignDeposits[campaignId]?.error ?? false)
      : false;

export const selectPendingDeeplink = (state: RootState) =>
  state.rewards.pendingDeeplink;

export const selectDismissedCampaignOutcomeToasts = (
  state: RootState,
): RootState['rewards']['dismissedCampaignOutcomeToasts'] =>
  state.rewards.dismissedCampaignOutcomeToasts ??
  initialState.dismissedCampaignOutcomeToasts;

export const selectSubscribedCampaignReminders = (
  state: RootState,
): RootState['rewards']['subscribedCampaignReminders'] =>
  state.rewards.subscribedCampaignReminders ??
  initialState.subscribedCampaignReminders;

export const selectFirstPredictOnUsSplashShown = (state: RootState): boolean =>
  state.rewards.firstPredictOnUsSplashShown ??
  initialState.firstPredictOnUsSplashShown;

export const selectIsCampaignOutcomeToastDismissed =
  (
    subscriptionId: string | undefined,
    campaignId: string | undefined,
    variant: CampaignOutcomeToastVariant,
  ) =>
  (state: RootState): boolean => {
    if (!subscriptionId || !campaignId) {
      return true;
    }
    const key = buildCampaignOutcomeToastCompositeKey(
      campaignId,
      subscriptionId,
      variant,
    );
    return selectDismissedCampaignOutcomeToasts(state)[key] === true;
  };

// Perps Trading Campaign leaderboard selectors
export const selectPerpsTradingCampaignLeaderboardByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): PerpsTradingCampaignLeaderboardDto | null =>
    campaignId
      ? (state.rewards.perpsTradingCampaignLeaderboards[campaignId]?.data ??
        null)
      : null;

export const selectPerpsTradingCampaignLeaderboardLoadingByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.perpsTradingCampaignLeaderboards[campaignId]?.loading ??
        false)
      : false;

export const selectPerpsTradingCampaignLeaderboardErrorByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.perpsTradingCampaignLeaderboards[campaignId]?.error ??
        false)
      : false;

// Perps Trading Campaign leaderboard position selectors
export const selectPerpsTradingCampaignLeaderboardPositionById =
  (subscriptionId: string | undefined, campaignId: string | undefined) =>
  (state: RootState) =>
    subscriptionId && campaignId
      ? (state.rewards.perpsTradingCampaignLeaderboardPositions[
          buildSubscriptionCampaignCompositeKey(subscriptionId, campaignId)
        ] ?? null)
      : null;

// Perps Trading Campaign volume selectors
export const selectPerpsTradingCampaignVolumeByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): PerpsTradingCampaignVolumeDto | null =>
    campaignId
      ? (state.rewards.perpsTradingCampaignVolumes[campaignId]?.data ?? null)
      : null;

export const selectPerpsTradingCampaignVolumeLoadingByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.perpsTradingCampaignVolumes[campaignId]?.loading ??
        false)
      : false;

export const selectPerpsTradingCampaignVolumeErrorByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.perpsTradingCampaignVolumes[campaignId]?.error ?? false)
      : false;

// Predict The Pitch leaderboard selectors
export const selectPredictThePitchLeaderboardByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): PredictThePitchLeaderboardDto | null =>
    campaignId
      ? (state.rewards.predictThePitchLeaderboards[campaignId]?.data ?? null)
      : null;

export const selectPredictThePitchLeaderboardLoadingByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.predictThePitchLeaderboards[campaignId]?.loading ??
        false)
      : false;

export const selectPredictThePitchLeaderboardErrorByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.predictThePitchLeaderboards[campaignId]?.error ?? false)
      : false;

export const selectPredictThePitchLeaderboardPositionById =
  (subscriptionId: string | undefined, campaignId: string | undefined) =>
  (state: RootState) =>
    subscriptionId && campaignId
      ? (state.rewards.predictThePitchLeaderboardPositions[
          buildSubscriptionCampaignCompositeKey(subscriptionId, campaignId)
        ] ?? null)
      : null;

export const selectPredictThePitchPositionsById =
  (subscriptionId: string | undefined, campaignId: string | undefined) =>
  (state: RootState) =>
    subscriptionId && campaignId
      ? (state.rewards.predictThePitchPositions[
          buildSubscriptionCampaignCompositeKey(subscriptionId, campaignId)
        ] ?? null)
      : null;

// Predict The Pitch prize pool selectors
export const selectPredictThePitchPrizePoolByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): PredictThePitchPrizePoolDto | null =>
    campaignId
      ? (state.rewards.predictThePitchPrizePools[campaignId]?.data ?? null)
      : null;

export const selectPredictThePitchPrizePoolLoadingByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.predictThePitchPrizePools[campaignId]?.loading ?? false)
      : false;

export const selectPredictThePitchPrizePoolErrorByCampaignId =
  (campaignId: string | undefined) =>
  (state: RootState): boolean =>
    campaignId
      ? (state.rewards.predictThePitchPrizePools[campaignId]?.error ?? false)
      : false;
