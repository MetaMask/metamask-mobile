import { RootState } from '..';
import { RewardsTab, OnboardingStep } from './types';
import {
  CampaignType,
  OndoHoldingDetails,
  OndoCampaignHowItWorks,
  OndoCampaignNotes,
} from '../../core/Engine/controllers/rewards-controller/types';
import { strings } from '../../../locales/i18n';

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

// Campaigns selectors
export const selectCampaigns = (state: RootState) => state.rewards.campaigns;

export const selectCampaignsLoading = (state: RootState) =>
  state.rewards.campaignsLoading;

export const selectCampaignsError = (state: RootState) =>
  state.rewards.campaignsError;

// Campaign participant status selectors
export const selectCampaignParticipantStatuses = (state: RootState) =>
  state.rewards.campaignParticipantStatuses;

export const selectCampaignParticipantStatusById =
  (campaignId: string | undefined) => (state: RootState) =>
    campaignId
      ? (state.rewards.campaignParticipantStatuses[campaignId] ?? null)
      : null;

export const selectCampaignParticipantCount =
  (campaignId: string | undefined) => (state: RootState) =>
    campaignId
      ? (state.rewards.campaignParticipantStatuses[campaignId]
          ?.participantCount ?? null)
      : null;

// Campaign leaderboard selectors
export const selectCampaignLeaderboardById =
  (campaignId: string | undefined) => (state: RootState) =>
    campaignId
      ? (state.rewards.campaignLeaderboards[campaignId] ?? null)
      : null;

export const selectCampaignLeaderboardLoadingById =
  (campaignId: string | undefined) => (state: RootState) =>
    campaignId
      ? (state.rewards.campaignLeaderboardsLoading[campaignId] ?? false)
      : false;

// --- Ondo holding UI selectors ---

/** Returns a single campaign by id */
export const selectCampaignById = (campaignId: string) => (state: RootState) =>
  state.rewards.campaigns.find((c) => c.id === campaignId) ?? null;

/** Returns typed OndoHoldingDetails for a campaign, or null */
export const selectOndoHoldingDetailsByCampaignId =
  (campaignId: string) =>
  (state: RootState): OndoHoldingDetails | null => {
    const campaign = state.rewards.campaigns.find((c) => c.id === campaignId);
    return campaign?.details ?? null;
  };

/**
 * Returns days remaining until campaign end (0 if already ended).
 * Returns null if campaign not found.
 */
export const selectCampaignDaysLeft =
  (campaignId: string) =>
  (state: RootState): number | null => {
    const campaign = state.rewards.campaigns.find((c) => c.id === campaignId);
    if (!campaign) return null;
    const diff = new Date(campaign.endDate).getTime() - Date.now();
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
  };

/**
 * Returns campaign progress as a 0–1 float based on elapsed duration.
 * Returns null if campaign not found.
 */
export const selectCampaignProgress =
  (campaignId: string) =>
  (state: RootState): number | null => {
    const campaign = state.rewards.campaigns.find((c) => c.id === campaignId);
    if (!campaign) return null;
    const start = new Date(campaign.startDate).getTime();
    const end = new Date(campaign.endDate).getTime();
    const now = Date.now();
    if (end <= start) return 1;
    return Math.min(1, Math.max(0, (now - start) / (end - start)));
  };

/**
 * Returns a human-readable activity type label (e.g. "Hold" for ONDO_HOLDING).
 */
export const selectCampaignActivityType =
  (campaignId: string) =>
  (state: RootState): string | null => {
    const campaign = state.rewards.campaigns.find((c) => c.id === campaignId);
    if (!campaign) return null;
    switch (campaign.type) {
      case CampaignType.ONDO_HOLDING:
        return strings('rewards.campaign.activity_type_hold');
      default:
        return campaign.type;
    }
  };

/** Returns the howItWorks data for a campaign, or null */
export const selectCampaignHowItWorks =
  (campaignId: string) =>
  (state: RootState): OndoCampaignHowItWorks | null => {
    const campaign = state.rewards.campaigns.find((c) => c.id === campaignId);
    return campaign?.details?.howItWorks ?? null;
  };

/**
 * Returns the typed notes for a campaign's howItWorks, or null.
 * Narrows the free-form `Json` field to `OndoCampaignNotes` at the selector boundary.
 */
export const selectCampaignNotes =
  (campaignId: string) =>
  (state: RootState): OndoCampaignNotes | null => {
    const campaign = state.rewards.campaigns.find((c) => c.id === campaignId);
    const notes = campaign?.details?.howItWorks?.notes;
    if (
      notes &&
      typeof notes === 'object' &&
      !Array.isArray(notes) &&
      typeof (notes as Record<string, unknown>).title === 'string' &&
      typeof (notes as Record<string, unknown>).description === 'string' &&
      Array.isArray((notes as Record<string, unknown>).items)
    ) {
      return notes as unknown as OndoCampaignNotes;
    }
    return null;
  };

/**
 * Returns the current user's leaderboard rank and score for a campaign.
 * Matches by referral code. Returns null if not found or leaderboard not loaded.
 */
export const selectCampaignUserLeaderboardEntry =
  (campaignId: string) =>
  (state: RootState): { rank: number; totalScore: string } | null => {
    const leaderboard = state.rewards.campaignLeaderboards[campaignId];
    const referralCode = state.rewards.referralCode;
    if (!leaderboard || !referralCode) return null;
    const index = leaderboard.top20.findIndex(
      (entry) => entry.referralCode === referralCode,
    );
    if (index < 0) return null;
    return { rank: index + 1, totalScore: leaderboard.top20[index].totalScore };
  };
