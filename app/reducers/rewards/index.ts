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
  PerpsTradingCampaignPrizePoolDto,
  PredictThePitchLeaderboardDto,
  PredictThePitchLeaderboardPositionDto,
  PredictThePitchPositionsDto,
  PredictThePitchPrizePoolDto,
  MoneyAccountSweepstakesStatsMeDto,
  MoneyAccountSweepstakesPrizePoolDto,
  MoneyAccountSweepstakesDrawProofDto,
  VipDashboardState,
  VipRefereeMeState,
  VipTransactionDto,
  VipTransactionType,
} from '../../core/Engine/controllers/rewards-controller/types';
import {
  buildCampaignOutcomeToastCompositeKey,
  buildSeasonSubscriptionCompositeKey,
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

/**
 * Deferred Money Account Sweepstakes series opt-in resume.
 * When some active/upcoming weeks fail after immediate retries, needsRetry is
 * set so RewardsDashboard can re-run ensureOptedIn on focus. Targets are
 * always re-derived from series + participant status (no campaign ID list).
 */
export interface PendingMasSeriesOptInState {
  needsRetry: boolean;
  subscriptionId: string | null;
}

export interface SeasonUserStatusEntry {
  balanceTotal: number | null;
  balanceUpdatedAt: Date | null;
  currentTier: SeasonTierDto | null;
  nextTier: SeasonTierDto | null;
  nextTierPointsNeeded: number | null;
  loading: boolean;
  error: string | null;
}

export interface ReferralDetailsEntry {
  referralCode: string | null;
  refereeCount: number;
  referredByCode: string | null;
  isVipReferee: boolean;
  referredByVipCode: string | null;
  loading: boolean;
  error: boolean;
}

export interface BenefitsEntry {
  benefits: SubscriptionBenefitDto[];
  loading: boolean;
  error: boolean;
}

export interface ActiveBoostsEntry {
  boosts: PointsBoostDto[] | null;
  loading: boolean;
  error: boolean;
}

export interface UnlockedRewardsEntry {
  rewards: RewardDto[] | null;
  loading: boolean;
  error: boolean;
}

function createEmptySeasonUserStatusEntry(): SeasonUserStatusEntry {
  return {
    balanceTotal: null,
    balanceUpdatedAt: null,
    currentTier: null,
    nextTier: null,
    nextTierPointsNeeded: null,
    loading: false,
    error: null,
  };
}

function getOrCreateSeasonUserStatusEntry(
  map: Record<string, SeasonUserStatusEntry>,
  key: string,
): SeasonUserStatusEntry {
  if (!map[key]) {
    map[key] = createEmptySeasonUserStatusEntry();
  }
  return map[key];
}

function createEmptyReferralDetailsEntry(): ReferralDetailsEntry {
  return {
    referralCode: null,
    refereeCount: 0,
    referredByCode: null,
    isVipReferee: false,
    referredByVipCode: null,
    loading: false,
    error: false,
  };
}

function getOrCreateReferralDetailsEntry(
  map: Record<string, ReferralDetailsEntry>,
  subscriptionId: string,
): ReferralDetailsEntry {
  if (!map[subscriptionId]) {
    map[subscriptionId] = createEmptyReferralDetailsEntry();
  }
  return map[subscriptionId];
}

function createEmptyBenefitsEntry(): BenefitsEntry {
  return {
    benefits: [],
    loading: false,
    error: false,
  };
}

function getOrCreateBenefitsEntry(
  map: Record<string, BenefitsEntry>,
  subscriptionId: string,
): BenefitsEntry {
  if (!map[subscriptionId]) {
    map[subscriptionId] = createEmptyBenefitsEntry();
  }
  return map[subscriptionId];
}

function createEmptyActiveBoostsEntry(): ActiveBoostsEntry {
  return {
    boosts: null,
    loading: false,
    error: false,
  };
}

function getOrCreateActiveBoostsEntry(
  map: Record<string, ActiveBoostsEntry>,
  key: string,
): ActiveBoostsEntry {
  if (!map[key]) {
    map[key] = createEmptyActiveBoostsEntry();
  }
  return map[key];
}

function createEmptyUnlockedRewardsEntry(): UnlockedRewardsEntry {
  return {
    rewards: null,
    loading: false,
    error: false,
  };
}

function getOrCreateUnlockedRewardsEntry(
  map: Record<string, UnlockedRewardsEntry>,
  key: string,
): UnlockedRewardsEntry {
  if (!map[key]) {
    map[key] = createEmptyUnlockedRewardsEntry();
  }
  return map[key];
}

export interface RewardsState {
  activeTab: 'overview' | 'campaigns' | 'activity';

  // Season catalog (global)
  seasonId: string | null;
  seasonName: string | null;
  seasonStartDate: Date | null;
  seasonEndDate: Date | null;
  seasonTiers: SeasonTierDto[];
  seasonActivityTypes: SeasonActivityTypeDto[];
  seasonWaysToEarn: SeasonWayToEarnDto[];

  // Season user status (keyed by `${seasonId}:${subscriptionId}`)
  seasonUserStatuses: Record<string, SeasonUserStatusEntry>;

  // Subscription Referral state (keyed by subscriptionId)
  referralDetails: Record<string, ReferralDetailsEntry>;

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

  // Points Boost state (keyed by `${seasonId}:${subscriptionId}`)
  activeBoosts: Record<string, ActiveBoostsEntry>;

  // Points Events state (keyed by `${seasonId}:${subscriptionId}`)
  pointsEvents: Record<string, PointsEventDto[] | null>;

  // Unlocked Rewards state (keyed by `${seasonId}:${subscriptionId}`)
  unlockedRewards: Record<string, UnlockedRewardsEntry>;

  // Bulk link state (for linking all account groups across all wallets)
  bulkLink: BulkLinkState;

  // Pending Money Account Sweepstakes series opt-in (resume on dashboard focus)
  pendingMasSeriesOptIn: PendingMasSeriesOptInState;

  // Benefits state (keyed by subscriptionId)
  benefits: Record<string, BenefitsEntry>;

  // VIP dashboard state (keyed by subscriptionId)
  vipDashboard: Record<string, CampaignResourceCacheEntry<VipDashboardState>>;
  vipRefereeDashboard: Record<
    string,
    CampaignResourceCacheEntry<VipRefereeMeState>
  >;
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

  // Perps Trading Campaign prize pool (keyed by campaignId)
  perpsTradingCampaignPrizePools: Record<
    string,
    CampaignResourceCacheEntry<PerpsTradingCampaignPrizePoolDto>
  >;

  // Predict The Pitch prize pool (keyed by campaignId)
  predictThePitchPrizePools: Record<
    string,
    CampaignResourceCacheEntry<PredictThePitchPrizePoolDto>
  >;

  // Money Account Sweepstakes stats (keyed by `${subscriptionId}:${campaignId}`)
  moneyAccountSweepstakesStats: Record<
    string,
    CampaignResourceCacheEntry<MoneyAccountSweepstakesStatsMeDto>
  >;

  // Money Account Sweepstakes prize pool (keyed by campaignId)
  moneyAccountSweepstakesPrizePools: Record<
    string,
    CampaignResourceCacheEntry<MoneyAccountSweepstakesPrizePoolDto>
  >;

  // Money Account Sweepstakes draw proof (keyed by campaignId)
  moneyAccountSweepstakesDrawProofs: Record<
    string,
    CampaignResourceCacheEntry<MoneyAccountSweepstakesDrawProofDto>
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
  campaign?: 'ondo' | 'season1' | 'perps-comp' | 'predict-the-pitch' | 'money';
}

export const initialState: RewardsState = {
  activeTab: 'overview',

  seasonId: null,
  seasonName: null,
  seasonStartDate: null,
  seasonEndDate: null,
  seasonTiers: [],
  seasonActivityTypes: [],
  seasonWaysToEarn: [],

  seasonUserStatuses: {},
  referralDetails: {},

  onboardingActiveStep: OnboardingStep.INTRO,
  onboardingReferralCode: null,
  candidateSubscriptionId: 'pending',
  geoLocation: null,
  optinAllowedForGeo: null,
  optinAllowedForGeoLoading: false,
  optinAllowedForGeoError: false,
  hideUnlinkedAccountsBanner: false,
  hideCurrentAccountNotOptedInBanner: [],

  activeBoosts: {},
  pointsEvents: {},
  unlockedRewards: {},

  // Bulk link initial state
  bulkLink: {
    isRunning: false,
    totalAccounts: 0,
    linkedAccounts: 0,
    failedAccounts: 0,
    wasInterrupted: false,
    initialSubscriptionId: null,
  },

  pendingMasSeriesOptIn: {
    needsRetry: false,
    subscriptionId: null,
  },

  // Benefits initial state
  benefits: {},

  // VIP dashboard initial state
  vipDashboard: {},
  vipRefereeDashboard: {},
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
  perpsTradingCampaignPrizePools: {},
  predictThePitchLeaderboards: {},
  predictThePitchLeaderboardPositions: {},
  predictThePitchPositions: {},
  predictThePitchPrizePools: {},
  moneyAccountSweepstakesStats: {},
  moneyAccountSweepstakesPrizePools: {},
  moneyAccountSweepstakesDrawProofs: {},

  pendingDeeplink: null,

  dismissedCampaignOutcomeToasts: {},

  subscribedCampaignReminders: {},
};

interface RehydrateAction extends Action<'persist/REHYDRATE'> {
  payload?: {
    rewards?: Partial<RewardsState>;
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Persisted maps that used to be arrays (boosts, points, unlocked rewards,
 * benefits) must not be restored as-is: reducers write string keys onto the
 * value, and JSON.stringify drops those keys on the next persist.
 */
function rehydrateKeyedMap<T>(value: unknown): Record<string, T> {
  if (!isPlainRecord(value)) {
    return {};
  }
  return value as Record<string, T>;
}

function isCampaignResourceCacheEntry(
  value: unknown,
): value is CampaignResourceCacheEntry<unknown> {
  return (
    isPlainRecord(value) &&
    'data' in value &&
    'loading' in value &&
    'error' in value
  );
}

function rehydrateCampaignResourceCacheMap<T>(
  value: unknown,
): Record<string, CampaignResourceCacheEntry<T>> {
  if (!isPlainRecord(value)) {
    return {};
  }
  const next: Record<string, CampaignResourceCacheEntry<T>> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (isCampaignResourceCacheEntry(entry)) {
      next[key] = entry as CampaignResourceCacheEntry<T>;
    }
  }
  return next;
}

function rehydrateSubscriptionCampaignCacheMap<T>(
  value: unknown,
): Record<string, CampaignResourceCacheEntry<T>> {
  const map = rehydrateCampaignResourceCacheMap<T>(value);
  const next: Record<string, CampaignResourceCacheEntry<T>> = {};
  for (const [key, entry] of Object.entries(map)) {
    if (key.includes(':')) {
      next[key] = entry;
    }
  }
  return next;
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
      action: PayloadAction<{
        subscriptionId: string;
        status: SeasonStatusState | null;
      }>,
    ) => {
      const { subscriptionId, status } = action.payload;

      if (!status) {
        const seasonId = state.seasonId;
        if (seasonId) {
          const key = buildSeasonSubscriptionCompositeKey(
            seasonId,
            subscriptionId,
          );
          delete state.seasonUserStatuses[key];
        }
        return;
      }

      // Season catalog (global)
      state.seasonId = status.season.id || null;
      state.seasonName = status.season.name || null;
      state.seasonStartDate = status.season.startDate
        ? new Date(status.season.startDate)
        : null;
      state.seasonEndDate = status.season.endDate
        ? new Date(status.season.endDate)
        : null;
      state.seasonTiers = status.season.tiers || [];
      state.seasonActivityTypes = status.season.activityTypes || [];
      state.seasonWaysToEarn = status.season.waysToEarn || [];

      if (!status.season.id) {
        return;
      }

      const key = buildSeasonSubscriptionCompositeKey(
        status.season.id,
        subscriptionId,
      );
      state.seasonUserStatuses[key] = {
        balanceTotal:
          status.balance && typeof status.balance.total === 'number'
            ? status.balance.total
            : null,
        balanceUpdatedAt: status.balance?.updatedAt
          ? new Date(status.balance.updatedAt)
          : null,
        currentTier: status.tier?.currentTier || null,
        nextTier: status.tier?.nextTier || null,
        nextTierPointsNeeded: status.tier?.nextTierPointsNeeded || null,
        loading: false,
        error: null,
      };
    },

    setReferralDetails: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        referralCode?: string;
        refereeCount?: number;
        referredByCode?: string;
        isVipReferee?: boolean;
        referredByVipCode?: string | null;
      }>,
    ) => {
      const entry = getOrCreateReferralDetailsEntry(
        state.referralDetails,
        action.payload.subscriptionId,
      );
      if (action.payload.referralCode !== undefined) {
        entry.referralCode = action.payload.referralCode;
      }
      if (action.payload.refereeCount !== undefined) {
        entry.refereeCount = action.payload.refereeCount;
      }
      if (action.payload.referredByCode !== undefined) {
        entry.referredByCode = action.payload.referredByCode;
      }
      if (action.payload.isVipReferee !== undefined) {
        entry.isVipReferee = action.payload.isVipReferee;
      }
      if (action.payload.referredByVipCode !== undefined) {
        entry.referredByVipCode = action.payload.referredByVipCode;
      }
      entry.loading = false;
    },

    setReferralDetailsLoading: (
      state,
      action: PayloadAction<{ subscriptionId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateReferralDetailsEntry(
        state.referralDetails,
        action.payload.subscriptionId,
      );
      if (action.payload.loading && entry.referralCode) {
        return;
      }
      entry.loading = action.payload.loading;
    },

    setReferralDetailsError: (
      state,
      action: PayloadAction<{ subscriptionId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateReferralDetailsEntry(
        state.referralDetails,
        action.payload.subscriptionId,
      );
      entry.error = action.payload.error;
    },

    setSeasonStatusLoading: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        seasonId?: string | null;
        loading: boolean;
      }>,
    ) => {
      const seasonId = action.payload.seasonId ?? state.seasonId;
      if (!seasonId) {
        return;
      }
      const key = buildSeasonSubscriptionCompositeKey(
        seasonId,
        action.payload.subscriptionId,
      );
      const entry = getOrCreateSeasonUserStatusEntry(
        state.seasonUserStatuses,
        key,
      );
      if (action.payload.loading && entry.balanceTotal != null) {
        return;
      }
      entry.loading = action.payload.loading;
    },

    setSeasonStatusError: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        seasonId?: string | null;
        error: string | null;
      }>,
    ) => {
      const seasonId = action.payload.seasonId ?? state.seasonId;
      if (!seasonId) {
        return;
      }
      const key = buildSeasonSubscriptionCompositeKey(
        seasonId,
        action.payload.subscriptionId,
      );
      const entry = getOrCreateSeasonUserStatusEntry(
        state.seasonUserStatuses,
        key,
      );
      entry.error = action.payload.error;
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
      state.perpsTradingCampaignPrizePools = {};
      state.predictThePitchLeaderboards = {};
      state.predictThePitchLeaderboardPositions = {};
      state.predictThePitchPositions = {};
      state.predictThePitchPrizePools = {};
      state.moneyAccountSweepstakesStats = {};
      state.moneyAccountSweepstakesPrizePools = {};
      state.moneyAccountSweepstakesDrawProofs = {};
      state.seasonUserStatuses = {};
      state.referralDetails = {};
      state.activeBoosts = {};
      state.pointsEvents = {};
      state.unlockedRewards = {};
      state.benefits = {};
      state.vipDashboard = {};
      state.vipRefereeDashboard = {};
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
      action: PayloadAction<{
        subscriptionId: string;
        seasonId?: string | null;
        boosts: PointsBoostDto[] | null;
      }>,
    ) => {
      const seasonId = action.payload.seasonId ?? state.seasonId;
      if (!seasonId) {
        return;
      }
      const key = buildSeasonSubscriptionCompositeKey(
        seasonId,
        action.payload.subscriptionId,
      );
      const entry = getOrCreateActiveBoostsEntry(state.activeBoosts, key);
      entry.boosts = action.payload.boosts;
      entry.error = false;
    },
    setActiveBoostsLoading: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        seasonId?: string | null;
        loading: boolean;
      }>,
    ) => {
      const seasonId = action.payload.seasonId ?? state.seasonId;
      if (!seasonId) {
        return;
      }
      const key = buildSeasonSubscriptionCompositeKey(
        seasonId,
        action.payload.subscriptionId,
      );
      const entry = getOrCreateActiveBoostsEntry(state.activeBoosts, key);
      if (action.payload.loading && entry.boosts?.length) {
        return;
      }
      entry.loading = action.payload.loading;
    },
    setActiveBoostsError: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        seasonId?: string | null;
        error: boolean;
      }>,
    ) => {
      const seasonId = action.payload.seasonId ?? state.seasonId;
      if (!seasonId) {
        return;
      }
      const key = buildSeasonSubscriptionCompositeKey(
        seasonId,
        action.payload.subscriptionId,
      );
      const entry = getOrCreateActiveBoostsEntry(state.activeBoosts, key);
      entry.error = action.payload.error;
    },
    setUnlockedRewards: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        seasonId?: string | null;
        rewards: RewardDto[] | null;
      }>,
    ) => {
      const seasonId = action.payload.seasonId ?? state.seasonId;
      if (!seasonId) {
        return;
      }
      const key = buildSeasonSubscriptionCompositeKey(
        seasonId,
        action.payload.subscriptionId,
      );
      const entry = getOrCreateUnlockedRewardsEntry(state.unlockedRewards, key);
      entry.rewards = action.payload.rewards;
      entry.error = false;
    },
    setUnlockedRewardLoading: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        seasonId?: string | null;
        loading: boolean;
      }>,
    ) => {
      const seasonId = action.payload.seasonId ?? state.seasonId;
      if (!seasonId) {
        return;
      }
      const key = buildSeasonSubscriptionCompositeKey(
        seasonId,
        action.payload.subscriptionId,
      );
      const entry = getOrCreateUnlockedRewardsEntry(state.unlockedRewards, key);
      if (action.payload.loading && entry.rewards?.length) {
        return;
      }
      entry.loading = action.payload.loading;
    },
    setUnlockedRewardError: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        seasonId?: string | null;
        error: boolean;
      }>,
    ) => {
      const seasonId = action.payload.seasonId ?? state.seasonId;
      if (!seasonId) {
        return;
      }
      const key = buildSeasonSubscriptionCompositeKey(
        seasonId,
        action.payload.subscriptionId,
      );
      const entry = getOrCreateUnlockedRewardsEntry(state.unlockedRewards, key);
      entry.error = action.payload.error;
    },
    setPointsEvents: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        seasonId?: string | null;
        pointsEvents: PointsEventDto[] | null;
      }>,
    ) => {
      const seasonId = action.payload.seasonId ?? state.seasonId;
      if (!seasonId) {
        return;
      }
      const key = buildSeasonSubscriptionCompositeKey(
        seasonId,
        action.payload.subscriptionId,
      );
      state.pointsEvents[key] = action.payload.pointsEvents;
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

    setPendingMasSeriesOptIn: (
      state,
      action: PayloadAction<PendingMasSeriesOptInState>,
    ) => {
      state.pendingMasSeriesOptIn = {
        needsRetry: action.payload.needsRetry,
        subscriptionId: action.payload.subscriptionId,
      };
    },

    clearPendingMasSeriesOptIn: (state) => {
      state.pendingMasSeriesOptIn = initialState.pendingMasSeriesOptIn;
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

    setBenefits: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        benefits: SubscriptionBenefitsState;
      }>,
    ) => {
      const entry = getOrCreateBenefitsEntry(
        state.benefits,
        action.payload.subscriptionId,
      );
      entry.benefits = action.payload.benefits.benefits ?? [];
    },

    setBenefitsLoading: (
      state,
      action: PayloadAction<{ subscriptionId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateBenefitsEntry(
        state.benefits,
        action.payload.subscriptionId,
      );
      entry.loading = action.payload.loading;
    },

    setBenefitsError: (
      state,
      action: PayloadAction<{ subscriptionId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateBenefitsEntry(
        state.benefits,
        action.payload.subscriptionId,
      );
      entry.error = action.payload.error;
    },

    setVipDashboard: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        dashboard: VipDashboardState | null;
      }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.vipDashboard,
        action.payload.subscriptionId,
      );
      entry.data = action.payload.dashboard;
      entry.error = false;
    },

    setVipDashboardLoading: (
      state,
      action: PayloadAction<{ subscriptionId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.vipDashboard,
        action.payload.subscriptionId,
      );
      entry.loading = action.payload.loading;
    },

    setVipDashboardError: (
      state,
      action: PayloadAction<{ subscriptionId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.vipDashboard,
        action.payload.subscriptionId,
      );
      entry.error = action.payload.error;
    },

    setVipRefereeDashboard: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        dashboard: VipRefereeMeState | null;
      }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.vipRefereeDashboard,
        action.payload.subscriptionId,
      );
      entry.data = action.payload.dashboard;
      entry.error = false;
    },

    setVipRefereeDashboardLoading: (
      state,
      action: PayloadAction<{ subscriptionId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.vipRefereeDashboard,
        action.payload.subscriptionId,
      );
      entry.loading = action.payload.loading;
    },

    setVipRefereeDashboardError: (
      state,
      action: PayloadAction<{ subscriptionId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.vipRefereeDashboard,
        action.payload.subscriptionId,
      );
      entry.error = action.payload.error;
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

    // Perps Trading Campaign prize pool reducers
    setPerpsTradingCampaignPrizePool: (
      state,
      action: PayloadAction<{
        campaignId: string;
        prizePool: PerpsTradingCampaignPrizePoolDto | null;
      }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.perpsTradingCampaignPrizePools,
        action.payload.campaignId,
      );
      entry.data = action.payload.prizePool;
      entry.error = false;
    },
    setPerpsTradingCampaignPrizePoolLoading: (
      state,
      action: PayloadAction<{ campaignId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.perpsTradingCampaignPrizePools,
        action.payload.campaignId,
      );
      entry.loading = action.payload.loading;
    },
    setPerpsTradingCampaignPrizePoolError: (
      state,
      action: PayloadAction<{ campaignId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.perpsTradingCampaignPrizePools,
        action.payload.campaignId,
      );
      entry.error = action.payload.error;
      if (action.payload.error) {
        entry.data = null;
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

    // Money Account Sweepstakes stats reducers
    setMoneyAccountSweepstakesStats: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        campaignId: string;
        stats: MoneyAccountSweepstakesStatsMeDto | null;
      }>,
    ) => {
      const key = buildSubscriptionCampaignCompositeKey(
        action.payload.subscriptionId,
        action.payload.campaignId,
      );
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.moneyAccountSweepstakesStats,
        key,
      );
      entry.data = action.payload.stats;
      entry.error = false;
    },
    setMoneyAccountSweepstakesStatsLoading: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        campaignId: string;
        loading: boolean;
      }>,
    ) => {
      const key = buildSubscriptionCampaignCompositeKey(
        action.payload.subscriptionId,
        action.payload.campaignId,
      );
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.moneyAccountSweepstakesStats,
        key,
      );
      entry.loading = action.payload.loading;
    },
    setMoneyAccountSweepstakesStatsError: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        campaignId: string;
        error: boolean;
      }>,
    ) => {
      const key = buildSubscriptionCampaignCompositeKey(
        action.payload.subscriptionId,
        action.payload.campaignId,
      );
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.moneyAccountSweepstakesStats,
        key,
      );
      entry.error = action.payload.error;
      if (action.payload.error) {
        entry.data = null;
      }
    },

    // Money Account Sweepstakes prize pool reducers
    setMoneyAccountSweepstakesPrizePool: (
      state,
      action: PayloadAction<{
        campaignId: string;
        prizePool: MoneyAccountSweepstakesPrizePoolDto | null;
      }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.moneyAccountSweepstakesPrizePools,
        action.payload.campaignId,
      );
      entry.data = action.payload.prizePool;
      entry.error = false;
    },
    setMoneyAccountSweepstakesPrizePoolLoading: (
      state,
      action: PayloadAction<{ campaignId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.moneyAccountSweepstakesPrizePools,
        action.payload.campaignId,
      );
      entry.loading = action.payload.loading;
    },
    setMoneyAccountSweepstakesPrizePoolError: (
      state,
      action: PayloadAction<{ campaignId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.moneyAccountSweepstakesPrizePools,
        action.payload.campaignId,
      );
      entry.error = action.payload.error;
      if (action.payload.error) {
        entry.data = null;
      }
    },

    // Money Account Sweepstakes draw proof reducers
    setMoneyAccountSweepstakesDrawProof: (
      state,
      action: PayloadAction<{
        campaignId: string;
        drawProof: MoneyAccountSweepstakesDrawProofDto | null;
      }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.moneyAccountSweepstakesDrawProofs,
        action.payload.campaignId,
      );
      entry.data = action.payload.drawProof;
      entry.error = false;
    },
    setMoneyAccountSweepstakesDrawProofLoading: (
      state,
      action: PayloadAction<{ campaignId: string; loading: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.moneyAccountSweepstakesDrawProofs,
        action.payload.campaignId,
      );
      entry.loading = action.payload.loading;
    },
    setMoneyAccountSweepstakesDrawProofError: (
      state,
      action: PayloadAction<{ campaignId: string; error: boolean }>,
    ) => {
      const entry = getOrCreateCampaignResourceCacheEntry(
        state.moneyAccountSweepstakesDrawProofs,
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
      state.pendingMasSeriesOptIn = initialState.pendingMasSeriesOptIn;
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

              // Season catalog (global)
              seasonId: action.payload.rewards.seasonId,
              seasonName: action.payload.rewards.seasonName,
              seasonStartDate: action.payload.rewards.seasonStartDate,
              seasonEndDate: action.payload.rewards.seasonEndDate,
              seasonTiers: action.payload.rewards.seasonTiers ?? [],
              seasonActivityTypes:
                action.payload.rewards.seasonActivityTypes ?? [],
              seasonWaysToEarn: action.payload.rewards.seasonWaysToEarn ?? [],

              // Keyed maps — restore if present and already the new shape;
              // legacy flat fields and same-name old types (arrays, DTO maps,
              // campaignId-only stats) are dropped.
              seasonUserStatuses: rehydrateKeyedMap(
                action.payload.rewards.seasonUserStatuses,
              ),
              referralDetails: rehydrateKeyedMap(
                action.payload.rewards.referralDetails,
              ),
              activeBoosts: rehydrateKeyedMap(
                action.payload.rewards.activeBoosts,
              ),
              pointsEvents: rehydrateKeyedMap(
                action.payload.rewards.pointsEvents,
              ),
              unlockedRewards: rehydrateKeyedMap(
                action.payload.rewards.unlockedRewards,
              ),
              benefits: rehydrateKeyedMap(action.payload.rewards.benefits),

              campaigns: action.payload.rewards.campaigns ?? [],
              vipDashboard: rehydrateCampaignResourceCacheMap(
                action.payload.rewards.vipDashboard,
              ),
              vipRefereeDashboard: rehydrateCampaignResourceCacheMap(
                action.payload.rewards.vipRefereeDashboard,
              ),
              vipSplashAccepted: rehydrateKeyedMap(
                action.payload.rewards.vipSplashAccepted,
              ),
              vipRefereeSplashAccepted: rehydrateKeyedMap(
                action.payload.rewards.vipRefereeSplashAccepted,
              ),
              vipTransactions: rehydrateKeyedMap(
                action.payload.rewards.vipTransactions,
              ),
              campaignParticipantStatuses: rehydrateKeyedMap(
                action.payload.rewards.campaignParticipantStatuses,
              ),
              ondoCampaignLeaderboardPositions: rehydrateKeyedMap(
                action.payload.rewards.ondoCampaignLeaderboardPositions,
              ),
              ondoCampaignPortfolio: rehydrateKeyedMap(
                action.payload.rewards.ondoCampaignPortfolio,
              ),
              ondoCampaignActivity: rehydrateKeyedMap(
                action.payload.rewards.ondoCampaignActivity,
              ),
              predictThePitchLeaderboardPositions: rehydrateKeyedMap(
                action.payload.rewards.predictThePitchLeaderboardPositions,
              ),
              predictThePitchPositions: rehydrateKeyedMap(
                action.payload.rewards.predictThePitchPositions,
              ),
              moneyAccountSweepstakesStats:
                rehydrateSubscriptionCampaignCacheMap(
                  action.payload.rewards.moneyAccountSweepstakesStats,
                ),
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

              pendingMasSeriesOptIn: {
                ...initialState.pendingMasSeriesOptIn,
                ...(action.payload.rewards.pendingMasSeriesOptIn ?? {}),
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
  setPendingMasSeriesOptIn,
  clearPendingMasSeriesOptIn,
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
  setPerpsTradingCampaignPrizePool,
  setPerpsTradingCampaignPrizePoolLoading,
  setPerpsTradingCampaignPrizePoolError,
  setPredictThePitchLeaderboard,
  setPredictThePitchLeaderboardLoading,
  setPredictThePitchLeaderboardError,
  setPredictThePitchLeaderboardPosition,
  setPredictThePitchPositions,
  setPredictThePitchPrizePool,
  setPredictThePitchPrizePoolLoading,
  setPredictThePitchPrizePoolError,
  setMoneyAccountSweepstakesStats,
  setMoneyAccountSweepstakesStatsLoading,
  setMoneyAccountSweepstakesStatsError,
  setMoneyAccountSweepstakesPrizePool,
  setMoneyAccountSweepstakesPrizePoolLoading,
  setMoneyAccountSweepstakesPrizePoolError,
  setMoneyAccountSweepstakesDrawProof,
  setMoneyAccountSweepstakesDrawProofLoading,
  setMoneyAccountSweepstakesDrawProofError,
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
