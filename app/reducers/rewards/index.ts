import { createSlice, PayloadAction, Action } from '@reduxjs/toolkit';
import {
  SeasonStatusState,
  SeasonTierDto,
  GeoRewardsMetadata,
  PointsBoostDto,
  RewardDto,
  PointsEventDto,
  SeasonActivityTypeDto,
  SeasonDropDto,
  SeasonWayToEarnDto,
  CommitDropPointsResponseDto,
} from '../../core/Engine/controllers/rewards-controller/types';
import { OnboardingStep } from './types';
import { AccountGroupId } from '@metamask/account-api';

/**
 * Represents a recent drop point commit stored in UI state.
 * Used to optimistically show user's position before backend caching is updated.
 */
export interface RecentDropPointCommit {
  /** The commit response from the API */
  response: CommitDropPointsResponseDto;
  /** Unix timestamp (ms) when the commit was made */
  committedAt: number;
}

/**
 * Map of drop IDs to their most recent point commit data.
 * Used to handle backend caching delays.
 */
export type RecentDropPointCommitsMap = Record<string, RecentDropPointCommit>;

/**
 * Represents a recent drop address commit stored in UI state.
 * Used to optimistically show committed address before backend cache is updated.
 */
export interface RecentDropAddressCommit {
  /** The blockchain address committed for this drop */
  address: string;
  /** Unix timestamp (ms) when the address was committed/updated */
  committedAt: number;
}

/**
 * Map of drop IDs to their most recent address commit data.
 */
export type RecentDropAddressCommitsMap = Record<
  string,
  RecentDropAddressCommit
>;

/** Time window (in ms) during which recent commit data is considered valid */
export const RECENT_COMMIT_VALIDITY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Special rank value indicating rank is being calculated (TBD) */
export const DROP_LEADERBOARD_RANK_TBD = -1;

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
  activeTab: 'overview' | 'drops' | 'activity';
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

  // Season Drops state
  seasonDrops: SeasonDropDto[] | null;
  seasonDropsLoading: boolean;
  seasonDropsError: boolean;

  // Recent drop point commits state (for handling backend caching delays)
  recentDropPointCommits: RecentDropPointCommitsMap;

  // Recent drop address commits state (for optimistic address display)
  recentDropAddressCommits: RecentDropAddressCommitsMap;
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

  // Season Drops initial state
  seasonDrops: null,
  seasonDropsLoading: false,
  seasonDropsError: false,

  // Recent drop point commits initial state
  recentDropPointCommits: {},

  // Recent drop address commits initial state
  recentDropAddressCommits: {},
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
      action: PayloadAction<'overview' | 'drops' | 'activity'>,
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
        // Reset UI state to initial values
        state.seasonId = initialState.seasonId;
        state.seasonName = initialState.seasonName;
        state.seasonStartDate = initialState.seasonStartDate;
        state.seasonEndDate = initialState.seasonEndDate;
        state.seasonTiers = initialState.seasonTiers;
        state.seasonActivityTypes = initialState.seasonActivityTypes;
        state.seasonWaysToEarn = initialState.seasonWaysToEarn;
        state.referralCode = initialState.referralCode;
        state.refereeCount = initialState.refereeCount;
        state.currentTier = initialState.currentTier;
        state.nextTier = initialState.nextTier;
        state.nextTierPointsNeeded = initialState.nextTierPointsNeeded;
        state.balanceTotal = initialState.balanceTotal;
        state.balanceRefereePortion = initialState.balanceRefereePortion;
        state.balanceUpdatedAt = initialState.balanceUpdatedAt;
        state.seasonShouldInstallNewVersion =
          initialState.seasonShouldInstallNewVersion;
        state.activeBoosts = initialState.activeBoosts;
        state.pointsEvents = initialState.pointsEvents;
        state.unlockedRewards = initialState.unlockedRewards;
        state.seasonDrops = initialState.seasonDrops;
        // Also clear recent drop commits as they belong to the previous subscription
        state.recentDropPointCommits = initialState.recentDropPointCommits;
        state.recentDropAddressCommits = initialState.recentDropAddressCommits;
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

    // Season Drops reducers
    setSeasonDrops: (state, action: PayloadAction<SeasonDropDto[] | null>) => {
      state.seasonDrops = action.payload;
      state.seasonDropsError = false;
    },
    setSeasonDropsLoading: (state, action: PayloadAction<boolean>) => {
      if (action.payload && state.seasonDrops?.length) {
        return;
      }
      state.seasonDropsLoading = action.payload;
    },
    setSeasonDropsError: (state, action: PayloadAction<boolean>) => {
      state.seasonDropsError = action.payload;
    },

    // Recent drop point commits reducers
    setRecentDropPointCommit: (
      state,
      action: PayloadAction<{
        dropId: string;
        response: CommitDropPointsResponseDto;
      }>,
    ) => {
      state.recentDropPointCommits[action.payload.dropId] = {
        response: action.payload.response,
        committedAt: Date.now(),
      };
    },
    clearRecentDropPointCommit: (state, action: PayloadAction<string>) => {
      delete state.recentDropPointCommits[action.payload];
    },
    clearAllRecentDropPointCommits: (state) => {
      state.recentDropPointCommits = {};
    },

    // Recent drop address commits reducers
    setRecentDropAddressCommit: (
      state,
      action: PayloadAction<{
        dropId: string;
        address: string;
      }>,
    ) => {
      state.recentDropAddressCommits[action.payload.dropId] = {
        address: action.payload.address,
        committedAt: Date.now(),
      };
    },
    clearRecentDropAddressCommit: (state, action: PayloadAction<string>) => {
      delete state.recentDropAddressCommits[action.payload];
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
      .addCase('persist/REHYDRATE', (state, action: RehydrateAction) => {
        if (action.payload?.rewards) {
          // Detect if bulk link was interrupted (app closed while running)
          const previousBulkLink = action.payload.rewards.bulkLink;
          const wasInterrupted = previousBulkLink?.isRunning === true;

          let validRecentDropPointCommits: RecentDropPointCommitsMap = {};
          let validRecentDropAddressCommits: RecentDropAddressCommitsMap = {};

          try {
            // Filter out expired recent drop point commits (older than 5 minutes)
            const now = Date.now();
            const previousRecentDropPointCommits =
              action.payload.rewards.recentDropPointCommits ?? {};

            for (const [dropId, commit] of Object.entries(
              previousRecentDropPointCommits,
            )) {
              if (now - commit.committedAt < RECENT_COMMIT_VALIDITY_WINDOW_MS) {
                validRecentDropPointCommits[dropId] = commit;
              }
            }

            // Filter out expired recent drop address commits
            const previousRecentDropAddressCommits =
              action.payload.rewards.recentDropAddressCommits ?? {};

            for (const [dropId, commit] of Object.entries(
              previousRecentDropAddressCommits,
            )) {
              if (now - commit.committedAt < RECENT_COMMIT_VALIDITY_WINDOW_MS) {
                validRecentDropAddressCommits[dropId] = commit;
              }
            }
          } catch {
            validRecentDropPointCommits = {};
            validRecentDropAddressCommits = {};
          }

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
            balanceRefereePortion: action.payload.rewards.balanceRefereePortion,
            balanceUpdatedAt: action.payload.rewards.balanceUpdatedAt,
            activeBoosts: action.payload.rewards.activeBoosts,
            pointsEvents: action.payload.rewards.pointsEvents,
            unlockedRewards: action.payload.rewards.unlockedRewards,
            seasonDrops: action.payload.rewards.seasonDrops,
            hideUnlinkedAccountsBanner:
              action.payload.rewards.hideUnlinkedAccountsBanner,
            hideCurrentAccountNotOptedInBanner:
              action.payload.rewards.hideCurrentAccountNotOptedInBanner,

            // Recent drop point commits - restore only valid (non-expired) entries
            recentDropPointCommits: validRecentDropPointCommits,

            // Recent drop address commits - restore only valid (non-expired) entries
            recentDropAddressCommits: validRecentDropAddressCommits,

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
          };
        }
        return state;
      });
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
  // Season Drops actions
  setSeasonDrops,
  setSeasonDropsLoading,
  setSeasonDropsError,
  // Bulk link actions
  bulkLinkStarted,
  bulkLinkAccountResult,
  bulkLinkCompleted,
  bulkLinkCancelled,
  bulkLinkSubscriptionChanged,
  bulkLinkReset,
  bulkLinkResumed,
  // Recent drop point commits actions
  setRecentDropPointCommit,
  clearRecentDropPointCommit,
  clearAllRecentDropPointCommits,
  // Recent drop address commits actions
  setRecentDropAddressCommit,
  clearRecentDropAddressCommit,
} = rewardsSlice.actions;

export default rewardsSlice.reducer;
