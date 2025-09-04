import { BaseController } from '@metamask/base-controller';
import { toHex } from '@metamask/controller-utils';
import type {
  RewardsControllerState,
  RewardsAccountState,
  LoginResponseDto,
  PerpsDiscountData,
  EstimatePointsDto,
  EstimatedPointsDto,
  SeasonDtoState,
  SeasonStatusState,
  SeasonTierState,
  SeasonTierDto,
  SubscriptionReferralDetailsState,
  GeoRewardsMetadata,
  SeasonStatusDto,
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

/**
 * State metadata for the RewardsController
 */
const metadata = {
  lastAuthenticatedAccount: { persist: true, anonymous: false },
  accounts: { persist: true, anonymous: false },
  subscriptions: { persist: true, anonymous: false },
  seasons: { persist: true, anonymous: false },
  subscriptionReferralDetails: { persist: true, anonymous: false },
  seasonStatuses: { persist: true, anonymous: false },
};
/**
 * Get the default state for the RewardsController
 */
export const getRewardsControllerDefaultState = (): RewardsControllerState => ({
  lastAuthenticatedAccount: null,
  accounts: {},
  subscriptions: {},
  seasons: {},
  subscriptionReferralDetails: {},
  seasonStatuses: {},
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
  #isProcessingSilentAuth = false;

  /**
   * Calculate tier status and next tier information
   */
  #calculateTierStatus(
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
    const tierState = this.#calculateTierStatus(
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
   * Create composite key for season status storage
   */
  #createSeasonStatusCompositeKey(
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
    seasonId: string | 'current' = 'current',
  ): SeasonStatusState | null {
    const compositeKey = this.#createSeasonStatusCompositeKey(
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

    return await this.#signEvmMessage(account, message);
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
      Logger.log(
        'RewardsController: Feature flag disabled, skipping silent auth',
      );
      return;
    }
    Logger.log('RewardsController: handleAuthenticationTrigger', reason);

    try {
      const selectedAccount = this.messagingSystem.call(
        'AccountsController:getSelectedMultichainAccount',
      );
      Logger.log('RewardsController: selectedAccount', selectedAccount);

      if (selectedAccount?.address) {
        await this.#performSilentAuth(selectedAccount);
      }
    } catch (error) {
      // Silent failure - don't throw errors for background authentication
      Logger.log(
        'RewardsController: Silent authentication failed:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Check if silent authentication should be skipped
   */
  #shouldSkipSilentAuth(account: CaipAccountId, address: string): boolean {
    // Skip for hardware and Solana accounts
    if (isHardwareAccount(address) || isSolanaAddress(address)) return true;

    const now = Date.now();
    const { lastAuthenticatedAccount } = this.state;

    // Skip if within grace period and same account
    if (
      lastAuthenticatedAccount?.account === account &&
      now - lastAuthenticatedAccount.lastAuthTime < AUTH_GRACE_PERIOD_MS
    ) {
      return true;
    }

    const accountState = this.#getAccountState(account);
    if (
      accountState &&
      now - accountState.lastAuthTime < AUTH_GRACE_PERIOD_MS
    ) {
      return true;
    }

    return false;
  }

  #convertInternalAccountToCaipAccountId(
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
  async #performSilentAuth(internalAccount: InternalAccount): Promise<void> {
    const account: CaipAccountId | null =
      this.#convertInternalAccountToCaipAccountId(internalAccount);

    const shouldSkip = account
      ? this.#shouldSkipSilentAuth(account, internalAccount.address)
      : false;
    Logger.log('RewardsController: Should skip auth?', shouldSkip);

    if (shouldSkip || this.#isProcessingSilentAuth) {
      Logger.log('RewardsController: Skipping silent auth');
      return;
    }

    try {
      this.#isProcessingSilentAuth = true;

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
            return; // Exit silently when keyring is locked
          }
        }

        throw signError;
      }

      // Use data service through messenger
      const requestBody = {
        account: internalAccount.address,
        timestamp,
        signature,
      };

      Logger.log(
        'RewardsController: Performing silent auth for',
        internalAccount.address,
      );

      const loginResponse: LoginResponseDto = await this.messagingSystem.call(
        'RewardsDataService:login',
        requestBody,
      );

      Logger.log('RewardsController: Silent auth successful');

      // Update state with successful authentication
      const subscription = loginResponse.subscription;

      // Store the session token for this subscription
      await storeSubscriptionToken(subscription.id, loginResponse.sessionId);

      this.update((state: RewardsControllerState) => {
        if (!account) {
          return;
        }

        const currentTime = Date.now();

        // Create or update account state
        const accountState: RewardsAccountState = {
          account,
          hasOptedIn: !!subscription,
          subscriptionId: subscription.id,
          lastAuthTime: currentTime,
          perpsFeeDiscount: null, // Default value, will be updated when fetched
          lastPerpsDiscountRateFetched: null,
        };

        // Update accounts map
        state.accounts[account] = accountState;

        // Update subscriptions map
        state.subscriptions[subscription.id] = subscription;

        // Update last authenticated account
        state.lastAuthenticatedAccount = accountState;
      });
    } catch (error: unknown) {
      // Handle 401 (not opted in) or other errors silently
      if (error instanceof Error && error.message.includes('401')) {
        Logger.log(
          'RewardsController: Account not opted in (401), clearing tokens',
        );

        if (account) {
          // Update state so that we remember this account is not opted in
          this.update((state: RewardsControllerState) => {
            // Create or update account state with no subscription
            const accountState: RewardsAccountState = {
              account: account as CaipAccountId,
              hasOptedIn: false,
              subscriptionId: null,
              lastAuthTime: Date.now(),
              perpsFeeDiscount: null,
              lastPerpsDiscountRateFetched: null,
            };

            // Update accounts map
            state.accounts[account as CaipAccountId] = accountState;

            // Update last authenticated account
            state.lastAuthenticatedAccount = accountState;
          });
        }
      } else {
        Logger.log(
          'RewardsController: Silent auth failed:',
          error instanceof Error ? error.message : String(error),
        );
      }
      // For other errors, we don't update the state to allow retries
    } finally {
      this.#isProcessingSilentAuth = false;
    }
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
        hasOptedIn: accountState.hasOptedIn,
        discount: accountState.perpsFeeDiscount,
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
            lastAuthTime: 0,
            perpsFeeDiscount: perpsDiscountData.discount ?? 0,
            lastPerpsDiscountRateFetched: Date.now(),
          };
        } else {
          // Update account state
          state.accounts[account].hasOptedIn = perpsDiscountData.hasOptedIn;
          if (!perpsDiscountData.hasOptedIn) {
            state.accounts[account].subscriptionId = null;
          }
          state.accounts[account].perpsFeeDiscount =
            perpsDiscountData.discount ?? 0;
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
   * Get perps fee discount for an account with caching and threshold logic
   * @param account - The account address in CAIP-10 format
   * @returns Promise<number> - The discount number value
   */
  async getPerpsDiscountForAccount(account: CaipAccountId): Promise<number> {
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled) return 0;
    const perpsDiscountData = await this.#getPerpsFeeDiscountData(account);
    return perpsDiscountData?.discount || 0;
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
    seasonId: string | 'current' = 'current',
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

      const compositeKey = this.#createSeasonStatusCompositeKey(
        seasonId,
        subscriptionId,
      );

      this.update((state: RewardsControllerState) => {
        // Update seasons map with season data
        state.seasons[seasonId] = seasonState;

        // Update season status with composite key
        state.seasonStatuses[compositeKey] = subscriptionSeasonStatus;
      });

      return subscriptionSeasonStatus;
    } catch (error) {
      Logger.log(
        'RewardsController: Failed to get season status:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
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
  async optIn(account: InternalAccount, referralCode?: string): Promise<void> {
    const rewardsEnabled = selectRewardsEnabledFlag(store.getState());
    if (!rewardsEnabled) {
      Logger.log('Rewards: Rewards feature is disabled, skipping optin', {
        account: account.address,
      });
      return;
    }

    Logger.log('Rewards: Starting optin process', {
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
    } catch (error) {
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

    Logger.log('Rewards: Submitting optin with signature...');
    const optinResponse = await this.messagingSystem.call(
      'RewardsDataService:optin',
      {
        challengeId: challengeResponse.id,
        signature,
        referralCode,
      },
    );

    Logger.log('Rewards: Optin successful, updating controller state...');

    // Update state with opt-in response data
    this.update((state) => {
      const caipAccount: CaipAccountId | null =
        this.#convertInternalAccountToCaipAccountId(account);
      if (!caipAccount) {
        return;
      }
      state.lastAuthenticatedAccount = {
        account: caipAccount,
        hasOptedIn: true,
        subscriptionId: optinResponse.subscription.id,
        lastAuthTime: Date.now(),
        perpsFeeDiscount: null,
        lastPerpsDiscountRateFetched: null,
      };
      state.accounts[caipAccount] = state.lastAuthenticatedAccount;
      state.subscriptions[optinResponse.subscription.id] =
        optinResponse.subscription;
    });

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

    if (!this.state.lastAuthenticatedAccount?.subscriptionId) {
      Logger.log('RewardsController: No authenticated account found');
      return;
    }

    const subscriptionId = this.state.lastAuthenticatedAccount.subscriptionId;
    Logger.log(
      'RewardsController: Starting logout process for account tied to subscriptionId',
      {
        subscriptionId,
      },
    );

    try {
      // Call the data service logout if subscriptionId is provided
      await this.messagingSystem.call(
        'RewardsDataService:logout',
        subscriptionId,
      );
      Logger.log(
        'RewardsController: Successfully logged out from data service',
      );

      // Remove the session token from storage
      const tokenRemovalResult = await removeSubscriptionToken(subscriptionId);
      if (!tokenRemovalResult.success) {
        Logger.log(
          'RewardsController: Warning - failed to remove session token:',
          tokenRemovalResult?.error || 'Unknown error',
        );
      } else {
        Logger.log('RewardsController: Successfully removed session token');
      }

      // Update controller state to reflect logout
      this.update((state) => {
        // Clear last authenticated account if it matches this subscription
        if (state.lastAuthenticatedAccount?.subscriptionId === subscriptionId) {
          state.lastAuthenticatedAccount = null;
          Logger.log('RewardsController: Cleared last authenticated account');
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

    // Base32 alphabet (RFC 4648): A-Z and 2-7
    const base32Regex = /^[A-Z2-7]{6}$/;
    if (!base32Regex.test(code.toUpperCase())) {
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
      return false;
    }
  }
}
