import { BaseController, StateMetadata } from '@metamask/base-controller';
import { maxBy } from 'lodash';
import {
  type RewardsControllerState,
  type RewardsAccountState,
  type LoginResponseDto,
  type PerpsDiscountData,
  type EstimatePointsDto,
  type EstimatedPointsDto,
  type SeasonDtoState,
  type SeasonStatusState,
  type SeasonTierState,
  type SeasonTierDto,
  type SubscriptionSeasonReferralDetailState,
  type GeoRewardsMetadata,
  type SubscriptionDto,
  type PaginatedPointsEventsDto,
  type GetPointsEventsDto,
  type OptInStatusInputDto,
  type OptInStatusDto,
  type PointsBoostDto,
  type PointsEventDto,
  type RewardDto,
  ClaimRewardDto,
  PointsEventsDtoState,
  GetPointsEventsLastUpdatedDto,
  SeasonStatusDto,
  type DiscoverSeasonsDto,
  type SeasonMetadataDto,
  type SeasonStateDto,
} from './types';
import type { RewardsControllerMessenger } from '../../messengers/rewards-controller-messenger';
import {
  storeSubscriptionToken,
  removeSubscriptionToken,
  resetAllSubscriptionTokens,
  getSubscriptionToken,
} from './utils/multi-subscription-token-vault';
import Logger from '../../../../util/Logger';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { isHardwareAccount } from '../../../../util/address';
import {
  CaipAccountId,
  parseCaipChainId,
  toCaipAccountId,
} from '@metamask/utils';
import { base58 } from 'ethers/lib/utils';
import { isNonEvmAddress } from '../../../Multichain/utils';
import { signSolanaRewardsMessage } from './utils/solana-snap';
import {
  AuthorizationFailedError,
  InvalidTimestampError,
  AccountAlreadyRegisteredError,
  SeasonNotFoundError,
} from './services/rewards-data-service';
import { sortAccounts } from './utils/sortAccounts';

// Re-export the messenger type for convenience
export type { RewardsControllerMessenger };

export const DEFAULT_BLOCKED_REGIONS = ['UK', 'GB', 'GI'];

const controllerName = 'RewardsController';

// Perps discount refresh threshold
const PERPS_DISCOUNT_CACHE_THRESHOLD_MS = 1000 * 60 * 5; // 5 minutes

// Season status cache threshold
const SEASON_STATUS_CACHE_THRESHOLD_MS = 1000 * 60 * 1; // 1 minute

// Season metadata cache threshold
const SEASON_METADATA_CACHE_THRESHOLD_MS = 1000 * 60 * 1; // 1 minute

// Referral details cache threshold
const REFERRAL_DETAILS_CACHE_THRESHOLD_MS = 1000 * 60 * 1; // 1 minutes

// Active boosts cache threshold
const ACTIVE_BOOSTS_CACHE_THRESHOLD_MS = 1000 * 60 * 1; // 1 minute

// Unlocked rewards cache threshold
const UNLOCKED_REWARDS_CACHE_THRESHOLD_MS = 1000 * 60 * 1; // 1 minute

// Points events cache threshold (first page only)
const POINTS_EVENTS_CACHE_THRESHOLD_MS = 1000 * 60 * 1; // 1 minute cache

// Opt-in status stale threshold for not opted-in accounts to force a fresh check
const NOT_OPTED_IN_OIS_STALE_CACHE_THRESHOLD_MS = 1000 * 60 * 60; // 1 hour

/**
 * State metadata for the RewardsController
 */
const metadata: StateMetadata<RewardsControllerState> = {
  activeAccount: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  accounts: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  subscriptions: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  seasons: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  subscriptionReferralDetails: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  seasonStatuses: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  activeBoosts: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  unlockedRewards: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  pointsEvents: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
};

/**
 * Get the default state for the RewardsController
 */
export const getRewardsControllerDefaultState = (): RewardsControllerState => ({
  activeAccount: null,
  accounts: {},
  subscriptions: {},
  seasons: {},
  subscriptionReferralDetails: {},
  seasonStatuses: {},
  activeBoosts: {},
  unlockedRewards: {},
  pointsEvents: {},
});

export const defaultRewardsControllerState = getRewardsControllerDefaultState();

type CacheReader<T> = (
  key: string,
) => { payload: T; lastFetched?: number } | undefined;

type CacheWriter<T> = (key: string, payload: T) => void;

interface CacheOptions<T> {
  key: string;
  ttl: number;
  readCache: CacheReader<T>;
  fetchFresh: () => Promise<T>;
  writeCache: CacheWriter<T>;
  swrCallback?: (old: T, fresh: T) => void; // Callback triggered after SWR refresh, to invalidate cache
}

/**
 * Get a value, from cache if exist
 */
export async function wrapWithCache<T>({
  key,
  ttl,
  readCache,
  fetchFresh,
  writeCache,
  swrCallback,
}: CacheOptions<T>): Promise<T> {
  // Try cache
  try {
    const cached = readCache(key);

    if (cached) {
      const isStale =
        !cached.lastFetched || Date.now() - cached.lastFetched > ttl;

      // If cache is fresh, return it immediately and do NOT trigger SWR
      if (!isStale) return cached.payload;

      // If stale and SWR enabled → return stale data + background refresh
      if (swrCallback) {
        (async () => {
          try {
            const fresh = await fetchFresh();
            writeCache(key, fresh);
            swrCallback(cached.payload, fresh);
          } catch (err) {
            Logger.log(
              'SWR revalidation failed:',
              err instanceof Error ? err.message : String(err),
            );
          }
        })();
        return cached.payload;
      }
    }
  } catch (error) {
    Logger.log(
      'RewardsController: wrapWithCache cache read failed, fetching fresh',
      error instanceof Error ? error.message : String(error),
    );
  }

  // Fetch fresh
  const freshValue = await fetchFresh();

  // Write cache
  try {
    writeCache(key, freshValue);
  } catch (error) {
    Logger.log(
      'RewardsController: wrapWithCache writeCache failed',
      error instanceof Error ? error.message : String(error),
    );
  }

  return freshValue;
}

/**
 * Controller for managing user rewards and campaigns
 * Handles reward claiming, campaign fetching, and reward history
 */
export class RewardsController extends BaseController<
  typeof controllerName,
  RewardsControllerState,
  RewardsControllerMessenger
> {
  #geoLocation: GeoRewardsMetadata | null = null;
  #isDisabled: () => boolean;

  /**
   * Calculate tier status and next tier information
   */
  calculateTierStatus(
    seasonTiers: SeasonTierDto[],
    currentTierId: string,
    currentPoints: number,
  ): SeasonTierState {
    // Sort tiers by points needed (ascending)
    const sortedTiers = [...seasonTiers].sort(
      (a, b) => a.pointsNeeded - b.pointsNeeded,
    );

    // Find current tier
    const currentTier = sortedTiers.find((tier) => tier.id === currentTierId);
    if (!currentTier) {
      throw new Error(
        `Current tier ${currentTierId} not found in season tiers`,
      );
    }

    // Find next tier (first tier with more points needed than current tier)
    const currentTierIndex = sortedTiers.findIndex(
      (tier) => tier.id === currentTierId,
    );
    const nextTier =
      currentTierIndex < sortedTiers.length - 1
        ? sortedTiers[currentTierIndex + 1]
        : null;

    // Calculate points needed for next tier
    const nextTierPointsNeeded = nextTier
      ? Math.max(0, nextTier.pointsNeeded - currentPoints)
      : null;

    return {
      currentTier,
      nextTier,
      nextTierPointsNeeded,
    };
  }

  /**
   * Convert SeasonDto to SeasonDtoState for storage
   */
  #convertSeasonToState(season: SeasonStatusDto['season']): SeasonDtoState {
    return {
      id: season.id,
      name: season.name,
      startDate: season.startDate.getTime(),
      endDate: season.endDate.getTime(),
      tiers: season.tiers,
      activityTypes: season.activityTypes,
      shouldInstallNewVersion: season.shouldInstallNewVersion,
    };
  }

  /**
   * Combine season metadata and season state into a SeasonStatusDto
   */
  convertToSeasonStatusDto(
    seasonMetadata: SeasonDtoState,
    seasonState: SeasonStateDto,
  ): SeasonStatusDto {
    return {
      season: {
        id: seasonMetadata.id,
        name: seasonMetadata.name,
        startDate: new Date(seasonMetadata.startDate),
        endDate: new Date(seasonMetadata.endDate),
        tiers: seasonMetadata.tiers,
        activityTypes: seasonMetadata.activityTypes,
        shouldInstallNewVersion: seasonMetadata.shouldInstallNewVersion,
      },
      balance: {
        total: seasonState.balance,
        updatedAt: seasonState.updatedAt,
      },
      currentTierId: seasonState.currentTierId,
    };
  }

  /**
   * Convert SeasonStatusDto to SeasonStatusState and update seasons map
   */
  #convertSeasonStatusToSubscriptionState(
    seasonStatus: SeasonStatusDto,
  ): SeasonStatusState {
    const tierState = this.calculateTierStatus(
      seasonStatus.season.tiers,
      seasonStatus.currentTierId,
      seasonStatus.balance.total,
    );

    return {
      season: this.#convertSeasonToState(seasonStatus.season),
      balance: {
        total: seasonStatus.balance.total,
        updatedAt: seasonStatus.balance.updatedAt?.getTime(),
      },
      tier: tierState,
      lastFetched: Date.now(),
    };
  }

  #convertPointsEventsToState(
    pointsEvents: PaginatedPointsEventsDto,
  ): PointsEventsDtoState {
    return {
      results: pointsEvents.results.map((result) => ({
        ...result,
        timestamp: new Date(result.timestamp).getTime(),
        updatedAt: new Date(result.updatedAt).getTime(),
        type: result.type,
        payload: result.payload,
      })),
      has_more: pointsEvents.has_more,
      cursor: pointsEvents.cursor,
      lastFetched: Date.now(),
    };
  }

  #convertPointsEventsStateToDto(
    state: PointsEventsDtoState,
  ): PaginatedPointsEventsDto {
    return {
      results: state.results.map((r) => ({
        ...r,
        type: r.type as PointsEventDto['type'],
        timestamp: new Date(r.timestamp),
        updatedAt: new Date(r.updatedAt),
      })),
      cursor: state.cursor,
      has_more: state.has_more,
    };
  }

  constructor({
    messenger,
    state,
    isDisabled,
  }: {
    messenger: RewardsControllerMessenger;
    state?: Partial<RewardsControllerState>;
    isDisabled?: () => boolean;
  }) {
    super({
      name: controllerName,
      metadata,
      messenger,
      state: {
        ...defaultRewardsControllerState,
        ...state,
      },
    });

    this.#isDisabled = isDisabled ?? (() => false);

    this.#registerActionHandlers();
    this.#initializeEventSubscriptions();
  }

  /**
   * Register action handlers for this controller
   */
  #registerActionHandlers(): void {
    this.messenger.registerActionHandler(
      'RewardsController:getHasAccountOptedIn',
      this.getHasAccountOptedIn.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getPointsEvents',
      this.getPointsEvents.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:estimatePoints',
      this.estimatePoints.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getPerpsDiscountForAccount',
      this.getPerpsDiscountForAccount.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:isRewardsFeatureEnabled',
      this.isRewardsFeatureEnabled.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:hasActiveSeason',
      this.hasActiveSeason.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getSeasonMetadata',
      this.getSeasonMetadata.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getSeasonStatus',
      this.getSeasonStatus.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getReferralDetails',
      this.getReferralDetails.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:optIn',
      this.optIn.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:logout',
      this.logout.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getGeoRewardsMetadata',
      this.getGeoRewardsMetadata.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:validateReferralCode',
      this.validateReferralCode.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:linkAccountToSubscriptionCandidate',
      this.linkAccountToSubscriptionCandidate.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:linkAccountsToSubscriptionCandidate',
      this.linkAccountsToSubscriptionCandidate.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getCandidateSubscriptionId',
      this.getCandidateSubscriptionId.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:optOut',
      this.optOut.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getOptInStatus',
      this.getOptInStatus.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getActivePointsBoosts',
      this.getActivePointsBoosts.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getUnlockedRewards',
      this.getUnlockedRewards.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:claimReward',
      this.claimReward.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:isOptInSupported',
      this.isOptInSupported.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getActualSubscriptionId',
      this.getActualSubscriptionId.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:getFirstSubscriptionId',
      this.getFirstSubscriptionId.bind(this),
    );
    this.messenger.registerActionHandler(
      'RewardsController:resetAll',
      this.resetAll.bind(this),
    );
  }

  /**
   * Initialize event subscriptions based on feature flag state
   */
  #initializeEventSubscriptions(): void {
    // Subscribe to account changes for silent authentication
    this.messenger.subscribe(
      'AccountTreeController:selectedAccountGroupChange',
      () => this.handleAuthenticationTrigger('Account Group changed'),
    );

    // Subscribe to KeyringController unlock events to retry silent auth
    this.messenger.subscribe('KeyringController:unlock', () =>
      this.handleAuthenticationTrigger('KeyringController unlocked'),
    );
  }

  /**
   * Reset controller state to default
   */
  resetState(): void {
    this.update(() => getRewardsControllerDefaultState());
  }

  /**
   * Get account state for a given CAIP-10 address
   */
  #getAccountState(account: CaipAccountId): RewardsAccountState | null {
    let accState = null;
    if (account?.startsWith('eip155')) {
      accState =
        this.state.accounts[
          `eip155:0:${account.split(':')[2]?.toLowerCase()}`
        ] || this.state.accounts[`eip155:0:${account.split(':')[2]}`];
    }
    if (!accState) {
      accState = this.state.accounts[account];
    }
    return accState || null;
  }

  /**
   * Get the actual subscription ID for a given CAIP account ID
   * @param account - The CAIP account ID to check
   * @returns The subscription ID or null if not found
   */
  getActualSubscriptionId(account: CaipAccountId): string | null {
    const accountState = this.#getAccountState(account);
    return accountState?.subscriptionId || null;
  }

  /**
   * Get the first subscription ID from the subscriptions map
   * @returns The first subscription ID or null if no subscriptions exist
   */
  getFirstSubscriptionId(): string | null {
    if (!this.state.subscriptions) return null;
    const subscriptionIds = Object.keys(this.state.subscriptions);
    return subscriptionIds.length > 0 ? subscriptionIds[0] : null;
  }

  /**
   * Create composite key for state storage
   */
  #createSeasonSubscriptionCompositeKey(
    seasonId: string,
    subscriptionId: string,
  ): string {
    return `${seasonId}:${subscriptionId}`;
  }

  /**
   * Get stored season status for a given composite key
   */
  #getSeasonStatus(
    subscriptionId: string,
    seasonId: string,
  ): SeasonStatusState | null {
    const compositeKey = this.#createSeasonSubscriptionCompositeKey(
      seasonId,
      subscriptionId,
    );
    return this.state.seasonStatuses[compositeKey] || null;
  }

  /**
   * Sign a message for rewards authentication
   */
  async #signRewardsMessage(
    account: InternalAccount,
    timestamp: number,
  ): Promise<string> {
    const message = `rewards,${account.address},${timestamp}`;

    if (isSolanaAddress(account.address)) {
      const result = await signSolanaRewardsMessage(
        account.id,
        Buffer.from(message, 'utf8').toString('base64'),
      );
      return `0x${Buffer.from(base58.decode(result.signature)).toString(
        'hex',
      )}`;
    } else if (!isNonEvmAddress(account.address)) {
      const result = await this.#signEvmMessage(account, message);
      return result;
    }

    throw new Error('Unsupported account type for signing rewards message');
  }

  async #signEvmMessage(
    account: InternalAccount,
    message: string,
  ): Promise<string> {
    // Convert message to hex format for signing
    const hexMessage = '0x' + Buffer.from(message, 'utf8').toString('hex');

    // Use KeyringController to sign the message
    const signature = await this.messenger.call(
      'KeyringController:signPersonalMessage',
      {
        data: hexMessage,
        from: account.address,
      },
    );
    Logger.log(
      'RewardsController: EVM message signed for account',
      account.address,
    );
    return signature;
  }

  /**
   * Set the active account from a candidate account
   */
  setActiveAccountFromCandidate(candidate: InternalAccount | null): void {
    if (!candidate) return;

    const caipAccount = this.convertInternalAccountToCaipAccountId(candidate);
    if (!caipAccount) return;

    const accountState = this.#getAccountState(caipAccount);
    if (!accountState) return;

    this.update((state: RewardsControllerState) => {
      state.activeAccount = accountState;
    });
  }

  /**
   * Handle authentication triggers (account changes, keyring unlock)
   */
  async handleAuthenticationTrigger(reason?: string): Promise<void> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();

    if (!rewardsEnabled) {
      await this.performSilentAuth(null, true, true);
      return;
    }

    Logger.log('RewardsController: handleAuthenticationTrigger', reason);

    try {
      const accounts = this.messenger.call(
        'AccountTreeController:getAccountsFromSelectedAccountGroup',
      );

      if (!accounts || accounts.length === 0) {
        await this.performSilentAuth(null, true, true);
      } else {
        const sortedAccounts = sortAccounts(accounts);

        try {
          // Prefer to get opt in status in bulk for sorted accounts.
          await this.getOptInStatus({
            addresses: sortedAccounts.map((account) => account.address),
          });
        } catch {
          // Failed to get opt in status in bulk for sorted accounts, let silent auth do it individually
        }

        // Try silent auth on each account until one succeeds
        let successAccount: InternalAccount | null = null;
        for (const account of sortedAccounts) {
          try {
            const subscriptionId = await this.performSilentAuth(
              account,
              false,
              true,
            );
            if (subscriptionId && !successAccount) {
              successAccount = account;
            }
          } catch {
            // Continue to next account
          }
        }

        // Set the active account to the first successful account or the first account in the sorted accounts array
        const activeAccountCandidate: InternalAccount =
          successAccount || sortedAccounts[0];
        this.setActiveAccountFromCandidate(activeAccountCandidate);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage && !errorMessage?.includes('Engine does not exis')) {
        Logger.log(
          'RewardsController: Silent authentication failed:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  /**
   * Check if silent authentication should be skipped
   */
  async shouldSkipSilentAuth(
    account: CaipAccountId,
    internalAccount: InternalAccount,
  ): Promise<boolean> {
    // Skip if opt-in is not supported (e.g., hardware wallets, unsupported account types)
    if (!this.isOptInSupported(internalAccount)) return true;

    const accountState = this.#getAccountState(account);
    if (accountState) {
      if (accountState.hasOptedIn === false) {
        if (!accountState.lastFreshOptInStatusCheck) {
          return false;
        }

        return (
          Date.now() - accountState.lastFreshOptInStatusCheck <=
          NOT_OPTED_IN_OIS_STALE_CACHE_THRESHOLD_MS
        );
      }
      return (
        Boolean(accountState.subscriptionId) &&
        Boolean(
          (await getSubscriptionToken(accountState.subscriptionId as string))
            ?.token,
        )
      );
    }

    return false;
  }

  /**
   * Check if an internal account supports opt-in for rewards
   * @param account - The internal account to check
   * @returns boolean - True if the account supports opt-in, false otherwise
   */
  isOptInSupported(account: InternalAccount): boolean {
    try {
      // Try to check if it's a hardware wallet
      const isHardware = isHardwareAccount(account.address);
      // If it's a hardware wallet, opt-in is not supported
      if (isHardware) {
        return false;
      }

      // Check if it's an EVM address (not non-EVM)
      if (!isNonEvmAddress(account.address)) {
        return true;
      }

      // Check if it's a Solana address
      if (isSolanaAddress(account.address)) {
        return true;
      }

      // If it's neither Solana nor EVM, opt-in is not supported
      return false;
    } catch (error) {
      // If there's an exception (e.g., checking hardware wallet status fails),
      // assume opt-in is not supported
      Logger.log(
        'RewardsController: Exception checking opt-in support, assuming not supported:',
        error,
      );
      return false;
    }
  }

  convertInternalAccountToCaipAccountId(
    account: InternalAccount,
  ): CaipAccountId | null {
    try {
      const [scope] = account.scopes;
      const { namespace, reference } = parseCaipChainId(scope);
      return toCaipAccountId(namespace, reference, account.address);
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to convert address to CAIP-10 format:',
        error,
      );
      return null;
    }
  }

  /**
   * Perform silent authentication for the given address
   */
  async performSilentAuth(
    internalAccount?: InternalAccount | null,
    shouldBecomeActiveAccount = true,
    respectSkipSilentAuth = true,
  ): Promise<string | null> {
    if (!internalAccount) {
      if (shouldBecomeActiveAccount) {
        this.update((state: RewardsControllerState) => {
          state.activeAccount = null;
        });
      }
      return null;
    }

    const account: CaipAccountId | null =
      this.convertInternalAccountToCaipAccountId(internalAccount);

    const shouldSkip = account
      ? await this.shouldSkipSilentAuth(account, internalAccount)
      : false;

    if (shouldSkip && respectSkipSilentAuth) {
      // This means that we'll have a record for this account
      let accountState = this.#getAccountState(account as CaipAccountId);
      if (accountState) {
        // Update last authenticated account
        this.update((state: RewardsControllerState) => {
          if (shouldBecomeActiveAccount) {
            state.activeAccount = accountState;
          }
        });
      } else {
        // Update accounts map && last authenticated account
        accountState = {
          account: account as CaipAccountId,
          hasOptedIn: false,
          subscriptionId: null,
          perpsFeeDiscount: null, // Default value, will be updated when fetched
          lastPerpsDiscountRateFetched: null,
        };
        this.update((state: RewardsControllerState) => {
          state.accounts[account as CaipAccountId] =
            accountState as RewardsAccountState;
          if (shouldBecomeActiveAccount) {
            state.activeAccount = accountState;
          }
        });
      }
      return accountState?.subscriptionId || null;
    }

    let subscription: SubscriptionDto | null = null;
    let authUnexpectedError = false;

    if (respectSkipSilentAuth && !shouldSkip) {
      // First, check opt-in status before attempting login
      try {
        const optInStatusResult = await this.getOptInStatus({
          addresses: [internalAccount.address],
        });

        // Check if the account has not opted in (result is false)
        if (optInStatusResult.ois?.[0] === false) {
          Logger.log(
            'RewardsController: Account has not opted in, skipping silent auth',
            internalAccount.address,
          );
          // Account hasn't opted in, don't proceed with login
          subscription = null;
          // Update state to reflect not opted in
          this.update((state: RewardsControllerState) => {
            if (!account) {
              return;
            }
            const accountState: RewardsAccountState = {
              account,
              hasOptedIn: false,
              subscriptionId: null,
              perpsFeeDiscount: null,
              lastPerpsDiscountRateFetched: null,
              lastFreshOptInStatusCheck: Date.now(),
            };
            state.accounts[account] = accountState;
            if (shouldBecomeActiveAccount) {
              state.activeAccount = accountState;
            }
          });
          return null;
        }
      } catch {
        // Continue with silent login attempt
      }
    }

    try {
      // Generate timestamp and sign the message
      let timestamp = Math.floor(Date.now() / 1000);
      let signature;
      let retryAttempt = 0;
      const MAX_RETRY_ATTEMPTS = 1;

      try {
        signature = await this.#signRewardsMessage(internalAccount, timestamp);
      } catch (signError) {
        Logger.log(
          'RewardsController: Failed to generate signature:',
          signError,
        );

        // Check if the error is due to locked keyring
        if (
          signError &&
          typeof signError === 'object' &&
          'message' in signError
        ) {
          const errorMessage = (signError as Error).message;
          if (errorMessage.includes('controller is locked')) {
            Logger.log(
              'RewardsController: Keyring is locked, skipping silent auth',
            );
            return null; // Exit silently when keyring is locked
          }
        }

        throw signError;
      }

      // Function to execute the login call with retry logic
      const executeLogin = async (
        ts: number,
        sig: string,
      ): Promise<LoginResponseDto> => {
        try {
          return await this.messenger.call('RewardsDataService:login', {
            account: internalAccount.address,
            timestamp: ts,
            signature: sig,
          });
        } catch (error) {
          // Check if it's an InvalidTimestampError and we haven't exceeded retry attempts
          if (
            error instanceof InvalidTimestampError &&
            retryAttempt < MAX_RETRY_ATTEMPTS
          ) {
            retryAttempt++;
            Logger.log(
              'RewardsController: Retrying silent auth with server timestamp',
              { originalTimestamp: ts, newTimestamp: error.timestamp },
            );
            // Use the timestamp from the error for retry
            timestamp = error.timestamp;
            signature = await this.#signRewardsMessage(
              internalAccount,
              timestamp,
            );
            return await executeLogin(timestamp, signature);
          }
          throw error;
        }
      };

      const loginResponse: LoginResponseDto = await executeLogin(
        timestamp,
        signature,
      );

      // Update state with successful authentication
      subscription = loginResponse.subscription;

      // Store the session token for this subscription
      const { success: tokenStoreSuccess } = await storeSubscriptionToken(
        subscription.id,
        loginResponse.sessionId,
      );
      if (!tokenStoreSuccess) {
        Logger.log('RewardsController: Failed to store session token', account);
        throw new Error('Failed to store session token');
      }

      Logger.log('RewardsController: Silent auth successful', account);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('401')) {
        // Not opted in
        Logger.log('RewardsController: Account not opt-in', account);
      } else {
        // Unknown error
        subscription = null;
        authUnexpectedError = true;
      }
    } finally {
      // Update state
      this.update((state: RewardsControllerState) => {
        if (!account) {
          return;
        }

        // Update accounts map && last authenticated account
        const accountState: RewardsAccountState = {
          account,
          hasOptedIn: authUnexpectedError ? undefined : !!subscription,
          subscriptionId: subscription?.id || null,
          perpsFeeDiscount: null, // Default value, will be updated when fetched
          lastPerpsDiscountRateFetched: null,
          lastFreshOptInStatusCheck: Date.now(),
        };
        state.accounts[account] = accountState;
        if (shouldBecomeActiveAccount) {
          state.activeAccount = accountState;
        }

        if (subscription) {
          state.subscriptions[subscription.id] = subscription;
        }
      });
    }

    return subscription?.id || null;
  }

  /**
   * Update perps fee discount for a given address
   * @param address - The account address in CAIP-10 format
   */
  async #getPerpsFeeDiscountData(
    account: CaipAccountId,
  ): Promise<PerpsDiscountData | null> {
    const accountState = this.#getAccountState(account);

    // Check if we have a cached discount and if threshold hasn't been reached
    if (
      accountState?.perpsFeeDiscount !== null &&
      accountState?.lastPerpsDiscountRateFetched !== null &&
      accountState?.lastPerpsDiscountRateFetched &&
      Date.now() - accountState.lastPerpsDiscountRateFetched <
        PERPS_DISCOUNT_CACHE_THRESHOLD_MS
    ) {
      return {
        hasOptedIn: !!accountState?.hasOptedIn,
        discountBips: accountState?.perpsFeeDiscount,
      };
    }

    try {
      Logger.log(
        'RewardsController: Fetching fresh perps discount data via API call for',
        account,
      );
      const perpsDiscountData = await this.messenger.call(
        'RewardsDataService:getPerpsDiscount',
        { account },
      );

      // Make sure all account caip indexes are stored the same way
      let coercedAccount: CaipAccountId;
      if (account?.startsWith('eip155') && !account?.startsWith('eip155:0')) {
        coercedAccount =
          `eip155:0:${account.split(':')[2]?.toLowerCase()}` as CaipAccountId;
      } else if (account?.startsWith('eip155')) {
        coercedAccount = account.toLowerCase() as CaipAccountId;
      } else {
        coercedAccount = account;
      }

      this.update((state: RewardsControllerState) => {
        // Create account state if it doesn't exist
        if (!state.accounts[coercedAccount]) {
          state.accounts[coercedAccount] = {
            account: coercedAccount,
            hasOptedIn: perpsDiscountData.hasOptedIn,
            subscriptionId: null,
            perpsFeeDiscount: perpsDiscountData.discountBips ?? 0,
            lastPerpsDiscountRateFetched: Date.now(),
          };
        } else {
          // Update account state
          state.accounts[coercedAccount].hasOptedIn =
            perpsDiscountData.hasOptedIn;
          if (!perpsDiscountData.hasOptedIn) {
            state.accounts[coercedAccount].subscriptionId = null;
          }
          state.accounts[coercedAccount].perpsFeeDiscount =
            perpsDiscountData.discountBips ?? 0;
          state.accounts[coercedAccount].lastPerpsDiscountRateFetched =
            Date.now();
        }
      });
      return perpsDiscountData;
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to update perps fee discount:',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * Check if the given account (caip-10 format) has opted in to rewards
   * @param account - The account address in CAIP-10 format
   * @returns Promise<boolean> - True if the account has opted in, false otherwise
   */
  async getHasAccountOptedIn(account: CaipAccountId): Promise<boolean> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) return false;
    const accountState = this.#getAccountState(account);
    if (accountState?.hasOptedIn) return accountState.hasOptedIn;

    // Right now we'll derive this from either cached map state or perps fee discount api call.
    const perpsDiscountData = await this.#getPerpsFeeDiscountData(account);
    return !!perpsDiscountData?.hasOptedIn;
  }

  checkOptInStatusAgainstCache(
    addresses: string[],
    addressToAccountMap: Map<string, InternalAccount>,
  ): {
    cachedOptInResults: (boolean | null)[];
    cachedSubscriptionIds: (string | null)[];
    addressesNeedingFresh: string[];
  } {
    // Arrays to track cached vs fresh data needed
    const cachedOptInResults: (boolean | null)[] = new Array(
      addresses.length,
    ).fill(null);
    const cachedSubscriptionIds: (string | null)[] = new Array(
      addresses.length,
    ).fill(null);
    const addressesNeedingFresh: string[] = [];

    // Check storage state for each address
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      const internalAccount = addressToAccountMap.get(address.toLowerCase());

      if (internalAccount) {
        const caipAccount =
          this.convertInternalAccountToCaipAccountId(internalAccount);
        if (caipAccount) {
          const accountState = this.#getAccountState(caipAccount);
          if (accountState?.hasOptedIn !== undefined) {
            // Check if account is not opted in and needs a recheck
            const shouldRecheckFreshIfNotOptedIn =
              !accountState.lastFreshOptInStatusCheck ||
              Date.now() - accountState.lastFreshOptInStatusCheck >
                NOT_OPTED_IN_OIS_STALE_CACHE_THRESHOLD_MS;

            if (
              accountState.hasOptedIn === false &&
              shouldRecheckFreshIfNotOptedIn
            ) {
              // Force a fresh check for this not-opted-in account
              addressesNeedingFresh.push(address);
              continue;
            }

            // Use cached data
            cachedOptInResults[i] = accountState.hasOptedIn;
            cachedSubscriptionIds[i] = accountState.subscriptionId || null;
            continue;
          }
        }
      }

      // No cached data found, need fresh API call
      addressesNeedingFresh.push(address);
    }

    return {
      cachedOptInResults,
      cachedSubscriptionIds,
      addressesNeedingFresh,
    };
  }

  /**
   * Get opt-in status for multiple addresses with feature flag check
   * @param params - The request parameters containing addresses
   * @returns Promise<OptInStatusDto> - The opt-in status response
   */
  async getOptInStatus(params: OptInStatusInputDto): Promise<OptInStatusDto> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      // Return empty arrays when feature flag is disabled
      const result = {
        ois: params.addresses.map(() => false),
        sids: params.addresses.map(() => null),
      };
      return result;
    }

    try {
      // Get all internal accounts to convert addresses to CAIP format
      const allAccounts = this.messenger.call(
        'AccountsController:listMultichainAccounts',
      );

      // Create a map of address to internal account for quick lookup
      const addressToAccountMap = new Map<string, InternalAccount>();
      for (const account of allAccounts) {
        addressToAccountMap.set(account.address.toLowerCase(), account);
      }

      const {
        cachedOptInResults,
        cachedSubscriptionIds,
        addressesNeedingFresh,
      } = this.checkOptInStatusAgainstCache(
        params.addresses,
        addressToAccountMap,
      );

      // Make fresh API call only for addresses without cached data
      let freshOptInResults: boolean[] = [];
      let freshSubscriptionIds: (string | null)[] = [];
      if (addressesNeedingFresh.length > 0) {
        Logger.log(
          'RewardsController: Making fresh opt-in status API call for addresses without cached data',
          {
            cachedCount: cachedOptInResults.filter((result) => result !== null)
              .length,
            needFreshCount: addressesNeedingFresh.length,
          },
        );

        const freshResponse = await this.messenger.call(
          'RewardsDataService:getOptInStatus',
          { addresses: addressesNeedingFresh },
        );
        freshOptInResults = freshResponse.ois;
        freshSubscriptionIds = freshResponse.sids;

        // Update state with fresh results for future caching
        for (let i = 0; i < addressesNeedingFresh.length; i++) {
          const address = addressesNeedingFresh[i];
          const hasOptedIn = freshOptInResults[i];
          const subscriptionId =
            Array.isArray(freshSubscriptionIds) &&
            i < freshSubscriptionIds.length
              ? freshSubscriptionIds[i]
              : null;
          const internalAccount = addressToAccountMap.get(
            address.toLowerCase(),
          );

          if (internalAccount) {
            const caipAccount =
              this.convertInternalAccountToCaipAccountId(internalAccount);
            if (caipAccount) {
              const lastFreshOptInStatusCheck = Date.now();
              this.update((state: RewardsControllerState) => {
                // Update or create account state with fresh opt-in status and subscription ID
                if (!state.accounts[caipAccount]) {
                  state.accounts[caipAccount] = {
                    account: caipAccount,
                    hasOptedIn,
                    subscriptionId,
                    perpsFeeDiscount: null,
                    lastPerpsDiscountRateFetched: null,
                    lastFreshOptInStatusCheck,
                  };
                } else {
                  state.accounts[caipAccount].hasOptedIn = hasOptedIn;
                  state.accounts[caipAccount].subscriptionId = subscriptionId;
                  state.accounts[caipAccount].lastFreshOptInStatusCheck =
                    lastFreshOptInStatusCheck;
                }

                if (state.activeAccount?.account === caipAccount) {
                  state.activeAccount.hasOptedIn = hasOptedIn;
                  state.activeAccount.subscriptionId = subscriptionId;
                  state.activeAccount.lastFreshOptInStatusCheck =
                    lastFreshOptInStatusCheck;
                }
              });
            }
          }
        }
      }

      // Combine cached and fresh results in the correct order
      const finalOptInResults: boolean[] = [];
      const finalSubscriptionIds: (string | null)[] = [];
      let freshIndex = 0;

      for (let i = 0; i < params.addresses.length; i++) {
        if (cachedOptInResults[i] !== null) {
          // Use cached result
          finalOptInResults[i] = cachedOptInResults[i] as boolean;
          finalSubscriptionIds[i] = cachedSubscriptionIds[i];
        } else {
          // Use fresh result
          finalOptInResults[i] = freshOptInResults[freshIndex];
          finalSubscriptionIds[i] = freshSubscriptionIds[freshIndex];
          freshIndex++;
        }
      }

      return { ois: finalOptInResults, sids: finalSubscriptionIds };
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to get opt-in status:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Get perps fee discount for an account with caching and threshold logic
   * @param account - The account address in CAIP-10 format
   * @returns Promise<number> - The discount in basis points
   */
  async getPerpsDiscountForAccount(account: CaipAccountId): Promise<number> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) return 0;
    const perpsDiscountData = await this.#getPerpsFeeDiscountData(account);
    return perpsDiscountData?.discountBips || 0;
  }

  /**
   * Triggers a balance update if newer points events are detected
   * @param pointsEvents - The points events response from the API
   * @param params - The original request parameters containing seasonId and subscriptionId
   */
  private triggerBalanceUpdateIfNeeded(
    pointsEvents: PaginatedPointsEventsDto,
    params: GetPointsEventsDto,
  ): void {
    // Only proceed if there are results to process
    if (pointsEvents.results.length === 0) {
      return;
    }

    // Find the latest updatedAt from the points events response
    const latestEvent = maxBy(pointsEvents.results, (event) =>
      (event.updatedAt instanceof Date
        ? event.updatedAt
        : new Date(event.updatedAt)
      ).getTime(),
    );

    if (!latestEvent) {
      return;
    }

    const latestUpdatedAt =
      latestEvent.updatedAt instanceof Date
        ? latestEvent.updatedAt.getTime()
        : new Date(latestEvent.updatedAt).getTime();

    // Check if we have an active season status cache for the requested seasonId and subscription id
    const cachedSeasonStatus = this.#getSeasonStatus(
      params.subscriptionId,
      params.seasonId,
    );

    if (!cachedSeasonStatus) {
      return;
    }

    // Compare cache timestamps with latest updatedAt
    // Add 500ms delay to the balance updated timestamp as it's always going to be earlier than the event it was updated for.
    const cacheBalanceUpdatedAt =
      (cachedSeasonStatus.balance.updatedAt || 0) + 500;

    // If cache timestamp is older than the latest event update, emit balance updated event
    if (latestUpdatedAt > cacheBalanceUpdatedAt) {
      Logger.log(
        'RewardsController: Emitting balanceUpdated event due to newer points events',
        {
          seasonId: params.seasonId,
          subscriptionId: params.subscriptionId,
          latestUpdatedAt: new Date(latestUpdatedAt).toISOString(),
          cacheBalanceUpdatedAt: new Date(cacheBalanceUpdatedAt).toISOString(),
        },
      );

      this.invalidateSubscriptionCache(params.subscriptionId, params.seasonId);

      this.messenger.publish('RewardsController:balanceUpdated', {
        seasonId: params.seasonId,
        subscriptionId: params.subscriptionId,
      });
    }
  }

  /**
   * Get points events for a given season
   * @param params - The request parameters
   * @returns Promise<PaginatedPointsEventsDto> - The points events data
   */
  async getPointsEvents(
    params: GetPointsEventsDto,
  ): Promise<PaginatedPointsEventsDto> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) return { has_more: false, cursor: null, results: [] };

    // If cursor is provided, always fetch fresh and do not touch cache
    if (params.cursor) {
      const dto = await this.messenger.call(
        'RewardsDataService:getPointsEvents',
        params,
      );
      this.triggerBalanceUpdateIfNeeded(dto, params);
      return dto;
    }

    if (params.forceFresh) {
      const dto = await this.getPointsEventsIfChanged(params);
      this.triggerBalanceUpdateIfNeeded(dto, params);
      return dto;
    }

    // First page: use cached data with SWR background refresh
    const cacheKey = this.#createSeasonSubscriptionCompositeKey(
      params.seasonId,
      params.subscriptionId,
    );

    const result = await wrapWithCache<PaginatedPointsEventsDto>({
      key: cacheKey,
      ttl: POINTS_EVENTS_CACHE_THRESHOLD_MS,
      readCache: (key) => {
        const cached = this.state.pointsEvents[key];
        return cached
          ? {
              payload: this.#convertPointsEventsStateToDto(cached),
              lastFetched: cached.lastFetched,
            }
          : undefined;
      },
      fetchFresh: async () => {
        try {
          Logger.log(
            'RewardsController: Fetching fresh points events data via API call for seasonId & subscriptionId & page cursor',
            {
              seasonId: params.seasonId,
              subscriptionId: params.subscriptionId,
              cursor: params.cursor,
            },
          );
          const pointsEvents = await this.getPointsEventsIfChanged(params);
          this.triggerBalanceUpdateIfNeeded(pointsEvents, params);
          return pointsEvents;
        } catch (error) {
          Logger.log(
            'RewardsController: Failed to get points events:',
            error instanceof Error ? error.message : String(error),
          );
          throw error;
        }
      },
      writeCache: (key, pointsEventsDto) => {
        this.update((state: RewardsControllerState) => {
          state.pointsEvents[key] =
            this.#convertPointsEventsToState(pointsEventsDto);
        });
      },
      swrCallback: (old, fresh) => {
        const oldMostRecentId = old?.results?.[0]?.id || '';
        const freshMostRecentId = fresh?.results?.[0]?.id || '';
        if (oldMostRecentId !== freshMostRecentId) {
          Logger.log(
            'RewardsController: Emitting pointsEventsUpdated event due to new points events',
            {
              seasonId: params.seasonId,
              subscriptionId: params.subscriptionId,
            },
          );
          // Let UI know first page cache has been refreshed so it can re-query
          this.messenger.publish('RewardsController:pointsEventsUpdated', {
            seasonId: params.seasonId,
            subscriptionId: params.subscriptionId,
          });
        }
      },
    });

    return result;
  }

  async getPointsEventsIfChanged(
    params: GetPointsEventsDto,
  ): Promise<PaginatedPointsEventsDto> {
    const cacheKey = this.#createSeasonSubscriptionCompositeKey(
      params.seasonId,
      params.subscriptionId,
    );

    const hasPointsEventsChanged = await this.hasPointsEventsChanged(params);

    // If no new points events have been added, return cached data
    if (!hasPointsEventsChanged) {
      return this.state.pointsEvents[cacheKey]
        ? this.#convertPointsEventsStateToDto(this.state.pointsEvents[cacheKey])
        : {
            has_more: false,
            cursor: null,
            results: [],
          };
    }

    return await this.messenger.call(
      'RewardsDataService:getPointsEvents',
      params,
    );
  }

  /**
   * Get points events last updated for a given season
   * @param params - The request parameters
   * @returns Promise<Date | null> - The points events last updated date
   */
  async getPointsEventsLastUpdated(
    params: GetPointsEventsLastUpdatedDto,
  ): Promise<Date | null> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) return null;
    Logger.log(
      'RewardsController: Getting fresh points events last updated for seasonId & subscriptionId',
      params,
    );
    const result = await this.messenger.call(
      'RewardsDataService:getPointsEventsLastUpdated',
      params,
    );
    return result;
  }

  /**
   * Check if a new points events have been added since the last fetch
   * @param params - The request parameters
   * @returns Promise<boolean> - True if a new points events have been added since the last fetch, false otherwise
   */
  async hasPointsEventsChanged(
    params: GetPointsEventsLastUpdatedDto,
  ): Promise<boolean> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) return false;

    const cached =
      this.state.pointsEvents[
        this.#createSeasonSubscriptionCompositeKey(
          params.seasonId,
          params.subscriptionId,
        )
      ];

    const cachedLatestUpdatedAt = cached?.results?.[0]?.updatedAt;
    // If the cache is empty, we need to fetch fresh data
    if (!cachedLatestUpdatedAt) return true;

    const lastUpdated = await this.getPointsEventsLastUpdated(params);
    return lastUpdated
      ? lastUpdated.getTime() !== cachedLatestUpdatedAt
      : // If the lastUpdated is null with non-empty cache, we need to fetch fresh data
        true;
  }

  /**
   * Estimate points for a given activity
   * @param request - The estimate points request containing activity type and context
   * @returns Promise<EstimatedPointsDto> - The estimated points and bonus information
   * @note For PERPS activities, perpsContext can be a single position or an array for batch estimation.
   * When an array is provided, returns aggregated points (sum) and average bonus.
   */
  async estimatePoints(
    request: EstimatePointsDto,
  ): Promise<EstimatedPointsDto> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) return { pointsEstimate: 0, bonusBips: 0 };

    const activeSeason = await this.hasActiveSeason();
    if (!activeSeason) return { pointsEstimate: 0, bonusBips: 0 };

    try {
      const estimatedPoints = await this.messenger.call(
        'RewardsDataService:estimatePoints',
        request,
      );

      return estimatedPoints;
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to estimate points:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Check if the rewards feature is enabled
   * @returns boolean - True if rewards feature is enabled, false otherwise
   */
  isRewardsFeatureEnabled(): boolean {
    const isDisabled = this.#isDisabled();
    if (isDisabled) return false;
    return true;
  }

  /**
   * Check if there is an active season
   * @returns Promise<boolean> - True if there is an active season, false otherwise
   * An active season exists when getSeasonMetadata('current') returns a value
   * and the current date is between the season's startDate and endDate
   */
  async hasActiveSeason(): Promise<boolean> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      return false;
    }

    try {
      const seasonDto = await this.getSeasonMetadata('current');
      if (!seasonDto) {
        return false;
      }
      return (
        new Date(seasonDto.endDate) >= new Date() &&
        new Date(seasonDto.startDate) <= new Date()
      );
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to check active season:',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * Get season metadata with caching. This fetches and caches the season metadata
   * including id, name, dates, tiers, and activity types.
   * @param type - The type of season to get
   * @returns Promise<SeasonDtoState> - The season metadata
   */
  async getSeasonMetadata(
    type: 'current' | 'previous' = 'current',
  ): Promise<SeasonDtoState | null> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      return null;
    }

    const result = await wrapWithCache<SeasonDtoState>({
      key: type,
      ttl: SEASON_METADATA_CACHE_THRESHOLD_MS,
      readCache: (key) => {
        const cached = this.state.seasons[key] || undefined;
        if (!cached) return;
        return { payload: cached, lastFetched: cached.lastFetched };
      },
      fetchFresh: async () => {
        Logger.log(
          'RewardsController: Fetching fresh season metadata via API call for type',
          type,
        );

        // Get discover seasons to find if this season has a valid start date
        const discoverSeasons = (await this.messenger.call(
          'RewardsDataService:getDiscoverSeasons',
        )) as DiscoverSeasonsDto;

        let seasonInfo = null;

        if (type === 'previous') {
          seasonInfo = discoverSeasons.previous;
        } else if (type === 'current') {
          seasonInfo = discoverSeasons.current;
        }

        // If found with valid start date, fetch metadata and populate cache
        if (seasonInfo?.startDate) {
          Logger.log(
            'RewardsController: Found season with valid start date, fetching metadata for',
            type,
          );

          // Fetch season metadata
          const seasonMetadata = (await this.messenger.call(
            'RewardsDataService:getSeasonMetadata',
            seasonInfo.id,
          )) as SeasonMetadataDto;

          // Convert to state format
          const seasonStateFromMetadata = this.#convertSeasonToState({
            id: seasonMetadata.id,
            name: seasonMetadata.name,
            startDate: seasonMetadata.startDate,
            endDate: seasonMetadata.endDate,
            tiers: seasonMetadata.tiers,
            activityTypes: seasonMetadata.activityTypes,
            shouldInstallNewVersion:
              seasonMetadata.shouldInstallNewVersion?.mobile,
          });

          // Add lastFetched timestamp
          const seasonStateWithTimestamp = {
            ...seasonStateFromMetadata,
            lastFetched: Date.now(),
          };

          return seasonStateWithTimestamp;
        }

        this.update((state: RewardsControllerState) => {
          delete state.seasons[type];
        });

        throw new Error(
          `No valid season metadata could be found for type: ${type}`,
        );
      },
      writeCache: (key, value) => {
        this.update((state: RewardsControllerState) => {
          state.seasons[key] = value;
          state.seasons[value.id] = value;
        });
      },
    });

    return result;
  }

  /**
   * Get season status with caching
   * @param seasonId - The ID of the season to get status for
   * @param subscriptionId - The subscription ID for authentication
   * @returns Promise<SeasonStatusState> - The season status data
   */
  async getSeasonStatus(
    subscriptionId: string,
    seasonId: string,
  ): Promise<SeasonStatusState | null> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      return null;
    }

    const season = this.state.seasons[seasonId];
    if (!season) {
      throw new Error(
        `Failed to get season status: season not found for seasonId: ${seasonId}`,
      );
    }

    const result = await wrapWithCache<SeasonStatusState>({
      key: this.#createSeasonSubscriptionCompositeKey(seasonId, subscriptionId),
      ttl: SEASON_STATUS_CACHE_THRESHOLD_MS,
      readCache: (key) => {
        const cached = this.state.seasonStatuses[key] || undefined;
        if (!cached) return;
        return { payload: cached, lastFetched: cached.lastFetched };
      },
      fetchFresh: async () => {
        try {
          Logger.log(
            'RewardsController: Fetching fresh season status data via API call for subscriptionId & seasonId',
            subscriptionId,
            seasonId,
          );

          // Now fetch season status (balance, currentTierId, etc.)
          const seasonState = await this.messenger.call(
            'RewardsDataService:getSeasonStatus',
            seasonId,
            subscriptionId,
          );

          // Combine all data into SeasonStatusDto
          const seasonStatus = this.convertToSeasonStatusDto(
            season,
            seasonState,
          );

          return this.#convertSeasonStatusToSubscriptionState(seasonStatus);
        } catch (error) {
          if (error instanceof AuthorizationFailedError) {
            // Attempt to reauth with a valid account.
            try {
              if (this.state.activeAccount?.subscriptionId === subscriptionId) {
                const account = await this.messenger.call(
                  'AccountsController:getSelectedMultichainAccount',
                );
                Logger.log(
                  'RewardsController: Attempting to reauth with a valid account after 403 error',
                );
                await this.performSilentAuth(account, false, false); // try and auth.
              } else if (
                this.state.accounts &&
                Object.values(this.state.accounts).length > 0
              ) {
                const accountForSub = Object.values(this.state.accounts).find(
                  (acc) => acc.subscriptionId === subscriptionId,
                );
                if (accountForSub) {
                  const accounts = await this.messenger.call(
                    'AccountsController:listMultichainAccounts',
                  );
                  const convertInternalAccountToCaipAccountId =
                    this.convertInternalAccountToCaipAccountId;
                  const intAccountForSub = accounts.find(
                    (acc: InternalAccount) => {
                      const accCaipId =
                        convertInternalAccountToCaipAccountId(acc);
                      return accCaipId === accountForSub.account;
                    },
                  );
                  if (intAccountForSub) {
                    Logger.log(
                      'RewardsController: Attempting to reauth with any valid account after 403 error',
                    );
                    await this.performSilentAuth(
                      intAccountForSub as InternalAccount,
                      false,
                      false,
                    );
                  }
                }
              }
              // Now fetch season status (balance, currentTierId, etc.)
              const seasonState = await this.messenger.call(
                'RewardsDataService:getSeasonStatus',
                season.id,
                subscriptionId,
              );

              // Combine all data into SeasonStatusDto
              const seasonStatus = this.convertToSeasonStatusDto(
                season,
                seasonState,
              );

              Logger.log(
                'RewardsController: Successfully fetched season status after reauth',
              );
              return this.#convertSeasonStatusToSubscriptionState(seasonStatus);
            } catch {
              Logger.log(
                'RewardsController: Failed to reauth with a valid account after 403 error',
                error instanceof Error ? error.message : String(error),
              );
              this.invalidateSubscriptionCache(subscriptionId);
              await this.invalidateAccountsAndSubscriptions();
              throw error;
            }
          } else if (error instanceof SeasonNotFoundError) {
            this.update((state: RewardsControllerState) => {
              state.seasons = {};
            });
            throw error;
          }
          Logger.log(
            'RewardsController: Failed to get season status:',
            error instanceof Error ? error.message : String(error),
          );
          throw error;
        }
      },
      writeCache: (key, subscriptionSeasonStatus) => {
        this.update((state: RewardsControllerState) => {
          // Update season status with composite key
          state.seasonStatuses[key] = subscriptionSeasonStatus;
        });
      },
    });

    return result;
  }

  async invalidateAccountsAndSubscriptions() {
    this.update((state: RewardsControllerState) => {
      if (state.activeAccount) {
        state.activeAccount = {
          ...state.activeAccount,
          lastPerpsDiscountRateFetched: null,
          perpsFeeDiscount: null,
          hasOptedIn: false,
          subscriptionId: null,
          lastFreshOptInStatusCheck: null,
          account: state.activeAccount.account, // Ensure account is always present (never undefined)
        };
      }
      state.accounts = {};
      state.subscriptions = {};
    });
    await resetAllSubscriptionTokens();
    Logger.log('RewardsController: Invalidated accounts and subscriptions');
  }

  /**
   * Get referral details with caching
   * @param subscriptionId - The subscription ID for authentication
   * @param seasonId - The season ID to get referral details for
   * @returns Promise<SubscriptionSeasonReferralDetailsDto> - The referral details data
   */
  async getReferralDetails(
    subscriptionId: string,
    seasonId: string,
  ): Promise<SubscriptionSeasonReferralDetailState | null> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      return null;
    }
    const compositeKey = this.#createSeasonSubscriptionCompositeKey(
      seasonId,
      subscriptionId,
    );
    const result = await wrapWithCache<SubscriptionSeasonReferralDetailState>({
      key: compositeKey,
      ttl: REFERRAL_DETAILS_CACHE_THRESHOLD_MS,
      readCache: (key) => {
        const cached = this.state.subscriptionReferralDetails[key] || undefined;
        if (!cached) return;
        return { payload: cached, lastFetched: cached.lastFetched };
      },
      fetchFresh: async () => {
        try {
          Logger.log(
            'RewardsController: Fetching fresh referral details data via API call for',
            { subscriptionId, seasonId },
          );
          const referralDetails = await this.messenger.call(
            'RewardsDataService:getReferralDetails',
            seasonId,
            subscriptionId,
          );
          return {
            referralCode: referralDetails.referralCode,
            totalReferees: referralDetails.totalReferees,
            referralPoints: referralDetails.referralPoints,
            lastFetched: Date.now(),
          };
        } catch (error) {
          Logger.log(
            'RewardsController: Failed to get referral details:',
            error instanceof Error ? error.message : String(error),
          );
          throw error;
        }
      },
      writeCache: (key, payload) => {
        this.update((state: RewardsControllerState) => {
          state.subscriptionReferralDetails[key] = payload;
        });
      },
    });

    return result;
  }

  /**
   * Perform the complete opt-in process for rewards
   * @param accounts - Array of internal accounts to opt in
   * @param referralCode - Optional referral code
   */
  async optIn(
    accounts: InternalAccount[],
    referralCode?: string,
  ): Promise<string | null> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      Logger.log(
        'RewardsController: Rewards feature is disabled, skipping optin',
      );
      return null;
    }

    if (!accounts || accounts.length === 0) {
      Logger.log('RewardsController: No accounts provided, skipping optin');
      return null;
    }

    Logger.log(
      'RewardsController: Starting optin process based on account group with {{accountCount}} accounts',
      {
        accountCount: accounts.length,
      },
    );

    // Sort accounts using utility function
    const sortedAccounts = sortAccounts(accounts);

    // Try to opt in iteratively
    let successfulAccount: InternalAccount | null = null;
    let optinResult: {
      subscription: SubscriptionDto;
      sessionId: string;
    } | null = null;

    for (const accountToTry of sortedAccounts) {
      Logger.log(
        'RewardsController: Trying opt-in for account',
        accountToTry.address,
      );

      try {
        optinResult = await this.#optIn(accountToTry, referralCode);
      } catch {
        // Silent auth failed for this account
      }

      if (optinResult) {
        successfulAccount = accountToTry;
        Logger.log(
          'RewardsController: Opt-in successful for account',
          accountToTry.address,
        );
        break;
      }
    }

    if (!successfulAccount || !optinResult) {
      throw new Error('Failed to opt in any account from the account group');
    }

    // Link all other accounts to the successful subscription
    const remainingAccounts = sortedAccounts.filter(
      (accountToFilter) =>
        accountToFilter.address !== successfulAccount?.address,
    );

    if (remainingAccounts.length > 0) {
      Logger.log(
        'RewardsController: Linking remaining {{count}} accounts to subscription',
        {
          count: remainingAccounts.length,
          subscriptionId: optinResult.subscription.id,
        },
      );

      await this.linkAccountsToSubscriptionCandidate(remainingAccounts);
    }

    return optinResult?.subscription.id || null;
  }

  /**
   * Private method to perform opt-in for a single internal account (using mobile opt-in logic)
   * @param account - The internal account to opt in
   * @param referralCode - Optional referral code
   * @returns Promise with subscription data or null if failed
   */
  async #optIn(
    account: InternalAccount,
    referralCode?: string,
  ): Promise<{ subscription: SubscriptionDto; sessionId: string } | null> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      Logger.log(
        'RewardsController: Rewards feature is disabled, skipping optin',
        {
          account: account.address,
        },
      );
      return null;
    }
    Logger.log('RewardsController: Starting optin process', {
      account: account.address,
    });
    // Generate timestamp and sign the message for mobile optin
    let timestamp = Math.floor(Date.now() / 1000);
    let signature = await this.#signRewardsMessage(account, timestamp);
    let retryAttempt = 0;
    const MAX_RETRY_ATTEMPTS = 1;
    const executeMobileOptin = async (
      ts: number,
      sig: string,
    ): Promise<LoginResponseDto> => {
      try {
        return await this.messenger.call('RewardsDataService:mobileOptin', {
          account: account.address,
          timestamp: ts,
          signature: sig as `0x${string}`,
          referralCode,
        });
      } catch (error) {
        // Check if it's an InvalidTimestampError and we haven't exceeded retry attempts
        if (
          error instanceof InvalidTimestampError &&
          retryAttempt < MAX_RETRY_ATTEMPTS
        ) {
          retryAttempt++;
          Logger.log('RewardsController: Retrying with server timestamp', {
            originalTimestamp: ts,
            newTimestamp: error.timestamp,
          });
          // Use the timestamp from the error for retry
          timestamp = error.timestamp;
          signature = await this.#signRewardsMessage(account, timestamp);
          return await executeMobileOptin(timestamp, signature);
        }

        // Check if it's an AccountAlreadyRegisteredError
        if (error instanceof AccountAlreadyRegisteredError) {
          // Try to perform silent auth for this account
          const subscriptionId = await this.performSilentAuth(
            account,
            false,
            false,
          );

          // If silent auth returned a subscription ID, recover with login response
          if (subscriptionId && this.state.subscriptions[subscriptionId]) {
            const subscription = this.state.subscriptions[subscriptionId];
            const tokenResult = await getSubscriptionToken(subscriptionId);
            if (tokenResult.success && tokenResult.token) {
              return {
                sessionId: tokenResult.token,
                subscription,
              };
            }
          }
        }

        throw error;
      }
    };
    try {
      const optinResponse = await executeMobileOptin(timestamp, signature);
      Logger.log(
        'RewardsController: Optin successful, updating controller state...',
        account.address,
      );
      // Store the subscription token for authenticated requests
      if (optinResponse.subscription?.id && optinResponse.sessionId) {
        await storeSubscriptionToken(
          optinResponse.subscription.id,
          optinResponse.sessionId,
        ).catch((error) => {
          Logger.log(
            'RewardsController: Failed to store subscription token:',
            error,
          );
        });
      }
      // Update state with opt-in response data
      this.update((state) => {
        const caipAccount: CaipAccountId | null =
          this.convertInternalAccountToCaipAccountId(account);
        if (!caipAccount) {
          return;
        }
        const accountState: RewardsAccountState = {
          account: caipAccount,
          hasOptedIn: true,
          subscriptionId: optinResponse.subscription.id,
          perpsFeeDiscount: null,
          lastPerpsDiscountRateFetched: null,
        };
        if (
          state.activeAccount &&
          state.activeAccount.account === caipAccount
        ) {
          state.activeAccount = accountState;
        }

        state.accounts[caipAccount] = accountState;
        state.subscriptions[optinResponse.subscription.id] =
          optinResponse.subscription;
      });
      return {
        subscription: optinResponse.subscription,
        sessionId: optinResponse.sessionId,
      };
    } catch (error) {
      Logger.log(
        'RewardsController: Opt-in failed for account',
        account.address,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * Reset rewards account state and clear all access tokens
   */
  async resetAll(): Promise<void> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      Logger.log(
        'RewardsController: Rewards feature is disabled, skipping reset',
      );
      return;
    }

    try {
      const currentActiveAccount = this.state.activeAccount?.account;
      this.resetState();
      this.update((state: RewardsControllerState) => {
        if (currentActiveAccount) {
          state.activeAccount = {
            account: currentActiveAccount,
            hasOptedIn: false,
            subscriptionId: null,
            perpsFeeDiscount: null,
            lastPerpsDiscountRateFetched: null,
            lastFreshOptInStatusCheck: null,
          };
        }
      });

      // Remove all tokens from secure storage
      await resetAllSubscriptionTokens();

      Logger.log('RewardsController: Reset completed successfully');
    } catch (error) {
      Logger.log(
        'RewardsController: Reset failed to complete',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Logout user from rewards and clear associated data
   * @param subscriptionId - Optional subscription ID to logout from
   */
  async logout(): Promise<void> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      Logger.log(
        'RewardsController: Rewards feature is disabled, skipping logout',
      );
      return;
    }

    if (!this.state.activeAccount?.subscriptionId) {
      Logger.log('RewardsController: No authenticated account found');
      return;
    }

    const subscriptionId = this.state.activeAccount.subscriptionId;

    try {
      // Call the data service logout if subscriptionId is provided
      await this.messenger.call('RewardsDataService:logout', subscriptionId);

      // Remove the session token from storage
      await removeSubscriptionToken(subscriptionId);

      // Update controller state to reflect logout
      this.update((state) => {
        // Clear last authenticated account if it matches this subscription
        if (state.activeAccount?.subscriptionId === subscriptionId) {
          delete state.accounts[state.activeAccount.account];
          state.activeAccount = null;
        }
      });

      Logger.log('RewardsController: Logout completed successfully');
    } catch (error) {
      Logger.log(
        'RewardsController: Logout failed to complete',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Get geo rewards metadata including location and support status
   * @returns Promise<GeoRewardsMetadata> - The geo rewards metadata
   */
  async getGeoRewardsMetadata(): Promise<GeoRewardsMetadata> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      return {
        geoLocation: 'UNKNOWN',
        optinAllowedForGeo: false,
      };
    }

    if (this.#geoLocation) {
      return this.#geoLocation;
    }

    try {
      Logger.log(
        'RewardsController: Fetching geo location for rewards metadata',
      );

      // Get geo location from data service
      const geoLocation = await this.messenger.call(
        'RewardsDataService:fetchGeoLocation',
      );

      // Check if the location is supported (not in blocked regions)
      const optinAllowedForGeo = !DEFAULT_BLOCKED_REGIONS.some(
        (blockedRegion) => geoLocation.startsWith(blockedRegion),
      );

      const result: GeoRewardsMetadata = {
        geoLocation,
        optinAllowedForGeo,
      };

      Logger.log('RewardsController: Geo rewards metadata retrieved', result);
      this.#geoLocation = result;
      return result;
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to get geo rewards metadata:',
        error instanceof Error ? error.message : String(error),
      );

      // Return fallback metadata on error
      return {
        geoLocation: 'UNKNOWN',
        optinAllowedForGeo: true,
      };
    }
  }

  /**
   * Validate a referral code
   * @param code - The referral code to validate
   * @returns Promise<boolean> - True if the code is valid, false otherwise
   */
  async validateReferralCode(code: string): Promise<boolean> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      return false;
    }

    if (!code.trim()) {
      return false;
    }

    if (code.length !== 6) {
      return false;
    }

    try {
      const response = await this.messenger.call(
        'RewardsDataService:validateReferralCode',
        code,
      );
      return response.valid;
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to validate referral code:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Get candidate subscription ID with fallback logic
   * @returns Promise<string | null> - The subscription ID or null if none found
   */
  async getCandidateSubscriptionId(): Promise<string | null> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      return null;
    }

    // First, check if there's an active account with a subscription
    if (this.state.activeAccount?.subscriptionId) {
      return this.state.activeAccount.subscriptionId;
    }

    // Fallback to the first subscription ID from the subscriptions map
    const subscriptionIds = Object.keys(this.state.subscriptions);
    if (subscriptionIds.length > 0) {
      return subscriptionIds[0];
    }

    // If no subscriptions found, call optinstatus for all internal accounts
    try {
      const allAccounts = this.messenger.call(
        'AccountsController:listMultichainAccounts',
      );

      // Extract addresses from internal accounts using isOptInSupported
      const supportedAccounts: InternalAccount[] =
        allAccounts?.filter((account: InternalAccount) =>
          this.isOptInSupported(account),
        ) || [];
      if (!supportedAccounts || supportedAccounts.length === 0) {
        return null;
      }

      const addresses = supportedAccounts.map(
        (account: InternalAccount) => account.address,
      );

      // Call opt-in status check
      const optInStatusResponse = await this.getOptInStatus({ addresses });
      if (!optInStatusResponse?.ois?.filter((ois: boolean) => ois).length) {
        Logger.log(
          'RewardsController: No candidate subscription ID found. No opted in accounts found via opt-in status response.',
        );
        return null;
      }

      Logger.log(
        'RewardsController: Found opted in account via opt-in status response. Attempting silent auth to determine candidate subscription ID.',
      );

      // Loop through all accounts that have opted in (ois[i] === true)
      // Only process the first 10 accounts with a 500ms delay between each
      const maxSilentAuthAttempts = Math.min(
        10,
        optInStatusResponse.ois.length,
      );
      let silentAuthAttempts = 0;
      for (let i = 0; i < supportedAccounts.length; i++) {
        if (silentAuthAttempts > maxSilentAuthAttempts) break;
        const account = supportedAccounts[i];
        if (!account || optInStatusResponse.ois[i] === false) continue;
        // Defensive: Ensure sids is an array and i is within bounds
        let subscriptionId =
          Array.isArray(optInStatusResponse?.sids) &&
          i < optInStatusResponse.sids.length
            ? optInStatusResponse.sids[i]
            : null;
        const sessionToken = subscriptionId
          ? await getSubscriptionToken(subscriptionId)
          : undefined;
        if (
          subscriptionId &&
          Boolean(sessionToken?.token) &&
          Boolean(sessionToken?.success) &&
          Boolean(this.state.subscriptions[subscriptionId])
        ) {
          return subscriptionId;
        }
        try {
          silentAuthAttempts++;
          subscriptionId = await this.performSilentAuth(
            account,
            false, // shouldBecomeActiveAccount = false
            false, // respectSkipSilentAuth = false
          );
          if (subscriptionId) {
            Logger.log(
              'RewardsController: Found candidate subscription ID via opt-in status response.',
              {
                subscriptionId,
              },
            );

            return subscriptionId;
          }
        } catch (error) {
          // Continue to next account if this one fails
          Logger.log(
            'RewardsController: Silent auth failed for account during candidate search:',
            account.address,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to get candidate subscription ID:',
        error instanceof Error ? error.message : String(error),
      );
    }

    throw new Error(
      'No candidate subscription ID found after all silent auth attempts. There is an opted in account but we cannot use it to fetch the season status.',
    );
  }

  /**
   * Link an account to a subscription via mobile join
   * @param account - The account to link to the subscription
   * @returns Promise<boolean> - The updated subscription information
   */
  async linkAccountToSubscriptionCandidate(
    account: InternalAccount,
    invalidateRelatedData: boolean = true,
  ): Promise<boolean> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      Logger.log('RewardsController: Rewards feature is disabled');
      return false;
    }

    // Convert account to CAIP format
    const caipAccount = this.convertInternalAccountToCaipAccountId(account);
    if (!caipAccount) {
      throw new Error('Failed to convert account to CAIP-10 format');
    }

    // Check if account already has a subscription (short-circuit)
    const existingAccountState = this.#getAccountState(caipAccount);
    if (existingAccountState?.subscriptionId) {
      Logger.log(
        'RewardsController: Account to link already has subscription',
        {
          account: caipAccount,
          subscriptionId: existingAccountState.subscriptionId,
        },
      );
      const existingSubscription =
        this.state.subscriptions[existingAccountState.subscriptionId];
      if (existingSubscription) {
        return true;
      }
    }

    // Get candidate subscription ID using the new method
    const candidateSubscriptionId = await this.getCandidateSubscriptionId();
    if (!candidateSubscriptionId) {
      throw new Error('No valid subscription found to link account to');
    }

    if (!this.isOptInSupported(account)) {
      Logger.log('RewardsController: Account is not supported for opt-in');
      return false;
    }

    try {
      // Generate timestamp and sign the message for mobile join
      let timestamp = Math.floor(Date.now() / 1000);
      let signature = await this.#signRewardsMessage(account, timestamp);
      let retryAttempt = 0;
      const MAX_RETRY_ATTEMPTS = 1;

      // Function to execute the mobile join call
      const executeMobileJoin = async (
        ts: number,
        sig: string,
      ): Promise<SubscriptionDto> => {
        try {
          return await this.messenger.call(
            'RewardsDataService:mobileJoin',
            {
              account: account.address,
              timestamp: ts,
              signature: sig as `0x${string}`,
            },
            candidateSubscriptionId,
          );
        } catch (error) {
          // Check if it's an InvalidTimestampError and we haven't exceeded retry attempts
          if (
            error instanceof InvalidTimestampError &&
            retryAttempt < MAX_RETRY_ATTEMPTS
          ) {
            retryAttempt++;
            Logger.log('RewardsController: Retrying with server timestamp', {
              originalTimestamp: ts,
              newTimestamp: error.timestamp,
            });
            // Use the timestamp from the error for retry
            timestamp = error.timestamp;
            signature = await this.#signRewardsMessage(account, timestamp);
            return await executeMobileJoin(timestamp, signature);
          }

          if (error instanceof AccountAlreadyRegisteredError) {
            // Try to perform silent auth for this account
            const subscriptionId = await this.performSilentAuth(
              account,
              false,
              false,
            );

            // If silent auth returned a subscription ID, return the subscription from cache
            if (subscriptionId && this.state.subscriptions[subscriptionId]) {
              return this.state.subscriptions[subscriptionId];
            }
          }

          throw error;
        }
      };

      // Call mobile join via messenger with retry logic
      const updatedSubscription: SubscriptionDto = await executeMobileJoin(
        timestamp,
        signature,
      );

      // Update store with accounts and subscriptions (but not activeAccount)
      this.update((state: RewardsControllerState) => {
        // Update accounts state
        state.accounts[caipAccount] = {
          account: caipAccount,
          hasOptedIn: true, // via linking this is now opted in.
          subscriptionId: updatedSubscription.id,
          perpsFeeDiscount: null,
          lastPerpsDiscountRateFetched: null,
        };
        if (state.activeAccount?.account === caipAccount) {
          state.activeAccount = state.accounts[caipAccount];
        }
      });

      Logger.log(
        'RewardsController: Successfully linked account to subscription',
        {
          account: caipAccount,
          subscriptionId: updatedSubscription.id,
        },
      );

      // Only invalidate related data if requested
      if (invalidateRelatedData) {
        // Invalidate cache for the linked account
        this.invalidateSubscriptionCache(updatedSubscription.id);

        // Emit event to trigger UI refresh
        this.messenger.publish('RewardsController:accountLinked', {
          subscriptionId: updatedSubscription.id,
          account: caipAccount,
        });
      }

      return true;
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to link account to subscription',
        caipAccount,
        candidateSubscriptionId,
        error,
      );
      return false;
    }
  }

  /**
   * Link multiple accounts to a subscription candidate
   * @param accounts - Array of accounts to link to the subscription
   */
  async linkAccountsToSubscriptionCandidate(
    accounts: InternalAccount[],
  ): Promise<{ account: InternalAccount; success: boolean }[]> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      Logger.log('RewardsController: Rewards feature is disabled');
      return accounts.map((account) => ({ account, success: false }));
    }

    if (accounts.length === 0) {
      return [];
    }

    let lastSuccessfullyLinked: RewardsAccountState | null = null;
    const results: { account: InternalAccount; success: boolean }[] = [];

    for (const accountToLink of accounts) {
      try {
        const caipAccountAccountToLink =
          this.convertInternalAccountToCaipAccountId(accountToLink);
        const existingAccountState = this.#getAccountState(
          caipAccountAccountToLink as CaipAccountId,
        );
        if (existingAccountState?.subscriptionId) {
          continue;
        }

        const success = await this.linkAccountToSubscriptionCandidate(
          accountToLink,
          false, // we will invalidate at the end of the loop
        );

        if (success) {
          const accountStateForLinked = this.#getAccountState(
            caipAccountAccountToLink as CaipAccountId,
          );
          if (accountStateForLinked) {
            lastSuccessfullyLinked = accountStateForLinked;
          }
          results.push({ account: accountToLink, success });
        } else {
          results.push({ account: accountToLink, success: false });
        }
      } catch {
        // Continue with other accounts even if one fails
        results.push({ account: accountToLink, success: false });
      }
    }

    // Invalidate cache and emit event if at least one account was successfully linked
    if (lastSuccessfullyLinked?.subscriptionId) {
      // Invalidate cache for the linked account
      this.invalidateSubscriptionCache(lastSuccessfullyLinked.subscriptionId);

      // Emit event to trigger UI refresh
      this.messenger.publish('RewardsController:accountLinked', {
        subscriptionId: lastSuccessfullyLinked.subscriptionId,
        account: lastSuccessfullyLinked.account,
      });
    }

    return results;
  }

  /**
   * Opt out of the rewards program, deleting the subscription and all associated data
   * @returns Promise<boolean> - True if opt-out was successful, false otherwise
   */
  async optOut(subscriptionId: string): Promise<boolean> {
    try {
      // Check if subscription exists in our map or in any of the accounts
      if (!this.state.subscriptions[subscriptionId]) {
        const matchingAccount = this.state.accounts
          ? Object.values(this.state.accounts).find(
              (account) => account.subscriptionId === subscriptionId,
            )
          : null;
        if (!matchingAccount) {
          return false;
        }
      }

      // Call the opt-out endpoint
      const result = await this.messenger.call(
        'RewardsDataService:optOut',
        subscriptionId,
      );

      if (result.success) {
        const currentActiveAccount = this.state.activeAccount?.account;
        this.resetState();
        this.update((state: RewardsControllerState) => {
          if (currentActiveAccount) {
            state.activeAccount = {
              account: currentActiveAccount,
              hasOptedIn: false,
              subscriptionId: null,
              perpsFeeDiscount: null,
              lastPerpsDiscountRateFetched: null,
              lastFreshOptInStatusCheck: null,
            };
          }
        });

        // Remove subscription token from secure storage
        await removeSubscriptionToken(subscriptionId);

        Logger.log(
          'RewardsController: Successfully opted out of rewards program',
          subscriptionId,
        );
        return true;
      }
      Logger.log(
        'RewardsController: Opt-out request returned false',
        subscriptionId,
      );
      return false;
    } catch (error) {
      Logger.log('RewardsController: Failed to opt out', error);
      return false;
    }
  }

  /**
   * Get active points boosts for the current season
   * Get active points boosts for the current season with caching
   * @param seasonId - The season ID to get points boosts for
   * @param subscriptionId - The subscription ID to get points boosts for
   * @returns Promise<PointsBoostDto[]> - The active points boosts
   */
  async getActivePointsBoosts(
    seasonId: string,
    subscriptionId: string,
  ): Promise<PointsBoostDto[]> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      return [];
    }

    const result = await wrapWithCache<PointsBoostDto[]>({
      key: this.#createSeasonSubscriptionCompositeKey(seasonId, subscriptionId),
      ttl: ACTIVE_BOOSTS_CACHE_THRESHOLD_MS,
      readCache: (key) => {
        const cachedActiveBoosts = this.state.activeBoosts[key] || undefined;
        if (!cachedActiveBoosts) return;
        return {
          payload: cachedActiveBoosts.boosts,
          lastFetched: cachedActiveBoosts.lastFetched,
        };
      },
      fetchFresh: async () => {
        try {
          Logger.log(
            'RewardsController: Fetching fresh active boosts data via API call for subscriptionId & seasonId',
            subscriptionId,
            seasonId,
          );
          const response = await this.messenger.call(
            'RewardsDataService:getActivePointsBoosts',
            seasonId,
            subscriptionId,
          );
          return response.boosts;
        } catch (error) {
          Logger.log(
            'RewardsController: Failed to get active points boosts:',
            error instanceof Error ? error.message : String(error),
          );
          throw error;
        }
      },
      writeCache: (key, payload) => {
        this.update((state: RewardsControllerState) => {
          state.activeBoosts[key] = {
            boosts: payload,
            lastFetched: Date.now(),
          };
        });
      },
    });

    return result;
  }

  /**
   * Get unlocked rewards with caching
   * @param seasonId - The season ID
   * @param subscriptionId - The subscription ID for authentication
   * @returns Promise<RewardDto[]> - The unlocked rewards data
   */
  async getUnlockedRewards(
    seasonId: string,
    subscriptionId: string,
  ): Promise<RewardDto[]> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      return [];
    }
    const result = await wrapWithCache<RewardDto[]>({
      key: this.#createSeasonSubscriptionCompositeKey(seasonId, subscriptionId),
      ttl: UNLOCKED_REWARDS_CACHE_THRESHOLD_MS,
      readCache: (key) => {
        const cachedUnlockedRewards =
          this.state.unlockedRewards[key] || undefined;
        if (!cachedUnlockedRewards) return;
        return {
          payload: cachedUnlockedRewards.rewards,
          lastFetched: cachedUnlockedRewards.lastFetched,
        };
      },
      fetchFresh: async () => {
        try {
          Logger.log(
            'RewardsController: Fetching fresh unlocked rewards data via API call for subscriptionId & seasonId',
            subscriptionId,
            seasonId,
          );
          const response = (await this.messenger.call(
            'RewardsDataService:getUnlockedRewards',
            seasonId,
            subscriptionId,
          )) as RewardDto[];
          return response || [];
        } catch (error) {
          Logger.log(
            'RewardsController: Failed to get unlocked rewards:',
            error instanceof Error ? error.message : String(error),
          );
          throw error;
        }
      },
      writeCache: (key, payload) => {
        this.update((state: RewardsControllerState) => {
          state.unlockedRewards[key] = {
            rewards: payload,
            lastFetched: Date.now(),
          };
        });
      },
    });

    return result;
  }

  /**
   * Claim a reward
   * @param rewardId - The reward ID
   * @param dto - The claim reward request body
   * @param subscriptionId - The subscription ID for authentication
   */
  async claimReward(
    rewardId: string,
    subscriptionId: string,
    dto?: ClaimRewardDto,
  ): Promise<void> {
    const rewardsEnabled = this.isRewardsFeatureEnabled();
    if (!rewardsEnabled) {
      throw new Error('Rewards are not enabled');
    }
    try {
      await this.messenger.call(
        'RewardsDataService:claimReward',
        rewardId,
        subscriptionId,
        dto,
      );

      // Invalidate cache for the active subscription
      this.invalidateSubscriptionCache(subscriptionId);

      // Emit event to trigger UI refresh
      this.messenger.publish('RewardsController:rewardClaimed', {
        rewardId,
        subscriptionId,
      });

      Logger.log('RewardsController: Successfully claimed reward', {
        rewardId,
        subscriptionId,
      });
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to claim reward:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Invalidate cached data for a subscription
   * @param subscriptionId - The subscription ID to invalidate cache for
   * @param seasonId - The season ID (defaults to current season)
   */
  invalidateSubscriptionCache(subscriptionId: string, seasonId?: string): void {
    if (seasonId) {
      // Invalidate specific season
      const compositeKey = this.#createSeasonSubscriptionCompositeKey(
        seasonId,
        subscriptionId,
      );
      this.update((state: RewardsControllerState) => {
        delete state.seasonStatuses[compositeKey];
        delete state.unlockedRewards[compositeKey];
        delete state.activeBoosts[compositeKey];
        delete state.pointsEvents[compositeKey];
      });
    } else {
      // Invalidate all seasons for this subscription
      this.update((state: RewardsControllerState) => {
        Object.keys(state.seasonStatuses).forEach((key) => {
          if (key.includes(subscriptionId)) {
            delete state.seasonStatuses[key];
          }
        });
        Object.keys(state.unlockedRewards).forEach((key) => {
          if (key.includes(subscriptionId)) {
            delete state.unlockedRewards[key];
          }
        });
        Object.keys(state.activeBoosts).forEach((key) => {
          if (key.includes(subscriptionId)) {
            delete state.activeBoosts[key];
          }
        });
        Object.keys(state.pointsEvents).forEach((key) => {
          if (key.includes(subscriptionId)) {
            delete state.pointsEvents[key];
          }
        });
      });
    }

    Logger.log(
      'RewardsController: Invalidated cache for subscription',
      subscriptionId,
      seasonId || 'all seasons',
    );
  }
}
