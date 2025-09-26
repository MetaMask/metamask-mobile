import { BaseController } from '@metamask/base-controller';
import { toHex } from '@metamask/controller-utils';
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
  type SubscriptionReferralDetailsState,
  type GeoRewardsMetadata,
  type SeasonStatusDto,
  type SubscriptionDto,
  type PaginatedPointsEventsDto,
  type GetPointsEventsDto,
  type OptInStatusInputDto,
  type OptInStatusDto,
  type PointsBoostDto,
  type ActiveBoostsState,
  type UnlockedRewardsState,
  type RewardDto,
  CURRENT_SEASON_ID,
  ClaimRewardDto,
} from './types';
import type { RewardsControllerMessenger } from '../../messengers/rewards-controller-messenger';
import {
  storeSubscriptionToken,
  removeSubscriptionToken,
} from './utils/multi-subscription-token-vault';
import Logger from '../../../../util/Logger';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { isHardwareAccount } from '../../../../util/address';
import { selectRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { store } from '../../../../store';
import {
  CaipAccountId,
  parseCaipChainId,
  toCaipAccountId,
} from '@metamask/utils';
import { base58 } from 'ethers/lib/utils';
import { isNonEvmAddress } from '../../../Multichain/utils';
import { signSolanaRewardsMessage } from './utils/solana-snap';

// Re-export the messenger type for convenience
export type { RewardsControllerMessenger };

export const DEFAULT_BLOCKED_REGIONS = ['UK'];

const controllerName = 'RewardsController';

// Silent authentication constants
const AUTH_GRACE_PERIOD_MS = 1000 * 60 * 10; // 10 minutes

// Perps discount refresh threshold
const PERPS_DISCOUNT_CACHE_THRESHOLD_MS = 1000 * 60 * 5; // 5 minutes

// Season status cache threshold
const SEASON_STATUS_CACHE_THRESHOLD_MS = 1000 * 60 * 1; // 1 minute

// Referral details cache threshold
const REFERRAL_DETAILS_CACHE_THRESHOLD_MS = 1000 * 60 * 10; // 10 minutes

// Active boosts cache threshold
const ACTIVE_BOOSTS_CACHE_THRESHOLD_MS = 1000 * 60 * 1; // 1 minute

// Unlocked rewards cache threshold
const UNLOCKED_REWARDS_CACHE_THRESHOLD_MS = 1000 * 60 * 1; // 1 minute

/**
 * State metadata for the RewardsController
 */
const metadata = {
  activeAccount: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  accounts: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  subscriptions: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  seasons: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  subscriptionReferralDetails: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  seasonStatuses: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  activeBoosts: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
    usedInUi: true,
  },
  unlockedRewards: {
    includeInStateLogs: true,
    persist: true,
    anonymous: false,
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
});

export const defaultRewardsControllerState = getRewardsControllerDefaultState();

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
  #currentSeasonIdMap: Record<string, string> = {};

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
        refereePortion: seasonStatus.balance.refereePortion,
        updatedAt: seasonStatus.balance.updatedAt?.getTime(),
      },
      tier: tierState,
      lastFetched: Date.now(),
    };
  }

  constructor({
    messenger,
    state,
  }: {
    messenger: RewardsControllerMessenger;
    state?: Partial<RewardsControllerState>;
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

    this.#registerActionHandlers();
    this.#initializeEventSubscriptions();
  }

  /**
   * Register action handlers for this controller
   */
  #registerActionHandlers(): void {
    this.messagingSystem.registerActionHandler(
      'RewardsController:getHasAccountOptedIn',
      this.getHasAccountOptedIn.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:getPointsEvents',
      this.getPointsEvents.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:estimatePoints',
      this.estimatePoints.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:getPerpsDiscountForAccount',
      this.getPerpsDiscountForAccount.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:isRewardsFeatureEnabled',
      this.isRewardsFeatureEnabled.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:getSeasonStatus',
      this.getSeasonStatus.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:getReferralDetails',
      this.getReferralDetails.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:optIn',
      this.optIn.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:logout',
      this.logout.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:getGeoRewardsMetadata',
      this.getGeoRewardsMetadata.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:validateReferralCode',
      this.validateReferralCode.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:linkAccountToSubscriptionCandidate',
      this.linkAccountToSubscriptionCandidate.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:getCandidateSubscriptionId',
      this.getCandidateSubscriptionId.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:optOut',
      this.optOut.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:getOptInStatus',
      this.getOptInStatus.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:getActivePointsBoosts',
      this.getActivePointsBoosts.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:getUnlockedRewards',
      this.getUnlockedRewards.bind(this),
    );
    this.messagingSystem.registerActionHandler(
      'RewardsController:claimReward',
      this.claimReward.bind(this),
    );
  }

  /**
   * Initialize event subscriptions based on feature flag state
   */
  #initializeEventSubscriptions(): void {
    // Subscribe to account changes for silent authentication
    this.messagingSystem.subscribe(
      'AccountsController:selectedAccountChange',
      () => this.#handleAuthenticationTrigger('Account changed'),
    );

    // Subscribe to KeyringController unlock events to retry silent auth
    this.messagingSystem.subscribe('KeyringController:unlock', () =>
      this.#handleAuthenticationTrigger('KeyringController unlocked'),
    );

    // Initialize silent authentication on startup
    this.#handleAuthenticationTrigger('Controller initialized');
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
    return this.state.accounts[account] || null;
  }

  /**
   * Create composite key for state storage
   */
  #createSeasonSubscriptionCompositeKey(
    seasonId: string,
    subscriptionId: string,
  ): string {
    if (
      seasonId === CURRENT_SEASON_ID &&
      this.#currentSeasonIdMap[CURRENT_SEASON_ID]
    ) {
      seasonId = this.#currentSeasonIdMap[CURRENT_SEASON_ID];
    }
    return `${seasonId}:${subscriptionId}`;
  }

  /**
   * Get stored season status for a given composite key
   */
  #getSeasonStatus(
    subscriptionId: string,
    seasonId: string = CURRENT_SEASON_ID,
  ): SeasonStatusState | null {
    const compositeKey = this.#createSeasonSubscriptionCompositeKey(
      seasonId,
      subscriptionId,
    );
    return this.state.seasonStatuses[compositeKey] || null;
  }

  /**
   * Get stored active boosts for a given composite key
   */
  #getActiveBoosts(
    subscriptionId: string,
    seasonId: string,
  ): ActiveBoostsState | null {
    const compositeKey = this.#createSeasonSubscriptionCompositeKey(
      seasonId,
      subscriptionId,
    );
    return this.state.activeBoosts[compositeKey] || null;
  }

  /**
   * Get cached unlocked rewards for a subscription and season
   * @param subscriptionId - The subscription ID
   * @param seasonId - The season ID (defaults to current season)
   * @returns The cached unlocked rewards state or null if not found
   */
  #getUnlockedRewards(
    subscriptionId: string,
    seasonId: string,
  ): UnlockedRewardsState | null {
    const compositeKey = this.#createSeasonSubscriptionCompositeKey(
      seasonId,
      subscriptionId,
    );
    return this.state.unlockedRewards[compositeKey] || null;
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
        account.address,
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
    const signature = await this.messagingSystem.call(
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
   * Handle authentication triggers (account changes, keyring unlock)
   */
  async #handleAuthenticationTrigger(reason?: string): Promise<void> {
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());

    if (!rewardsEnabled) {
      return;
    }
    Logger.log('RewardsController: handleAuthenticationTrigger', reason);

    try {
      const selectedAccount = this.messagingSystem.call(
        'AccountsController:getSelectedMultichainAccount',
      );
      await this.#performSilentAuth(selectedAccount);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage && !errorMessage?.includes('Engine does not exist')) {
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
  #shouldSkipSilentAuth(account: CaipAccountId, address: string): boolean {
    // Skip for hardware
    if (isHardwareAccount(address)) return true;

    const now = Date.now();

    const accountState = this.#getAccountState(account);
    if (
      accountState &&
      now - accountState.lastCheckedAuth < AUTH_GRACE_PERIOD_MS
    ) {
      return true;
    }

    return false;
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
  async #performSilentAuth(
    internalAccount?: InternalAccount | null,
    shouldBecomeActiveAccount = true,
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
      ? this.#shouldSkipSilentAuth(account, internalAccount.address)
      : false;

    if (shouldSkip) {
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
          lastCheckedAuth: Date.now(),
          lastCheckedAuthError: false,
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
      Logger.log(
        'RewardsController: Skipping for account (likely authenticated & within grace period)',
        account,
      );
      return accountState?.subscriptionId || null;
    }

    let subscription: SubscriptionDto | null = null;
    let authUnexpectedError = false;

    try {
      // Generate timestamp and sign the message
      const timestamp = Math.floor(Date.now() / 1000);

      let signature;
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

      const loginResponse: LoginResponseDto = await this.messagingSystem.call(
        'RewardsDataService:login',
        {
          account: internalAccount.address,
          timestamp,
          signature,
        },
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
          lastCheckedAuth: Date.now(),
          lastCheckedAuthError: authUnexpectedError,
          perpsFeeDiscount: null, // Default value, will be updated when fetched
          lastPerpsDiscountRateFetched: null,
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
      accountState &&
      accountState.perpsFeeDiscount !== null &&
      accountState.lastPerpsDiscountRateFetched !== null &&
      Date.now() - accountState.lastPerpsDiscountRateFetched <
        PERPS_DISCOUNT_CACHE_THRESHOLD_MS
    ) {
      Logger.log(
        'RewardsController: Using cached perps discount data for',
        account,
        accountState.perpsFeeDiscount,
      );
      return {
        hasOptedIn: !!accountState.hasOptedIn,
        discountBips: accountState.perpsFeeDiscount,
      };
    }

    try {
      Logger.log(
        'RewardsController: Fetching fresh perps discount data via API call for',
        account,
      );
      const perpsDiscountData = await this.messagingSystem.call(
        'RewardsDataService:getPerpsDiscount',
        { account },
      );

      this.update((state: RewardsControllerState) => {
        // Create account state if it doesn't exist
        if (!state.accounts[account]) {
          state.accounts[account] = {
            account,
            hasOptedIn: perpsDiscountData.hasOptedIn,
            subscriptionId: null,
            lastCheckedAuth: Date.now(),
            lastCheckedAuthError: false,
            perpsFeeDiscount: perpsDiscountData.discountBips ?? 0,
            lastPerpsDiscountRateFetched: Date.now(),
          };
        } else {
          // Update account state
          state.accounts[account].hasOptedIn = perpsDiscountData.hasOptedIn;
          if (!perpsDiscountData.hasOptedIn) {
            state.accounts[account].subscriptionId = null;
          }
          state.accounts[account].perpsFeeDiscount =
            perpsDiscountData.discountBips ?? 0;
          state.accounts[account].lastPerpsDiscountRateFetched = Date.now();
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
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled) return false;
    const accountState = this.#getAccountState(account);
    if (accountState?.hasOptedIn) return accountState.hasOptedIn;

    // Right now we'll derive this from either cached map state or perps fee discount api call.
    const perpsDiscountData = await this.#getPerpsFeeDiscountData(account);
    return !!perpsDiscountData?.hasOptedIn;
  }

  /**
   * Get opt-in status for multiple addresses with feature flag check
   * @param params - The request parameters containing addresses
   * @returns Promise<OptInStatusDto> - The opt-in status response
   */
  async getOptInStatus(params: OptInStatusInputDto): Promise<OptInStatusDto> {
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled) {
      // Return empty array when feature flag is disabled
      return { ois: params.addresses.map(() => false) };
    }

    try {
      // Get all internal accounts to convert addresses to CAIP format
      const allAccounts = this.messagingSystem.call(
        'AccountsController:listMultichainAccounts',
      );

      // Create a map of address to internal account for quick lookup
      const addressToAccountMap = new Map<string, InternalAccount>();
      for (const account of allAccounts) {
        addressToAccountMap.set(account.address.toLowerCase(), account);
      }

      // Arrays to track cached vs fresh data needed
      const cachedResults: (boolean | null)[] = new Array(
        params.addresses.length,
      ).fill(null);
      const addressesNeedingFresh: string[] = [];

      // Check storage state for each address
      for (let i = 0; i < params.addresses.length; i++) {
        const address = params.addresses[i];
        const internalAccount = addressToAccountMap.get(address.toLowerCase());

        if (internalAccount) {
          const caipAccount =
            this.convertInternalAccountToCaipAccountId(internalAccount);
          if (caipAccount) {
            const accountState = this.#getAccountState(caipAccount);
            if (accountState?.hasOptedIn !== undefined) {
              // Use cached data
              cachedResults[i] = accountState.hasOptedIn;
              continue;
            }
          }
        }

        // No cached data found, need fresh API call
        addressesNeedingFresh.push(address);
      }

      // Make fresh API call only for addresses without cached data
      let freshResults: boolean[] = [];
      if (addressesNeedingFresh.length > 0) {
        Logger.log(
          'RewardsController: Making fresh opt-in status API call for addresses without cached data',
          {
            cachedCount: cachedResults.filter((result) => result !== null)
              .length,
            needFreshCount: addressesNeedingFresh.length,
          },
        );

        const freshResponse = await this.messagingSystem.call(
          'RewardsDataService:getOptInStatus',
          { addresses: addressesNeedingFresh },
        );
        freshResults = freshResponse.ois;

        // Update state with fresh results for future caching
        for (let i = 0; i < addressesNeedingFresh.length; i++) {
          const address = addressesNeedingFresh[i];
          const hasOptedIn = freshResults[i];
          const internalAccount = addressToAccountMap.get(
            address.toLowerCase(),
          );

          if (internalAccount) {
            const caipAccount =
              this.convertInternalAccountToCaipAccountId(internalAccount);
            if (caipAccount) {
              this.update((state: RewardsControllerState) => {
                // Update or create account state with fresh opt-in status
                if (!state.accounts[caipAccount]) {
                  state.accounts[caipAccount] = {
                    account: caipAccount,
                    hasOptedIn,
                    subscriptionId: null,
                    lastCheckedAuth: Date.now(),
                    lastCheckedAuthError: false,
                    perpsFeeDiscount: null,
                    lastPerpsDiscountRateFetched: null,
                  };
                } else {
                  state.accounts[caipAccount].hasOptedIn = hasOptedIn;
                  state.accounts[caipAccount].lastCheckedAuth = Date.now();
                }
              });
            }
          }
        }
      }

      // Combine cached and fresh results in the correct order
      const finalResults: boolean[] = [];
      let freshIndex = 0;

      for (let i = 0; i < params.addresses.length; i++) {
        if (cachedResults[i] !== null) {
          // Use cached result
          finalResults[i] = cachedResults[i] as boolean;
        } else {
          // Use fresh result
          finalResults[i] = freshResults[freshIndex];
          freshIndex++;
        }
      }

      return { ois: finalResults };
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
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
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
    Logger.log(
      'RewardsController: Comparing cache timestamps with latest updatedAt',
      {
        cacheBalanceUpdatedAt,
        latestUpdatedAt,
      },
    );

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

      this.messagingSystem.publish('RewardsController:balanceUpdated', {
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
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled)
      return { has_more: false, cursor: null, total_results: 0, results: [] };

    try {
      Logger.log(
        'RewardsController: Fetching fresh points events data via API call for seasonId & subscriptionId & page cursor',
        {
          seasonId: params.seasonId,
          subscriptionId: params.subscriptionId,
          cursor: params.cursor,
        },
      );
      const pointsEvents = await this.messagingSystem.call(
        'RewardsDataService:getPointsEvents',
        params,
      );

      // Check if we should emit balance updated event
      this.triggerBalanceUpdateIfNeeded(pointsEvents, params);

      return pointsEvents;
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to get points events:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Estimate points for a given activity
   * @param request - The estimate points request containing activity type and context
   * @returns Promise<EstimatedPointsDto> - The estimated points and bonus information
   */
  async estimatePoints(
    request: EstimatePointsDto,
  ): Promise<EstimatedPointsDto> {
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled) return { pointsEstimate: 0, bonusBips: 0 };
    try {
      const estimatedPoints = await this.messagingSystem.call(
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
   * Check if the rewards feature is enabled via feature flag
   * @returns boolean - True if rewards feature is enabled, false otherwise
   */
  isRewardsFeatureEnabled(): boolean {
    return selectRewardsEnabledFlag(store.getState());
  }

  /**
   * Get season status with caching
   * @param seasonId - The ID of the season to get status for
   * @param subscriptionId - The subscription ID for authentication
   * @returns Promise<SeasonStatusState> - The season status data
   */
  async getSeasonStatus(
    subscriptionId: string,
    seasonId: string = CURRENT_SEASON_ID,
  ): Promise<SeasonStatusState | null> {
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled) {
      return null;
    }

    // Check if we have cached season status and if threshold hasn't been reached
    const cachedSeasonStatus = this.#getSeasonStatus(subscriptionId, seasonId);
    if (
      cachedSeasonStatus?.lastFetched &&
      Date.now() - cachedSeasonStatus.lastFetched <
        SEASON_STATUS_CACHE_THRESHOLD_MS
    ) {
      Logger.log(
        'RewardsController: Using cached season status data for',
        subscriptionId,
        seasonId,
      );

      return cachedSeasonStatus;
    }

    try {
      Logger.log(
        'RewardsController: Fetching fresh season status data via API call for subscriptionId & seasonId',
        subscriptionId,
        seasonId,
      );
      const seasonStatus = await this.messagingSystem.call(
        'RewardsDataService:getSeasonStatus',
        seasonId,
        subscriptionId,
      );

      const seasonState = this.#convertSeasonToState(seasonStatus.season);
      const subscriptionSeasonStatus =
        this.#convertSeasonStatusToSubscriptionState(seasonStatus);

      const compositeKey = this.#createSeasonSubscriptionCompositeKey(
        seasonId,
        subscriptionId,
      );

      this.update((state: RewardsControllerState) => {
        // Update seasons map with season data
        state.seasons[seasonId] = seasonState;

        // Update season status with composite key
        state.seasonStatuses[compositeKey] = subscriptionSeasonStatus;

        if (
          seasonId === CURRENT_SEASON_ID &&
          seasonState.id !== CURRENT_SEASON_ID &&
          seasonState.id
        ) {
          this.#currentSeasonIdMap[CURRENT_SEASON_ID] = seasonState.id;
          state.seasons[seasonState.id] = seasonState;
          state.seasonStatuses[
            this.#createSeasonSubscriptionCompositeKey(
              seasonState.id,
              subscriptionId,
            )
          ] = subscriptionSeasonStatus;
        }
      });

      return subscriptionSeasonStatus;
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to get season status:',
        error instanceof Error ? error.message : String(error),
      );
      if (error instanceof Error && error.message.includes('403')) {
        this.invalidateSubscriptionCache(subscriptionId);
        this.invalidateAccountsAndSubscriptions();
      }
      throw error;
    }
  }

  invalidateAccountsAndSubscriptions() {
    this.update((state: RewardsControllerState) => {
      if (state.activeAccount) {
        state.activeAccount = {
          ...state.activeAccount,
          hasOptedIn: false,
          subscriptionId: null,
          account: state.activeAccount.account, // Ensure account is always present (never undefined)
        };
      }
      state.accounts = {};
      state.subscriptions = {};
    });
    Logger.log('RewardsController: Invalidated accounts and subscriptions');
  }

  /**
   * Get referral details with caching
   * @param subscriptionId - The subscription ID for authentication
   * @returns Promise<SubscriptionReferralDetailsDto> - The referral details data
   */
  async getReferralDetails(
    subscriptionId: string,
  ): Promise<SubscriptionReferralDetailsState | null> {
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled) {
      return null;
    }

    const cachedReferralDetails =
      this.state.subscriptionReferralDetails[subscriptionId];

    // Check if we have cached referral details and if threshold hasn't been reached
    if (
      cachedReferralDetails?.lastFetched &&
      Date.now() - cachedReferralDetails.lastFetched <
        REFERRAL_DETAILS_CACHE_THRESHOLD_MS
    ) {
      Logger.log(
        'RewardsController: Using cached referral details data for',
        subscriptionId,
      );
      return cachedReferralDetails;
    }

    try {
      Logger.log(
        'RewardsController: Fetching fresh referral details data via API call for',
        subscriptionId,
      );
      const referralDetails = await this.messagingSystem.call(
        'RewardsDataService:getReferralDetails',
        subscriptionId,
      );

      const subscriptionReferralDetailsState: SubscriptionReferralDetailsState =
        {
          referralCode: referralDetails.referralCode,
          totalReferees: referralDetails.totalReferees,
          lastFetched: Date.now(),
        };

      this.update((state: RewardsControllerState) => {
        // Update subscription referral details at root level
        state.subscriptionReferralDetails[subscriptionId] =
          subscriptionReferralDetailsState;
      });

      return subscriptionReferralDetailsState;
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to get referral details:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Perform the complete opt-in process for rewards
   * @param account - The account to opt in
   * @param referralCode - Optional referral code
   */
  async optIn(
    account: InternalAccount,
    referralCode?: string,
  ): Promise<string | null> {
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
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

    const challengeResponse = await this.messagingSystem.call(
      'RewardsDataService:generateChallenge',
      {
        address: account.address,
      },
    );

    // Try different encoding approaches to handle potential character issues
    let hexMessage;
    try {
      // First try: direct toHex conversion
      hexMessage = toHex(challengeResponse.message);
    } catch {
      // Fallback: use Buffer to convert to hex if toHex fails
      hexMessage =
        '0x' + Buffer.from(challengeResponse.message, 'utf8').toString('hex');
    }

    // Use KeyringController for silent signature
    const signature = await this.messagingSystem.call(
      'KeyringController:signPersonalMessage',
      {
        data: hexMessage,
        from: account.address,
      },
    );

    Logger.log('RewardsController: Submitting optin with signature...');
    const optinResponse = await this.messagingSystem.call(
      'RewardsDataService:optin',
      {
        challengeId: challengeResponse.id,
        signature,
        referralCode,
      },
    );

    Logger.log(
      'RewardsController: Optin successful, updating controller state...',
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
      state.activeAccount = {
        account: caipAccount,
        hasOptedIn: true,
        subscriptionId: optinResponse.subscription.id,
        lastCheckedAuth: Date.now(),
        lastCheckedAuthError: false,
        perpsFeeDiscount: null,
        lastPerpsDiscountRateFetched: null,
      };
      state.accounts[caipAccount] = state.activeAccount;
      state.subscriptions[optinResponse.subscription.id] =
        optinResponse.subscription;
    });

    return optinResponse.subscription.id;
  }

  /**
   * Logout user from rewards and clear associated data
   * @param subscriptionId - Optional subscription ID to logout from
   */
  async logout(): Promise<void> {
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
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
      await this.messagingSystem.call(
        'RewardsDataService:logout',
        subscriptionId,
      );

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
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled) {
      return {
        geoLocation: 'UNKNOWN',
        optinAllowedForGeo: false,
      };
    }

    if (this.#geoLocation) {
      Logger.log('RewardsController: Using cached geo location', {
        location: this.#geoLocation,
      });
      return this.#geoLocation;
    }

    try {
      Logger.log(
        'RewardsController: Fetching geo location for rewards metadata',
      );

      // Get geo location from data service
      const geoLocation = await this.messagingSystem.call(
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
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
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
      const response = await this.messagingSystem.call(
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
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
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
      const allAccounts = this.messagingSystem.call(
        'AccountsController:listMultichainAccounts',
      );

      if (!allAccounts || allAccounts.length === 0) {
        return null;
      }

      // Extract addresses from internal accounts
      const addresses = allAccounts.map(
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
      for (let i = 0; i < allAccounts.length; i++) {
        if (silentAuthAttempts > maxSilentAuthAttempts) break;
        const account = allAccounts[i];
        if (!account || optInStatusResponse.ois[i] === false) continue;
        try {
          silentAuthAttempts++;
          const subscriptionId = await this.#performSilentAuth(
            account,
            false, // shouldBecomeActiveAccount = false
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
  ): Promise<boolean> {
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
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

    try {
      // Generate timestamp and sign the message for mobile join
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = await this.#signRewardsMessage(account, timestamp);

      // Call mobile join via messenger
      const updatedSubscription: SubscriptionDto =
        await this.messagingSystem.call(
          'RewardsDataService:mobileJoin',
          {
            account: account.address,
            timestamp,
            signature: signature as `0x${string}`,
          },
          candidateSubscriptionId,
        );

      // Update store with accounts and subscriptions (but not activeAccount)
      this.update((state: RewardsControllerState) => {
        // Update accounts state
        state.accounts[caipAccount] = {
          account: caipAccount,
          hasOptedIn: true, // via linking this is now opted in.
          subscriptionId: updatedSubscription.id,
          lastCheckedAuth: Date.now(),
          lastCheckedAuthError: false,
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

      // Invalidate cache for the linked account
      this.invalidateSubscriptionCache(updatedSubscription.id);
      // Emit event to trigger UI refresh
      this.messagingSystem.publish('RewardsController:accountLinked', {
        subscriptionId: updatedSubscription.id,
        account: caipAccount,
      });

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
   * Opt out of the rewards program, deleting the subscription and all associated data
   * @returns Promise<boolean> - True if opt-out was successful, false otherwise
   */
  async optOut(subscriptionId: string): Promise<boolean> {
    try {
      // Check if subscription exists in our map
      if (!this.state.subscriptions[subscriptionId]) {
        Logger.log(
          'RewardsController: Subscription not found in map',
          subscriptionId,
        );
        return false;
      }

      // Call the opt-out endpoint
      const result = await this.messagingSystem.call(
        'RewardsDataService:optOut',
        subscriptionId,
      );

      if (result.success) {
        const currentActiveAccount = this.state.activeAccount?.account;
        this.resetState();
        this.update((state: RewardsControllerState) => {
          // Set activeAccount with optIn: false if there was an active account
          if (currentActiveAccount) {
            state.activeAccount = {
              account: currentActiveAccount,
              hasOptedIn: false,
              subscriptionId: null,
              lastCheckedAuth: Date.now(),
              lastCheckedAuthError: false,
              perpsFeeDiscount: null,
              lastPerpsDiscountRateFetched: null,
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
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled) {
      return [];
    }

    // Check if we have cached active boosts and if threshold hasn't been reached
    const cachedActiveBoosts = this.#getActiveBoosts(subscriptionId, seasonId);
    if (
      cachedActiveBoosts?.lastFetched &&
      Date.now() - cachedActiveBoosts.lastFetched <
        ACTIVE_BOOSTS_CACHE_THRESHOLD_MS
    ) {
      Logger.log(
        'RewardsController: Using cached active boosts data for',
        subscriptionId,
        seasonId,
        {
          boostCount: cachedActiveBoosts.boosts.length,
          cacheAge: Math.round(
            (Date.now() - cachedActiveBoosts.lastFetched) / 1000,
          ),
          maxAge: Math.round(ACTIVE_BOOSTS_CACHE_THRESHOLD_MS / 1000),
        },
      );
      return cachedActiveBoosts.boosts;
    }

    try {
      Logger.log(
        'RewardsController: Fetching fresh active boosts data via API call for subscriptionId & seasonId',
        subscriptionId,
        seasonId,
      );
      const response = await this.messagingSystem.call(
        'RewardsDataService:getActivePointsBoosts',
        seasonId,
        subscriptionId,
      );

      const compositeKey = this.#createSeasonSubscriptionCompositeKey(
        seasonId,
        subscriptionId,
      );

      // Update state with cached active boosts
      this.update((state: RewardsControllerState) => {
        state.activeBoosts[compositeKey] = {
          boosts: response.boosts,
          lastFetched: Date.now(),
        };
      });

      return response.boosts;
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to get active points boosts:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
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
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled) {
      return [];
    }

    // Check if we have cached unlocked rewards and if threshold hasn't been reached
    const cachedUnlockedRewards = this.#getUnlockedRewards(
      subscriptionId,
      seasonId,
    );
    if (
      cachedUnlockedRewards?.lastFetched &&
      Date.now() - cachedUnlockedRewards.lastFetched <
        UNLOCKED_REWARDS_CACHE_THRESHOLD_MS
    ) {
      Logger.log(
        'RewardsController: Using cached unlocked rewards data for',
        subscriptionId,
        seasonId,
        {
          rewardCount: cachedUnlockedRewards.rewards.length,
          cacheAge: Math.round(
            (Date.now() - cachedUnlockedRewards.lastFetched) / 1000,
          ),
          maxAge: Math.round(UNLOCKED_REWARDS_CACHE_THRESHOLD_MS / 1000),
        },
      );
      return cachedUnlockedRewards.rewards;
    }

    try {
      Logger.log(
        'RewardsController: Fetching fresh unlocked rewards data via API call for subscriptionId & seasonId',
        subscriptionId,
        seasonId,
      );
      const response = (await this.messagingSystem.call(
        'RewardsDataService:getUnlockedRewards',
        seasonId,
        subscriptionId,
      )) as RewardDto[];

      const compositeKey = this.#createSeasonSubscriptionCompositeKey(
        seasonId,
        subscriptionId,
      );

      // Update state with cached unlocked rewards
      this.update((state: RewardsControllerState) => {
        state.unlockedRewards[compositeKey] = {
          rewards: response || [],
          lastFetched: Date.now(),
        };
      });

      return response || [];
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to get unlocked rewards:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
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
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled) {
      throw new Error('Rewards are not enabled');
    }
    try {
      await this.messagingSystem.call(
        'RewardsDataService:claimReward',
        rewardId,
        subscriptionId,
        dto,
      );

      // Invalidate cache for the active subscription
      this.invalidateSubscriptionCache(subscriptionId);

      // Emit event to trigger UI refresh
      this.messagingSystem.publish('RewardsController:rewardClaimed', {
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
      });
    }

    Logger.log(
      'RewardsController: Invalidated cache for subscription',
      subscriptionId,
      seasonId || 'all seasons',
    );
  }
}
