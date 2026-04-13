import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';
import {
  SeasonStatusState,
  SeasonTierDto,
  GeoRewardsMetadata,
  PointsBoostDto,
  RewardDto,
  PointsEventDto,
  SeasonActivityTypeDto,
  SubscriptionBenefitDto,
  SeasonWayToEarnDto,
  CampaignDto,
  CampaignParticipantStatusDto,
  CampaignLeaderboardDto,
  CampaignLeaderboardPositionDto,
  SubscriptionBenefitsState,
  OndoGmPortfolioDto,
  OndoGmActivityEntryDto,
  OndoGmCampaignDepositsDto,
} from '../../core/Engine/controllers/rewards-controller/types';
import { OnboardingStep } from './types';
import { AccountGroupId } from '@metamask/account-api';

// Saga action types - defined here to avoid circular dependency with saga file
export const BULK_LINK_START = 'rewards/bulkLink/START';
export const BULK_LINK_CANCEL = 'rewards/bulkLink/CANCEL';
export const BULK_LINK_RESUME = 'rewards/bulkLink/RESUME';

export interface AccountOptInBannerInfoStatus {
  accountGroupId: AccountGroupId;
  hide: boolean;
}

/**
 * State for tracking bulk link progress across all accounts
 */
export interface BulkLinkState {
  /** Whether the bulk link process is currently running */
  isRunning: boolean;
  /** Total number of accounts to link */
  totalAccounts: number;
  /** Number of accounts linked so far */
  linkedAccounts: number;
  /** Number of accounts that failed to link */
  failedAccounts: number;
  /**
   * Whether the bulk link process was interrupted (e.g., app closed during processing).
   * This flag is set on rehydrate if isRunning was true, indicating the user
   * can resume the process when they re-enter the rewards feature.
   */
  wasInterrupted: boolean;
  /**
   * The subscription ID captured when bulk link started.
   * Used to detect subscription changes on resume - if the current subscription
   * differs from this stored value, the resume should be aborted to prevent
   * linking accounts to different subscriptions.
   */
  initialSubscriptionId: string | null;
}

export interface RewardsState {
  activeTab: 'overview' | 'campaigns' | 'activity';
  seasonStatusLoading: boolean;
  seasonStatusError: string | null;

  // Season state
  seasonId: string | null;
  seasonName: string | null;
  seasonStartDate: Date | null;
  seasonEndDate: Date | null;
  seasonTiers: SeasonTierDto[];
  seasonActivityTypes: SeasonActivityTypeDto[];
  seasonWaysToEarn: SeasonWayToEarnDto[];
  seasonShouldInstallNewVersion: string | null;

  // Subscription Referral state
  referralDetailsLoading: boolean;
  referralDetailsError: boolean;
  referralCode: string | null;
  refereeCount: number;
  referredByCode: string | null;

  // Season tier state
  currentTier: SeasonTierDto | null;
  nextTier: SeasonTierDto | null;
  nextTierPointsNeeded: number | null;

  // Season Balance state
  balanceTotal: number | null;
  balanceRefereePortion: number | null;
  balanceUpdatedAt: Date | null;

  // Onboarding state
  onboardingActiveStep: OnboardingStep;
  onboardingReferralCode: string | null;

  // Candidate subscription state
  candidateSubscriptionId: string | 'pending' | 'error' | 'retry' | null;

  // Geolocation state
  geoLocation: string | null;
  optinAllowedForGeo: boolean | null;
  optinAllowedForGeoLoading: boolean;
  optinAllowedForGeoError: boolean;

  // UI preferences
  hideCurrentAccountNotOptedInBanner: AccountOptInBannerInfoStatus[];
  hideUnlinkedAccountsBanner: boolean;

  // Points Boost state
  activeBoosts: PointsBoostDto[] | null;
  activeBoostsLoading: boolean;
  activeBoostsError: boolean;

  // Points Events state
  pointsEvents: PointsEventDto[] | null;

  // Unlocked Rewards state
  unlockedRewards: RewardDto[] | null;
  unlockedRewardLoading: boolean;
  unlockedRewardError: boolean;

  // Bulk link state (for linking all account groups across all wallets)
  bulkLink: BulkLinkState;

  // Benefits state
  benefits: SubscriptionBenefitDto[];
  benefitsLoading: boolean;
  benefitsError: boolean;

  // Campaigns state
  campaigns: CampaignDto[];
  campaignsLoading: boolean;
  campaignsError: boolean;
  campaignsHasLoaded: boolean;

  // Campaign participant status (keyed by campaignId)
  campaignParticipantStatuses: Record<string, CampaignParticipantStatusDto>;

  // Version guard state
  versionGuardMinimumMobileVersion: string | null;
  versionGuardLoading: boolean;
  versionGuardError: boolean;

  // Campaign leaderboard (keyed by campaignId)
  ondoCampaignLeaderboard: CampaignLeaderboardDto | null;
  ondoCampaignLeaderboardLoading: boolean;
  ondoCampaignLeaderboardError: boolean;
  // Currently selected tier for leaderboard display
  ondoCampaignLeaderboardSelectedTier: string | null;

  // Campaign leaderboard position (user's position, keyed by composite key `${subscriptionId}:${campaignId}`)
  ondoCampaignLeaderboardPositions: Record<
    string,
    CampaignLeaderboardPositionDto
  >;

  // Ondo GM portfolio (keyed by composite key `${subscriptionId}:${campaignId}`)
  ondoCampaignPortfolio: Record<string, OndoGmPortfolioDto>;

  // Ondo GM activity (keyed by composite key `${subscriptionId}:${campaignId}`)
  ondoCampaignActivity: Record<string, OndoGmActivityEntryDto[] | null>;

  // Ondo campaign deposits (public, campaign-wide total)
  ondoCampaignDeposits: OndoGmCampaignDepositsDto | null;
  ondoCampaignDepositsLoading: boolean;
  ondoCampaignDepositsError: boolean;
}

export const initialState: RewardsState = {
  activeTab: 'overview',
  seasonStatusLoading: false,
  seasonStatusError: null,

  seasonId: null,
  seasonName: null,
  seasonStartDate: null,
  seasonEndDate: null,
  seasonTiers: [],
  seasonActivityTypes: [],
  seasonWaysToEarn: [],

  referralDetailsLoading: false,
  referralDetailsError: false,
  referralCode: null,
  refereeCount: 0,
  referredByCode: null,

  currentTier: null,
  nextTier: null,
  nextTierPointsNeeded: null,

  balanceTotal: 0,
  balanceRefereePortion: 0,
  balanceUpdatedAt: null,

  // Should install new version state
  seasonShouldInstallNewVersion: null,

  onboardingActiveStep: OnboardingStep.INTRO,
  onboardingReferralCode: null,
  candidateSubscriptionId: 'pending',
  geoLocation: null,
  optinAllowedForGeo: null,
  optinAllowedForGeoLoading: false,
  optinAllowedForGeoError: false,
  hideUnlinkedAccountsBanner: false,
  hideCurrentAccountNotOptedInBanner: [],

  activeBoosts: null,
  activeBoostsLoading: false,
  activeBoostsError: false,

  pointsEvents: null,

  unlockedRewards: null,
  unlockedRewardLoading: false,
  unlockedRewardError: false,

  // Bulk link initial state
  bulkLink: {
    isRunning: false,
    totalAccounts: 0,
    linkedAccounts: 0,
    failedAccounts: 0,
    wasInterrupted: false,
    initialSubscriptionId: null,
  },

  // Benefits initial state
  benefits: [],
  benefitsLoading: false,
  benefitsError: false,

  // Campaigns initial state
  campaigns: [],
  campaignsLoading: false,
  campaignsError: false,
  campaignsHasLoaded: false,

  // Campaign participant statuses initial state
  campaignParticipantStatuses: {},

  // Version guard initial state
  versionGuardMinimumMobileVersion: null,
  versionGuardLoading: false,
  versionGuardError: false,

  // Campaign leaderboard initial state
  ondoCampaignLeaderboard: null,
  ondoCampaignLeaderboardLoading: false,
  ondoCampaignLeaderboardError: false,
  ondoCampaignLeaderboardSelectedTier: null,

  // Campaign leaderboard position initial state
  ondoCampaignLeaderboardPositions: {},

  // Ondo GM portfolio initial state
  ondoCampaignPortfolio: {},

  // Ondo GM activity initial state
  ondoCampaignActivity: {},

  // Ondo campaign deposits initial state
  ondoCampaignDeposits: null,
  ondoCampaignDepositsLoading: false,
  ondoCampaignDepositsError: false,
};

interface RehydrateAction extends Action<'persist/REHYDRATE'> {
  payload?: {
    rewards?: RewardsState;
  };
}

const rewardsSlice = createSlice({
  name: 'rewards',
  initialState,
  reducers: {
    setActiveTab: (
      state,
      action: PayloadAction<'overview' | 'campaigns' | 'activity'>,
    ) => {
      state.activeTab = action.payload;
    },

    setSeasonStatus: (
      state,
      action: PayloadAction<SeasonStatusState | null>,
    ) => {
      // Clear error on successful data fetch
      state.seasonStatusError = null;

      // Season state
      state.seasonId = action.payload?.season.id || null;
      state.seasonName = action.payload?.season.name || null;
      state.seasonStartDate = action.payload?.season.startDate
        ? new Date(action.payload.season.startDate)
        : null;
      state.seasonEndDate = action.payload?.season.endDate
        ? new Date(action.payload.season.endDate)
        : null;
      state.seasonTiers = action.payload?.season.tiers || [];
      state.seasonActivityTypes = action.payload?.season.activityTypes || [];
      state.seasonWaysToEarn = action.payload?.season.waysToEarn || [];
      state.seasonShouldInstallNewVersion =
        action.payload?.season?.shouldInstallNewVersion || null;

      // Season Balance state
      state.balanceTotal =
        action.payload?.balance &&
        typeof action.payload.balance.total === 'number'
          ? action.payload.balance.total
          : null;
      state.balanceUpdatedAt = action.payload?.balance?.updatedAt
        ? new Date(action.payload.balance.updatedAt)
        : null;

      // Season tier state
      state.currentTier = action.payload?.tier?.currentTier || null;
      state.nextTier = action.payload?.tier?.nextTier || null;
      state.nextTierPointsNeeded =
        action.payload?.tier?.nextTierPointsNeeded || null;
    },

    setReferralDetails: (
      state,
      action: PayloadAction<{
        referralCode?: string;
        refereeCount?: number;
        referredByCode?: string;
        referralPoints?: number;
      }>,
    ) => {
      if (action.payload.referralCode !== undefined) {
        state.referralCode = action.payload.referralCode;
      }
      if (action.payload.refereeCount !== undefined) {
        state.refereeCount = action.payload.refereeCount;
      }
      if (action.payload.referredByCode !== undefined) {
        state.referredByCode = action.payload.referredByCode;
      }
      if (action.payload.referralPoints !== undefined) {
        state.balanceRefereePortion = action.payload.referralPoints;
      }
      state.referralDetailsLoading = false;
    },

    setReferralDetailsLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.referralCode) {
        return;
      }
      state.referralDetailsLoading = action.payload;
    },

    setReferralDetailsError: (state, action: PayloadAction<boolean>) => {
      state.referralDetailsError = action.payload;
    },

    setSeasonStatusLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.seasonStartDate) {
        return;
      }
      state.seasonStatusLoading = action.payload;
    },

    setSeasonStatusError: (state, action: PayloadAction<string | null>) => {
      state.seasonStatusError = action.payload;
    },

    resetRewardsState: (state) => {
      Object.assign(state, initialState);
      // Explicitly clear leaderboard state (also covered by initialState above)
      state.ondoCampaignLeaderboard = null;
      state.ondoCampaignLeaderboardSelectedTier = null;
      state.ondoCampaignLeaderboardPositions = {};
      state.ondoCampaignPortfolio = {};
      state.ondoCampaignActivity = {};
      state.ondoCampaignDeposits = null;
      state.ondoCampaignDepositsLoading = false;
      state.ondoCampaignDepositsError = false;
    },

    setOnboardingActiveStep: (state, action: PayloadAction<OnboardingStep>) => {
      state.onboardingActiveStep = action.payload;
    },

    resetOnboarding: (state) => {
      state.onboardingActiveStep = OnboardingStep.INTRO;
      state.onboardingReferralCode = null;
    },

    setOnboardingReferralCode: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.onboardingReferralCode = action.payload;
    },

    setCandidateSubscriptionId: (
      state,
      action: PayloadAction<string | 'pending' | 'error' | 'retry' | null>,
    ) => {
      const previousCandidateId = state.candidateSubscriptionId;
      const newCandidateId = action.payload;

      // Check if candidate ID changed and old value had a value (not null, 'pending', 'error', or 'retry')
      const hasValidPreviousId =
        previousCandidateId &&
        previousCandidateId !== 'pending' &&
        previousCandidateId !== 'error' &&
        previousCandidateId !== 'retry';

      const candidateIdChanged =
        hasValidPreviousId && previousCandidateId !== newCandidateId;

      if (candidateIdChanged) {
        // Reset all state to initial, preserving only non-subscription-scoped fields
        Object.assign(state, initialState, {
          activeTab: state.activeTab,
          onboardingActiveStep: state.onboardingActiveStep,
          onboardingReferralCode: state.onboardingReferralCode,
          geoLocation: state.geoLocation,
          optinAllowedForGeo: state.optinAllowedForGeo,
          optinAllowedForGeoLoading: state.optinAllowedForGeoLoading,
          optinAllowedForGeoError: state.optinAllowedForGeoError,
          hideCurrentAccountNotOptedInBanner:
            state.hideCurrentAccountNotOptedInBanner,
          hideUnlinkedAccountsBanner: state.hideUnlinkedAccountsBanner,
          bulkLink: state.bulkLink,
          versionGuardMinimumMobileVersion:
            state.versionGuardMinimumMobileVersion,
          versionGuardLoading: state.versionGuardLoading,
          versionGuardError: state.versionGuardError,
        });
      }

      state.candidateSubscriptionId = action.payload;
    },

    setGeoRewardsMetadata: (
      state,
      action: PayloadAction<GeoRewardsMetadata | null>,
    ) => {
      if (action.payload) {
        state.geoLocation = action.payload.geoLocation;
        state.optinAllowedForGeo = action.payload.optinAllowedForGeo;
        state.optinAllowedForGeoLoading = false;
      } else {
        state.geoLocation = null;
        state.optinAllowedForGeo = null;
        state.optinAllowedForGeoLoading = false;
      }
    },

    setGeoRewardsMetadataLoading: (state, action: PayloadAction<boolean>) => {
      state.optinAllowedForGeoLoading = action.payload;
    },

    setGeoRewardsMetadataError: (state, action: PayloadAction<boolean>) => {
      state.optinAllowedForGeoError = action.payload;
    },

    setHideUnlinkedAccountsBanner: (state, action: PayloadAction<boolean>) => {
      state.hideUnlinkedAccountsBanner = action.payload;
    },

    setHideCurrentAccountNotOptedInBanner: (
      state,
      action: PayloadAction<{ accountGroupId: AccountGroupId; hide: boolean }>,
    ) => {
      const existingIndex = state.hideCurrentAccountNotOptedInBanner.findIndex(
        (item) => item.accountGroupId === action.payload.accountGroupId,
      );

      if (existingIndex !== -1) {
        // Update existing entry
        state.hideCurrentAccountNotOptedInBanner[existingIndex].hide =
          action.payload.hide;
      } else {
        // Add new entry
        state.hideCurrentAccountNotOptedInBanner.push({
          accountGroupId: action.payload.accountGroupId,
          hide: action.payload.hide,
        });
      }
    },

    setActiveBoosts: (
      state,
      action: PayloadAction<PointsBoostDto[] | null>,
    ) => {
      state.activeBoosts = action.payload;
      state.activeBoostsError = false; // Reset error when successful
    },
    setActiveBoostsLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.activeBoosts?.length) {
        return;
      }
      state.activeBoostsLoading = action.payload;
    },
    setActiveBoostsError: (state, action: PayloadAction<boolean>) => {
      state.activeBoostsError = action.payload;
    },
    setUnlockedRewards: (state, action: PayloadAction<RewardDto[] | null>) => {
      state.unlockedRewards = action.payload;
      state.unlockedRewardError = false; // Reset error when successful
    },
    setUnlockedRewardLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.unlockedRewards?.length) {
        return;
      }
      state.unlockedRewardLoading = action.payload;
    },
    setUnlockedRewardError: (state, action: PayloadAction<boolean>) => {
      state.unlockedRewardError = action.payload;
    },
    setPointsEvents: (
      state,
      action: PayloadAction<PointsEventDto[] | null>,
    ) => {
      state.pointsEvents = action.payload;
    },

    // Campaigns reducers
    setCampaigns: (state, action: PayloadAction<CampaignDto[]>) => {
      state.campaigns = action.payload;
      state.campaignsError = false;
      state.campaignsHasLoaded = true;
    },
    setCampaignsLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.campaigns.length) {
        return;
      }
      state.campaignsLoading = action.payload;
    },
    setCampaignsError: (state, action: PayloadAction<boolean>) => {
      state.campaignsError = action.payload;
      if (action.payload) {
        state.campaignsHasLoaded = true;
      }
    },

    setCampaignParticipantStatus: (
      state,
      action: PayloadAction<{
        campaignId: string;
        status: CampaignParticipantStatusDto;
      }>,
    ) => {
      state.campaignParticipantStatuses[action.payload.campaignId] =
        action.payload.status;
    },

    // Version guard reducers
    setVersionGuardMinimumMobileVersion: (
      state,
      action: PayloadAction<string | null>,
    ) => {
      state.versionGuardMinimumMobileVersion = action.payload;
    },
    setVersionGuardLoading: (state, action: PayloadAction<boolean>) => {
      state.versionGuardLoading = action.payload;
    },
    setVersionGuardError: (state, action: PayloadAction<boolean>) => {
      state.versionGuardError = action.payload;
    },

    // Campaign leaderboard reducers
    setOndoCampaignLeaderboard: (
      state,
      action: PayloadAction<CampaignLeaderboardDto | null>,
    ) => {
      state.ondoCampaignLeaderboard = action.payload;
      state.ondoCampaignLeaderboardError = false;
      // Set the first tier as selected if not already set, or if the current
      // selection no longer exists in the incoming data (e.g. different campaign)
      if (action.payload) {
        const tierNames = Object.keys(action.payload.tiers);
        if (
          tierNames.length > 0 &&
          (!state.ondoCampaignLeaderboardSelectedTier ||
            !tierNames.includes(state.ondoCampaignLeaderboardSelectedTier))
        ) {
          state.ondoCampaignLeaderboardSelectedTier = tierNames[0];
        }
      }
    },
    setOndoCampaignLeaderboardLoading: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      if (action.payload && state.ondoCampaignLeaderboard) {
        return;
      }
      state.ondoCampaignLeaderboardLoading = action.payload;
    },
    setOndoCampaignLeaderboardError: (
      state,
      action: PayloadAction<boolean>,
    ) => {
      state.ondoCampaignLeaderboardError = action.payload;
    },
    setOndoCampaignLeaderboardSelectedTier: (
      state,
      action: PayloadAction<string>,
    ) => {
      state.ondoCampaignLeaderboardSelectedTier = action.payload;
    },

    // Campaign leaderboard position reducers
    setOndoCampaignLeaderboardPosition: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        campaignId: string;
        position: CampaignLeaderboardPositionDto | null;
      }>,
    ) => {
      const key = `${action.payload.subscriptionId}:${action.payload.campaignId}`;
      if (action.payload.position) {
        state.ondoCampaignLeaderboardPositions[key] = action.payload.position;
      } else {
        delete state.ondoCampaignLeaderboardPositions[key];
      }
    },

    setOndoCampaignPortfolioPosition: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        campaignId: string;
        portfolio: OndoGmPortfolioDto | null;
      }>,
    ) => {
      const key = `${action.payload.subscriptionId}:${action.payload.campaignId}`;
      if (action.payload.portfolio) {
        state.ondoCampaignPortfolio[key] = action.payload.portfolio;
      } else {
        delete state.ondoCampaignPortfolio[key];
      }
    },

    setBenefits: (state, action: PayloadAction<SubscriptionBenefitsState>) => {
      state.benefits = action.payload.benefits;
    },

    setBenefitsLoading: (state, action: PayloadAction<boolean>) => {
      state.benefitsLoading = action.payload;
    },

    setBenefitsError: (state, action: PayloadAction<boolean>) => {
      state.benefitsError = action.payload;
    },

    setOndoCampaignActivity: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        campaignId: string;
        entries: OndoGmActivityEntryDto[] | null;
      }>,
    ) => {
      const key = `${action.payload.subscriptionId}:${action.payload.campaignId}`;
      state.ondoCampaignActivity[key] = action.payload.entries;
    },

    // Campaign deposits reducers
    setOndoCampaignDeposits: (
      state,
      action: PayloadAction<OndoGmCampaignDepositsDto | null>,
    ) => {
      state.ondoCampaignDeposits = action.payload;
      state.ondoCampaignDepositsError = false;
    },
    setOndoCampaignDepositsLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.ondoCampaignDeposits) {
        return;
      }
      state.ondoCampaignDepositsLoading = action.payload;
    },
    setOndoCampaignDepositsError: (state, action: PayloadAction<boolean>) => {
      state.ondoCampaignDepositsError = action.payload;
    },

    // Bulk link reducers
    bulkLinkStarted: (
      state,
      action: PayloadAction<{
        totalAccounts: number;
        subscriptionId: string;
      }>,
    ) => {
      state.bulkLink = {
        isRunning: true,
        totalAccounts: action.payload.totalAccounts,
        linkedAccounts: 0,
        failedAccounts: 0,
        wasInterrupted: false,
        initialSubscriptionId: action.payload.subscriptionId,
      };
    },
    bulkLinkAccountResult: (
      state,
      action: PayloadAction<{
        success: boolean;
      }>,
    ) => {
      if (action.payload.success) {
        state.bulkLink.linkedAccounts += 1;
      } else {
        state.bulkLink.failedAccounts += 1;
      }
    },
    bulkLinkCompleted: (state) => {
      state.bulkLink.isRunning = false;
      state.bulkLink.wasInterrupted = false;
    },
    bulkLinkCancelled: (state) => {
      state.bulkLink.isRunning = false;
      state.bulkLink.wasInterrupted = false;
    },
    /**
     * Called when the bulk link process is cancelled because the candidate
     * subscription ID changed during processing. This prevents accounts from
     * being linked to different subscriptions.
     */
    bulkLinkSubscriptionChanged: (state) => {
      state.bulkLink.isRunning = false;
      state.bulkLink.wasInterrupted = false;
      state.bulkLink.initialSubscriptionId = null;
    },
    bulkLinkReset: (state) => {
      state.bulkLink = initialState.bulkLink;
    },
    /**
     * Called when resuming a previously interrupted bulk link process.
     * Clears the interrupted flag and sets running to true.
     * The saga will re-fetch opt-in status to determine which accounts still need linking.
     */
    bulkLinkResumed: (state) => {
      state.bulkLink.isRunning = true;
      state.bulkLink.wasInterrupted = false;
      // Note: We don't reset counts here - the saga will recalculate based on current opt-in status
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle BULK_LINK_CANCEL directly so state is reset even if no saga is running
      .addCase(BULK_LINK_CANCEL, (state) => {
        state.bulkLink.isRunning = false;
        state.bulkLink.wasInterrupted = false;
      })
      .addCase(
        'persist/REHYDRATE',
        (state, action: RehydrateAction): RewardsState | void => {
          if (action.payload?.rewards) {
            // Detect if bulk link was interrupted (app closed while running)
            const previousBulkLink = action.payload.rewards.bulkLink;
            const wasInterrupted = previousBulkLink?.isRunning === true;

            return {
              // Reset non-persistent state (state is persisted via controller)
              ...initialState,

              // UI state we want to restore from previous visit
              seasonId: action.payload.rewards.seasonId,
              seasonName: action.payload.rewards.seasonName,
              seasonStartDate: action.payload.rewards.seasonStartDate,
              seasonEndDate: action.payload.rewards.seasonEndDate,
              seasonTiers: action.payload.rewards.seasonTiers,
              seasonActivityTypes: action.payload.rewards.seasonActivityTypes,
              seasonWaysToEarn: action.payload.rewards.seasonWaysToEarn,
              seasonShouldInstallNewVersion:
                action.payload.rewards.seasonShouldInstallNewVersion,
              referralCode: action.payload.rewards.referralCode,
              refereeCount: action.payload.rewards.refereeCount,
              currentTier: action.payload.rewards.currentTier,
              nextTier: action.payload.rewards.nextTier,
              nextTierPointsNeeded: action.payload.rewards.nextTierPointsNeeded,
              balanceTotal: action.payload.rewards.balanceTotal,
              balanceRefereePortion:
                action.payload.rewards.balanceRefereePortion,
              balanceUpdatedAt: action.payload.rewards.balanceUpdatedAt,
              activeBoosts: action.payload.rewards.activeBoosts,
              pointsEvents: action.payload.rewards.pointsEvents,
              unlockedRewards: action.payload.rewards.unlockedRewards,
              campaigns: action.payload.rewards.campaigns,
              campaignParticipantStatuses:
                action.payload.rewards.campaignParticipantStatuses ?? {},
              ondoCampaignLeaderboardPositions:
                action.payload.rewards.ondoCampaignLeaderboardPositions ?? {},
              ondoCampaignPortfolio:
                action.payload.rewards.ondoCampaignPortfolio ?? {},
              ondoCampaignActivity:
                action.payload.rewards.ondoCampaignActivity ?? {},
              hideUnlinkedAccountsBanner:
                action.payload.rewards.hideUnlinkedAccountsBanner,
              hideCurrentAccountNotOptedInBanner:
                action.payload.rewards.hideCurrentAccountNotOptedInBanner,

              // Bulk link state - preserve interrupted status for resume capability
              bulkLink: {
                ...initialState.bulkLink,
                wasInterrupted,
                // Preserve previous progress for UI display (how many were done before interruption)
                linkedAccounts: wasInterrupted
                  ? (previousBulkLink?.linkedAccounts ?? 0)
                  : 0,
                failedAccounts: wasInterrupted
                  ? (previousBulkLink?.failedAccounts ?? 0)
                  : 0,
                // Preserve subscription ID for resume validation
                initialSubscriptionId: wasInterrupted
                  ? (previousBulkLink?.initialSubscriptionId ?? null)
                  : null,
              },
            } as RewardsState;
          }
          return state as unknown as RewardsState;
        },
      );
  },
});

export const {
  setActiveTab,
  setSeasonStatus,
  setReferralDetails,
  setReferralDetailsError,
  setSeasonStatusLoading,
  setSeasonStatusError,
  setReferralDetailsLoading,
  resetRewardsState,
  setOnboardingActiveStep,
  resetOnboarding,
  setOnboardingReferralCode,
  setCandidateSubscriptionId,
  setGeoRewardsMetadata,
  setGeoRewardsMetadataLoading,
  setGeoRewardsMetadataError,
  setHideUnlinkedAccountsBanner,
  setHideCurrentAccountNotOptedInBanner,
  setActiveBoosts,
  setActiveBoostsLoading,
  setActiveBoostsError,
  setUnlockedRewards,
  setUnlockedRewardLoading,
  setUnlockedRewardError,
  setPointsEvents,
  // Benefits actions
  setBenefits,
  setBenefitsError,
  setBenefitsLoading,
  // Campaigns actions
  setCampaigns,
  setCampaignsLoading,
  setCampaignsError,
  setCampaignParticipantStatus,
  // Version guard actions
  setVersionGuardMinimumMobileVersion,
  setVersionGuardLoading,
  setVersionGuardError,
  // Campaign leaderboard actions
  setOndoCampaignLeaderboard,
  setOndoCampaignLeaderboardLoading,
  setOndoCampaignLeaderboardError,
  setOndoCampaignLeaderboardSelectedTier,
  setOndoCampaignLeaderboardPosition,
  setOndoCampaignPortfolioPosition,
  setOndoCampaignActivity,
  // Campaign deposits actions
  setOndoCampaignDeposits,
  setOndoCampaignDepositsLoading,
  setOndoCampaignDepositsError,
  // Bulk link actions
  bulkLinkStarted,
  bulkLinkAccountResult,
  bulkLinkCompleted,
  bulkLinkCancelled,
  bulkLinkSubscriptionChanged,
  bulkLinkReset,
  bulkLinkResumed,
} = rewardsSlice.actions;

export default rewardsSlice.reducer;
