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
  PerpsTradingCampaignLeaderboardDto,
  PerpsTradingCampaignLeaderboardPositionDto,
  PerpsTradingCampaignVolumeDto,
  PredictThePitchLeaderboardDto,
  PredictThePitchLeaderboardPositionDto,
  PredictThePitchPositionsDto,
  PredictThePitchPrizePoolDto,
  VipDashboardState,
  VipRefereeMeState,
  VipTransactionDto,
  VipTransactionType,
} from '../../core/Engine/controllers/rewards-controller/types';
import {
  buildCampaignOutcomeToastCompositeKey,
  buildSubscriptionCampaignCompositeKey,
  buildSubscriptionVipTransactionCompositeKey,
} from './compositeKeys';
import {
  type CampaignResourceCacheEntry,
  type OndoCampaignLeaderboardCacheEntry,
  getOrCreateCampaignResourceCacheEntry,
  getOrCreateOndoCampaignLeaderboardCacheEntry,
} from './campaignResourceState';
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

  // Subscription Referral state
  referralDetailsLoading: boolean;
  referralDetailsError: boolean;
  referralCode: string | null;
  refereeCount: number;
  referredByCode: string | null;
  isVipReferee: boolean;
  referredByVipCode: string | null;

  // Season tier state
  currentTier: SeasonTierDto | null;
  nextTier: SeasonTierDto | null;
  nextTierPointsNeeded: number | null;

  // Season Balance state
  balanceTotal: number | null;
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

  // VIP dashboard state (keyed by subscriptionId)
  vipDashboard: Record<string, VipDashboardState>;
  vipDashboardLoading: boolean;
  vipDashboardError: boolean;
  vipRefereeDashboard: Record<string, VipRefereeMeState>;
  vipRefereeDashboardLoading: boolean;
  vipRefereeDashboardError: boolean;
  vipSplashAccepted: Record<string, boolean>;
  vipRefereeSplashAccepted: Record<string, boolean>;
  // VIP transactions (keyed by `${subscriptionId}:${type}`)
  vipTransactions: Record<string, VipTransactionDto[] | null>;

  // Campaigns state
  campaigns: CampaignDto[];
  campaignsLoading: boolean;
  campaignsError: boolean;
  campaignsHasLoaded: boolean;

  // Campaign participant status (keyed by `${subscriptionId}:${campaignId}`)
  campaignParticipantStatuses: Record<string, CampaignParticipantStatusDto>;

  // Version guard state
  versionGuardMinimumMobileVersion: string | null;
  versionGuardLoading: boolean;
  versionGuardError: boolean;

  // Campaign leaderboard (keyed by campaignId)
  ondoCampaignLeaderboards: Record<string, OndoCampaignLeaderboardCacheEntry>;

  // Campaign leaderboard position (user's position, keyed by composite key `${subscriptionId}:${campaignId}`)
  ondoCampaignLeaderboardPositions: Record<
    string,
    CampaignLeaderboardPositionDto
  >;

  // Ondo GM portfolio (keyed by composite key `${subscriptionId}:${campaignId}`)
  ondoCampaignPortfolio: Record<string, OndoGmPortfolioDto>;

  // Ondo GM activity (keyed by composite key `${subscriptionId}:${campaignId}`)
  ondoCampaignActivity: Record<string, OndoGmActivityEntryDto[] | null>;

  // Ondo campaign deposits (public, keyed by campaignId)
  ondoCampaignDeposits: Record<
    string,
    CampaignResourceCacheEntry<OndoGmCampaignDepositsDto>
  >;

  // Perps Trading Campaign leaderboard (keyed by campaignId)
  perpsTradingCampaignLeaderboards: Record<
    string,
    CampaignResourceCacheEntry<PerpsTradingCampaignLeaderboardDto>
  >;

  // Perps Trading Campaign leaderboard position (user's own position)
  perpsTradingCampaignLeaderboardPositions: Record<
    string,
    PerpsTradingCampaignLeaderboardPositionDto
  >;

  // Perps Trading Campaign volume (keyed by campaignId)
  perpsTradingCampaignVolumes: Record<
    string,
    CampaignResourceCacheEntry<PerpsTradingCampaignVolumeDto>
  >;

  // Predict The Pitch leaderboard (keyed by campaignId)
  predictThePitchLeaderboards: Record<
    string,
    CampaignResourceCacheEntry<PredictThePitchLeaderboardDto>
  >;

  // Predict The Pitch leaderboard position (user's own position)
  predictThePitchLeaderboardPositions: Record<
    string,
    PredictThePitchLeaderboardPositionDto
  >;

  // Predict The Pitch portfolio positions
  predictThePitchPositions: Record<string, PredictThePitchPositionsDto>;

  // Predict The Pitch prize pool (keyed by campaignId)
  predictThePitchPrizePools: Record<
    string,
    CampaignResourceCacheEntry<PredictThePitchPrizePoolDto>
  >;

  // Pending deeplink navigation intent, stored in Redux so it survives the
  // UnmountOnBlur remount of RewardsHome when navigating from outside the tab.
  pendingDeeplink: PendingDeeplink | null;

  // Dismissed outcome toasts (keyed by `${campaignId}:${subscriptionId}:${variant}`)
  dismissedCampaignOutcomeToasts: Record<string, boolean>;

  // Subscribed campaign start reminders (keyed by `${subscriptionId}:${campaignId}`)
  subscribedCampaignReminders: Record<string, boolean>;
}

/**
 * Typed deeplink navigation parameters for the Rewards feature.
 * Stored in Redux so the intent is available when RewardsNavigator mounts.
 */
export interface PendingDeeplink {
  page?: 'campaigns' | 'musd' | 'benefits';
  campaign?: 'ondo' | 'season1' | 'perps-comp' | 'predict-the-pitch';
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
  isVipReferee: false,
  referredByVipCode: null,

  currentTier: null,
  nextTier: null,
  nextTierPointsNeeded: null,

  balanceTotal: 0,
  balanceUpdatedAt: null,

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

  // VIP dashboard initial state
  vipDashboard: {},
  vipDashboardLoading: false,
  vipDashboardError: false,
  vipRefereeDashboard: {},
  vipRefereeDashboardLoading: false,
  vipRefereeDashboardError: false,
  vipSplashAccepted: {},
  vipRefereeSplashAccepted: {},
  vipTransactions: {},

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
  ondoCampaignLeaderboards: {},

  // Campaign leaderboard position initial state
  ondoCampaignLeaderboardPositions: {},

  // Ondo GM portfolio initial state
  ondoCampaignPortfolio: {},

  // Ondo GM activity initial state
  ondoCampaignActivity: {},

  // Ondo campaign deposits initial state
  ondoCampaignDeposits: {},

  // Perps Trading Campaign initial state
  perpsTradingCampaignLeaderboards: {},
  perpsTradingCampaignLeaderboardPositions: {},
  perpsTradingCampaignVolumes: {},
  predictThePitchLeaderboards: {},
  predictThePitchLeaderboardPositions: {},
  predictThePitchPositions: {},
  predictThePitchPrizePools: {},

  pendingDeeplink: null,

  dismissedCampaignOutcomeToasts: {},

  subscribedCampaignReminders: {},
};

interface RehydrateAction extends Action<'persist/REHYDRATE'> {
  payload?: {
    rewards?: Partial<RewardsState>;
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
        isVipReferee?: boolean;
        referredByVipCode?: string | null;
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
      if (action.payload.isVipReferee !== undefined) {
        state.isVipReferee = action.payload.isVipReferee;
      }
      if (action.payload.referredByVipCode !== undefined) {
        state.referredByVipCode = action.payload.referredByVipCode;
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
      // Explicitly clear campaign-scoped state (also covered by initialState above)
      state.ondoCampaignLeaderboards = {};
      state.ondoCampaignLeaderboardPositions = {};
      state.ondoCampaignPortfolio = {};
      state.ondoCampaignActivity = {};
      state.ondoCampaignDeposits = {};
      state.perpsTradingCampaignLeaderboards = {};
      state.perpsTradingCampaignVolumes = {};
      state.predictThePitchLeaderboards = {};
      state.predictThePitchLeaderboardPositions = {};
      state.predictThePitchPositions = {};
      state.predictThePitchPrizePools = {};
      state.vipDashboard = {};
      state.vipDashboardLoading = false;
      state.vipDashboardError = false;
      state.vipRefereeDashboard = {};
      state.vipRefereeDashboardLoading = false;
      state.vipRefereeDashboardError = false;
      state.vipSplashAccepted = {};
      state.vipRefereeSplashAccepted = {};
      state.vipTransactions = {};
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
          dismissedCampaignOutcomeToasts: state.dismissedCampaignOutcomeToasts,
          subscribedCampaignReminders: state.subscribedCampaignReminders,
          vipSplashAccepted: state.vipSplashAccepted,
          vipRefereeSplashAccepted: state.vipRefereeSplashAccepted,
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
      Object.assign(state, {
        campaigns: action.payload,
        campaignsError: false,
        campaignsHasLoaded: true,
      });
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
        subscriptionId: string;
        campaignId: string;
        status: CampaignParticipantStatusDto;
      }>,
    ) => {
      const key = buildSubscriptionCampaignCompositeKey(
        action.payload.subscriptionId,
        action.payload.campaignId,
      );
      state.campaignParticipantStatuses[key] = action.payload.status;
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
      action: PayloadAction<{
        campaignId: string;
        leaderboard: CampaignLeaderboardDto | null;
      }>,
    ) => {
      const entry = getOrCreateOndoCampaignLeaderboardCacheEntry(
        state.ondoCampaignLeaderboards,
        action.payload.campaignId,
      );
      entry.data = action.payload.leaderboard;
      entry.error = false;
      if (action.payload.leaderboard) {
        const tierNames = Object.keys(action.payload.leaderboard.tiers);
        if (
          tierNames.length > 0 &&
          (!entry.selectedTier || !tierNames.includes(entry.selectedTier))
        ) {
          entry.selectedTier = tierNames[0];
        }
      }
    },
    setOndoCampaignLeaderboardLoading: (
      state,
      action: PayloadAction<{ campaignId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateOndoCampaignLeaderboardCacheEntry(
        state.ondoCampaignLeaderboards,
        action.payload.campaignId,
      );
      entry.loading = action.payload.loading;
    },
    setOndoCampaignLeaderboardError: (
      state,
      action: PayloadAction<{ campaignId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateOndoCampaignLeaderboardCacheEntry(
        state.ondoCampaignLeaderboards,
        action.payload.campaignId,
      );
      entry.error = action.payload.error;
      if (action.payload.error) {
        entry.data = null;
      }
    },
    setOndoCampaignLeaderboardSelectedTier: (
      state,
      action: PayloadAction<{ campaignId: string; tier: string }>,
    ) => {
      const entry = getOrCreateOndoCampaignLeaderboardCacheEntry(
        state.ondoCampaignLeaderboards,
        action.payload.campaignId,
      );
      entry.selectedTier = action.payload.tier;
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
      const key = buildSubscriptionCampaignCompositeKey(
        action.payload.subscriptionId,
        action.payload.campaignId,
      );
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
      const key = buildSubscriptionCampaignCompositeKey(
        action.payload.subscriptionId,
        action.payload.campaignId,
      );
      if (action.payload.portfolio) {
        state.ondoCampaignPortfolio[key] = action.payload.portfolio;
      } else {
        delete state.ondoCampaignPortfolio[key];
      }
    },

    setBenefits: (state, action: PayloadAction<SubscriptionBenefitsState>) => {
      state.benefits = action.payload.benefits ?? [];
    },

    setBenefitsLoading: (state, action: PayloadAction<boolean>) => {
      state.benefitsLoading = action.payload;
    },

    setBenefitsError: (state, action: PayloadAction<boolean>) => {
      state.benefitsError = action.payload;
    },

    setVipDashboard: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        dashboard: VipDashboardState | null;
      }>,
    ) => {
      if (action.payload.dashboard) {
        state.vipDashboard[action.payload.subscriptionId] =
          action.payload.dashboard;
      } else {
        delete state.vipDashboard[action.payload.subscriptionId];
      }
      state.vipDashboardError = false;
    },

    setVipDashboardLoading: (state, action: PayloadAction<boolean>) => {
      state.vipDashboardLoading = action.payload;
    },

    setVipDashboardError: (state, action: PayloadAction<boolean>) => {
      state.vipDashboardError = action.payload;
    },

    setVipRefereeDashboard: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        dashboard: VipRefereeMeState | null;
      }>,
    ) => {
      if (action.payload.dashboard) {
        state.vipRefereeDashboard[action.payload.subscriptionId] =
          action.payload.dashboard;
      } else {
        delete state.vipRefereeDashboard[action.payload.subscriptionId];
      }
      state.vipRefereeDashboardError = false;
    },

    setVipRefereeDashboardLoading: (state, action: PayloadAction<boolean>) => {
      state.vipRefereeDashboardLoading = action.payload;
    },

    setVipRefereeDashboardError: (state, action: PayloadAction<boolean>) => {
      state.vipRefereeDashboardError = action.payload;
    },

    acceptVipInvite: (
      state,
      action: PayloadAction<{ subscriptionId: string }>,
    ) => {
      state.vipSplashAccepted[action.payload.subscriptionId] = true;
    },

    acceptVipRefereeInvite: (
      state,
      action: PayloadAction<{ subscriptionId: string }>,
    ) => {
      state.vipRefereeSplashAccepted[action.payload.subscriptionId] = true;
    },

    setVipTransactions: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        type: VipTransactionType;
        transactions: VipTransactionDto[] | null;
      }>,
    ) => {
      const key = buildSubscriptionVipTransactionCompositeKey(
        action.payload.subscriptionId,
        action.payload.type,
      );
      state.vipTransactions[key] = action.payload.transactions;
    },

    setOndoCampaignActivity: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        campaignId: string;
        entries: OndoGmActivityEntryDto[] | null;
      }>,
    ) => {
      const key = buildSubscriptionCampaignCompositeKey(
        action.payload.subscriptionId,
        action.payload.campaignId,
      );
      state.ondoCampaignActivity[key] = action.payload.entries;
    },

    // Campaign deposits reducers
    setOndoCampaignDeposits: (
      state,
      action: PayloadAction<{
        campaignId: string;
        deposits: OndoGmCampaignDepositsDto | null;
      }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.ondoCampaignDeposits,
        action.payload.campaignId,
      );
      entry.data = action.payload.deposits;
      entry.error = false;
    },
    setOndoCampaignDepositsLoading: (
      state,
      action: PayloadAction<{ campaignId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.ondoCampaignDeposits,
        action.payload.campaignId,
      );
      entry.loading = action.payload.loading;
    },
    setOndoCampaignDepositsError: (
      state,
      action: PayloadAction<{ campaignId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.ondoCampaignDeposits,
        action.payload.campaignId,
      );
      entry.error = action.payload.error;
      if (action.payload.error) {
        entry.data = null;
      }
    },

    // Perps Trading Campaign leaderboard reducers
    setPerpsTradingCampaignLeaderboard: (
      state,
      action: PayloadAction<{
        campaignId: string;
        leaderboard: PerpsTradingCampaignLeaderboardDto | null;
      }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.perpsTradingCampaignLeaderboards,
        action.payload.campaignId,
      );
      entry.data = action.payload.leaderboard;
      entry.error = false;
    },
    setPerpsTradingCampaignLeaderboardLoading: (
      state,
      action: PayloadAction<{ campaignId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.perpsTradingCampaignLeaderboards,
        action.payload.campaignId,
      );
      entry.loading = action.payload.loading;
    },
    setPerpsTradingCampaignLeaderboardError: (
      state,
      action: PayloadAction<{ campaignId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.perpsTradingCampaignLeaderboards,
        action.payload.campaignId,
      );
      entry.error = action.payload.error;
      if (action.payload.error) {
        entry.data = null;
      }
    },

    // Perps Trading Campaign leaderboard position reducers
    setPerpsTradingCampaignLeaderboardPosition: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        campaignId: string;
        position: PerpsTradingCampaignLeaderboardPositionDto | null;
      }>,
    ) => {
      const key = buildSubscriptionCampaignCompositeKey(
        action.payload.subscriptionId,
        action.payload.campaignId,
      );
      if (action.payload.position) {
        state.perpsTradingCampaignLeaderboardPositions[key] =
          action.payload.position;
      } else {
        delete state.perpsTradingCampaignLeaderboardPositions[key];
      }
    },

    // Perps Trading Campaign volume reducers
    setPerpsTradingCampaignVolume: (
      state,
      action: PayloadAction<{
        campaignId: string;
        volume: PerpsTradingCampaignVolumeDto | null;
      }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.perpsTradingCampaignVolumes,
        action.payload.campaignId,
      );
      entry.data = action.payload.volume;
      entry.error = false;
    },
    setPerpsTradingCampaignVolumeLoading: (
      state,
      action: PayloadAction<{ campaignId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.perpsTradingCampaignVolumes,
        action.payload.campaignId,
      );
      entry.loading = action.payload.loading;
    },
    setPerpsTradingCampaignVolumeError: (
      state,
      action: PayloadAction<{ campaignId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.perpsTradingCampaignVolumes,
        action.payload.campaignId,
      );
      entry.error = action.payload.error;
      if (action.payload.error) {
        entry.data = null;
      }
    },

    // Predict The Pitch leaderboard reducers
    setPredictThePitchLeaderboard: (
      state,
      action: PayloadAction<{
        campaignId: string;
        leaderboard: PredictThePitchLeaderboardDto | null;
      }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.predictThePitchLeaderboards,
        action.payload.campaignId,
      );
      entry.data = action.payload.leaderboard;
      entry.error = false;
    },
    setPredictThePitchLeaderboardLoading: (
      state,
      action: PayloadAction<{ campaignId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.predictThePitchLeaderboards,
        action.payload.campaignId,
      );
      entry.loading = action.payload.loading;
    },
    setPredictThePitchLeaderboardError: (
      state,
      action: PayloadAction<{ campaignId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.predictThePitchLeaderboards,
        action.payload.campaignId,
      );
      entry.error = action.payload.error;
      if (action.payload.error) {
        entry.data = null;
      }
    },

    setPredictThePitchLeaderboardPosition: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        campaignId: string;
        position: PredictThePitchLeaderboardPositionDto | null;
      }>,
    ) => {
      const key = buildSubscriptionCampaignCompositeKey(
        action.payload.subscriptionId,
        action.payload.campaignId,
      );
      if (action.payload.position) {
        state.predictThePitchLeaderboardPositions[key] =
          action.payload.position;
      } else {
        delete state.predictThePitchLeaderboardPositions[key];
      }
    },

    setPredictThePitchPositions: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        campaignId: string;
        positions: PredictThePitchPositionsDto | null;
      }>,
    ) => {
      const key = buildSubscriptionCampaignCompositeKey(
        action.payload.subscriptionId,
        action.payload.campaignId,
      );
      if (action.payload.positions) {
        state.predictThePitchPositions[key] = action.payload.positions;
      } else {
        delete state.predictThePitchPositions[key];
      }
    },

    // Predict The Pitch prize pool reducers
    setPredictThePitchPrizePool: (
      state,
      action: PayloadAction<{
        campaignId: string;
        prizePool: PredictThePitchPrizePoolDto | null;
      }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.predictThePitchPrizePools,
        action.payload.campaignId,
      );
      entry.data = action.payload.prizePool;
      entry.error = false;
    },
    setPredictThePitchPrizePoolLoading: (
      state,
      action: PayloadAction<{ campaignId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.predictThePitchPrizePools,
        action.payload.campaignId,
      );
      entry.loading = action.payload.loading;
    },
    setPredictThePitchPrizePoolError: (
      state,
      action: PayloadAction<{ campaignId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.predictThePitchPrizePools,
        action.payload.campaignId,
      );
      entry.error = action.payload.error;
      if (action.payload.error) {
        entry.data = null;
      }
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
    setPendingDeeplink: (
      state,
      action: PayloadAction<PendingDeeplink | null>,
    ) => {
      state.pendingDeeplink = action.payload;
    },

    dismissCampaignOutcomeToast: (
      state,
      action: PayloadAction<{
        campaignId: string;
        subscriptionId: string;
        variant: 'winner' | 'non_winner';
      }>,
    ) => {
      const { campaignId, subscriptionId, variant } = action.payload;
      const key = buildCampaignOutcomeToastCompositeKey(
        campaignId,
        subscriptionId,
        variant,
      );
      state.dismissedCampaignOutcomeToasts[key] = true;
    },

    subscribeCampaignReminder: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        campaignId: string;
      }>,
    ) => {
      const key = buildSubscriptionCampaignCompositeKey(
        action.payload.subscriptionId,
        action.payload.campaignId,
      );
      state.subscribedCampaignReminders[key] = true;
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
              seasonTiers: action.payload.rewards.seasonTiers ?? [],
              seasonActivityTypes:
                action.payload.rewards.seasonActivityTypes ?? [],
              seasonWaysToEarn: action.payload.rewards.seasonWaysToEarn ?? [],
              referralCode: action.payload.rewards.referralCode,
              refereeCount: action.payload.rewards.refereeCount,
              currentTier: action.payload.rewards.currentTier,
              nextTier: action.payload.rewards.nextTier,
              nextTierPointsNeeded: action.payload.rewards.nextTierPointsNeeded,
              balanceTotal: action.payload.rewards.balanceTotal,
              balanceUpdatedAt: action.payload.rewards.balanceUpdatedAt,
              activeBoosts: action.payload.rewards.activeBoosts,
              pointsEvents: action.payload.rewards.pointsEvents,
              unlockedRewards: action.payload.rewards.unlockedRewards,
              campaigns: action.payload.rewards.campaigns ?? [],
              vipDashboard: action.payload.rewards.vipDashboard ?? {},
              vipRefereeDashboard:
                action.payload.rewards.vipRefereeDashboard ?? {},
              vipSplashAccepted: action.payload.rewards.vipSplashAccepted ?? {},
              vipRefereeSplashAccepted:
                action.payload.rewards.vipRefereeSplashAccepted ?? {},
              vipTransactions: action.payload.rewards.vipTransactions ?? {},
              campaignParticipantStatuses:
                action.payload.rewards.campaignParticipantStatuses ?? {},
              ondoCampaignLeaderboardPositions:
                action.payload.rewards.ondoCampaignLeaderboardPositions ?? {},
              ondoCampaignPortfolio:
                action.payload.rewards.ondoCampaignPortfolio ?? {},
              ondoCampaignActivity:
                action.payload.rewards.ondoCampaignActivity ?? {},
              predictThePitchLeaderboardPositions:
                action.payload.rewards.predictThePitchLeaderboardPositions ??
                {},
              predictThePitchPositions:
                action.payload.rewards.predictThePitchPositions ?? {},
              hideUnlinkedAccountsBanner:
                action.payload.rewards.hideUnlinkedAccountsBanner,
              hideCurrentAccountNotOptedInBanner:
                action.payload.rewards.hideCurrentAccountNotOptedInBanner,

              dismissedCampaignOutcomeToasts:
                action.payload.rewards.dismissedCampaignOutcomeToasts ?? {},

              subscribedCampaignReminders:
                action.payload.rewards.subscribedCampaignReminders ?? {},

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
  setVipDashboard,
  setVipDashboardError,
  setVipDashboardLoading,
  setVipRefereeDashboard,
  setVipRefereeDashboardError,
  setVipRefereeDashboardLoading,
  acceptVipInvite,
  acceptVipRefereeInvite,
  setVipTransactions,
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
  // Perps Trading Campaign actions
  setPerpsTradingCampaignLeaderboard,
  setPerpsTradingCampaignLeaderboardLoading,
  setPerpsTradingCampaignLeaderboardError,
  setPerpsTradingCampaignLeaderboardPosition,
  setPerpsTradingCampaignVolume,
  setPerpsTradingCampaignVolumeLoading,
  setPerpsTradingCampaignVolumeError,
  setPredictThePitchLeaderboard,
  setPredictThePitchLeaderboardLoading,
  setPredictThePitchLeaderboardError,
  setPredictThePitchLeaderboardPosition,
  setPredictThePitchPositions,
  setPredictThePitchPrizePool,
  setPredictThePitchPrizePoolLoading,
  setPredictThePitchPrizePoolError,
  // Bulk link actions
  bulkLinkStarted,
  bulkLinkAccountResult,
  bulkLinkCompleted,
  bulkLinkCancelled,
  bulkLinkSubscriptionChanged,
  bulkLinkReset,
  bulkLinkResumed,
  setPendingDeeplink,
  dismissCampaignOutcomeToast,
  subscribeCampaignReminder,
} = rewardsSlice.actions;

export default rewardsSlice.reducer;
