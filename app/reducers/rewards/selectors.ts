import { createSelector } from 'reselect';
import { RootState } from '..';
import { RewardsTab, OnboardingStep } from './types';
import { hasMinimumRequiredVersion } from '../../util/remoteFeatureFlag';
import { SubscriptionBenefitDto } from '../../core/Engine/controllers/rewards-controller/types.ts';

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

export const selectSeasonStatusError = (state: RootState) =>
  state.rewards.seasonStatusError;

export const selectSeasonId = (state: RootState) => state.rewards.seasonId;

export const selectSeasonName = (state: RootState) => state.rewards.seasonName;

export const selectSeasonStartDate = (state: RootState) =>
  state.rewards.seasonStartDate;

export const selectSeasonEndDate = (state: RootState) =>
  state.rewards.seasonEndDate;

export const selectSeasonTiers = (state: RootState) =>
  state.rewards.seasonTiers;

export const selectSeasonActivityTypes = (state: RootState) =>
  state.rewards.seasonActivityTypes;

export const selectSeasonWaysToEarn = (state: RootState) =>
  state.rewards.seasonWaysToEarn;

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
) => state.rewards.hideCurrentAccountNotOptedInBanner;

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

export const selectSeasonShouldInstallNewVersion = (state: RootState) =>
  state.rewards.seasonShouldInstallNewVersion;

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
export const selectBenefits = (state: RootState): SubscriptionBenefitDto[] =>
  state.rewards.benefits;

export const selectBenefitsLoading = (state: RootState): boolean =>
  state.rewards.benefitsLoading;

// Campaigns selectors
export const selectCampaigns = (state: RootState) => state.rewards.campaigns;

export const selectCampaignsLoading = (state: RootState) =>
  state.rewards.campaignsLoading;

export const selectCampaignsError = (state: RootState) =>
  state.rewards.campaignsError;

export const selectCampaignsHasLoaded = (state: RootState) =>
  state.rewards.campaignsHasLoaded;

// Campaign participant status selectors
export const selectCampaignParticipantStatuses = (state: RootState) =>
  state.rewards.campaignParticipantStatuses;

export const selectCampaignParticipantStatusById =
  (campaignId: string | undefined) => (state: RootState) =>
    campaignId
      ? (state.rewards.campaignParticipantStatuses?.[campaignId] ?? null)
      : null;

export const selectCampaignParticipantCount =
  (campaignId: string | undefined) => (state: RootState) =>
    campaignId
      ? (state.rewards.campaignParticipantStatuses?.[campaignId]
          ?.participantCount ?? null)
      : null;

// Version guard selectors
export const selectVersionGuardMinimumMobileVersion = (state: RootState) =>
  state.rewards.versionGuardMinimumMobileVersion;

export const selectVersionGuardLoading = (state: RootState) =>
  state.rewards.versionGuardLoading;

export const selectVersionGuardError = (state: RootState) =>
  state.rewards.versionGuardError;

/**
 * Returns true when the current app version is below the minimum required
 * by the rewards backend, meaning the user must update to use Rewards.
 * Returns false when requirements have not been fetched yet.
 */
export const selectIsRewardsVersionBlocked = (state: RootState): boolean => {
  const minVersion = state.rewards.versionGuardMinimumMobileVersion;
  if (!minVersion) return false;
  return !hasMinimumRequiredVersion(minVersion);
};

// Campaign leaderboard selectors
export const selectOndoCampaignLeaderboard = (state: RootState) =>
  state.rewards.ondoCampaignLeaderboard;

export const selectOndoCampaignLeaderboardLoading = (state: RootState) =>
  state.rewards.ondoCampaignLeaderboardLoading;

export const selectOndoCampaignLeaderboardError = (state: RootState) =>
  state.rewards.ondoCampaignLeaderboardError;

export const selectOndoCampaignLeaderboardSelectedTier = (state: RootState) =>
  state.rewards.ondoCampaignLeaderboardSelectedTier;

// Stable fallbacks to avoid returning new references from input selectors
const EMPTY_TIERS: Record<string, never> = {};
const EMPTY_ENTRIES: never[] = [];

export const selectOndoCampaignLeaderboardTiers = (state: RootState) =>
  state.rewards.ondoCampaignLeaderboard?.tiers ?? EMPTY_TIERS;

export const selectOndoCampaignLeaderboardComputedAt = (state: RootState) =>
  state.rewards.ondoCampaignLeaderboard?.computedAt ?? null;

export const selectOndoCampaignLeaderboardTierNames = createSelector(
  selectOndoCampaignLeaderboardTiers,
  (tiers) => Object.keys(tiers),
);

export const selectOndoCampaignLeaderboardEntriesByTier =
  (tierName: string | null) => (state: RootState) =>
    tierName && state.rewards.ondoCampaignLeaderboard?.tiers[tierName]
      ? state.rewards.ondoCampaignLeaderboard.tiers[tierName].entries
      : EMPTY_ENTRIES;

export const selectOndoCampaignLeaderboardTotalParticipantsByTier =
  (tierName: string | null) => (state: RootState) =>
    tierName && state.rewards.ondoCampaignLeaderboard?.tiers[tierName]
      ? state.rewards.ondoCampaignLeaderboard.tiers[tierName].totalParticipants
      : 0;

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
          `${subscriptionId}:${campaignId}`
        ] ?? null)
      : null;

export const selectOndoCampaignPortfolio = (state: RootState) =>
  state.rewards.ondoCampaignPortfolio;

export const selectOndoCampaignPortfolioById =
  (subscriptionId: string | undefined, campaignId: string | undefined) =>
  (state: RootState) =>
    subscriptionId && campaignId && state.rewards.ondoCampaignPortfolio
      ? (state.rewards.ondoCampaignPortfolio[
          `${subscriptionId}:${campaignId}`
        ] ?? null)
      : null;

export const selectOndoCampaignActivityById =
  (subscriptionId: string | undefined, campaignId: string | undefined) =>
  (state: RootState) =>
    subscriptionId && campaignId && state.rewards.ondoCampaignActivity
      ? (state.rewards.ondoCampaignActivity[
          `${subscriptionId}:${campaignId}`
        ] ?? null)
      : null;
