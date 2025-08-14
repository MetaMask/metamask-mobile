import { BaseController } from '@metamask/base-controller';
import type {
  RewardsControllerState,
  SilentAuthState,
  LoginResponseDto,
} from './types';
import type { RewardsControllerMessenger } from '../../messengers/rewards-controller-messenger';
import {
  storeSubscriptionToken,
  resetAllSubscriptionTokens,
} from './utils/MultiSubscriptionTokenVault';
import AppConstants from '../../../AppConstants';
import ReduxService from '../../../redux';
import { rewardsApi } from './services/rewardsApi';
import Logger from '../../../../util/Logger';

// Re-export the messenger type for convenience
export type { RewardsControllerMessenger };

const controllerName = 'RewardsController';

// Silent authentication constants
const GRACE_PERIOD_MS = 1000; // 30 minutes

/**
 * State metadata for the RewardsController
 */
const metadata = {
  devOnlyLoginAddress: { persist: true, anonymous: false },
  lastUpdated: { persist: true, anonymous: false },
  silentAuth: {
    persist: true,
    anonymous: false,
  },
};

/**
 * Get the default silent auth state
 */
const getDefaultSilentAuthState = (): SilentAuthState => ({
  lastAuthenticatedAccount: null,
  accountToSubscription: {},
  lastAuthTime: 0,
});

/**
 * Get the default state for the RewardsController
 */
export const getRewardsControllerDefaultState = (): RewardsControllerState => ({
  devOnlyLoginAddress: null,
  lastUpdated: null,
  silentAuth: getDefaultSilentAuthState(),
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
   * Update last updated timestamp
   */
  updateLastUpdated(): void {
    this.update((state) => {
      state.lastUpdated = Date.now();
    });
  }

  /**
   * Set the dev-only login address
   */
  setDevOnlyLoginAddress(address: string | null): void {
    this.update((state) => {
      state.devOnlyLoginAddress = address;
    });
  }

  /**
   * Get the dev-only login address
   */
  getDevOnlyLoginAddress(): string | null {
    return this.state.devOnlyLoginAddress;
  }

  /**
   * Sign a message for rewards authentication
   */
  async #signRewardsMessage(
    account: string,
    timestamp: number,
  ): Promise<string> {
    const message = `rewards,${account},${timestamp}`;

    // Convert message to hex format for signing
    const hexMessage = '0x' + Buffer.from(message, 'utf8').toString('hex');

    // Use KeyringController to sign the message
    const signature = await this.messagingSystem.call(
      'KeyringController:signPersonalMessage',
      {
        data: hexMessage,
        from: account,
      },
    );

    return signature;
  }

  /**
   * Handle authentication triggers (account changes, keyring unlock)
   */
  async #handleAuthenticationTrigger(reason?: string): Promise<void> {
    Logger.log('RewardsController: handleAuthenticationTrigger', reason);
    Logger.log('RewardsController: Clearing cache');
    // Clear global cache
    ReduxService.store.dispatch(
      rewardsApi.util.invalidateTags([
        'Subscription',
        'PointsEvents',
        'SeasonStatus',
        'RewardsStatus',
      ]),
    );

    try {
      const selectedAccount = this.messagingSystem.call(
        'AccountsController:getSelectedAccount',
      );

      if (selectedAccount?.address) {
        await this.#performSilentAuth(selectedAccount.address);
      }
    } catch (error) {
      // Silent failure - don't throw errors for background authentication
      Logger.log('RewardsController: Silent authentication failed:', error);
    }
  }

  /**
   * Check if silent authentication should be skipped
   */
  #shouldSkipSilentAuth(address: string): boolean {
    const now = Date.now();
    const { silentAuth } = this.state;
    const timeSinceLastAuth = now - silentAuth.lastAuthTime;

    // Skip if within grace period and same account
    if (
      silentAuth.lastAuthenticatedAccount === address &&
      timeSinceLastAuth < GRACE_PERIOD_MS
    ) {
      return true;
    }

    // Skip if this account already has a valid subscription
    const subscriptionId =
      silentAuth.accountToSubscription[address.toLowerCase()];
    if (subscriptionId && timeSinceLastAuth < GRACE_PERIOD_MS) {
      return true; // Account belongs to a known subscription, skip auth
    }

    return false;
  }

  /**
   * Perform silent authentication for the given address
   */
  async #performSilentAuth(address: string): Promise<void> {
    Logger.log('RewardsController: Performing silent auth for', address);

    const shouldSkip = this.#shouldSkipSilentAuth(address);
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
        signature = await this.#signRewardsMessage(address, timestamp);
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

      const apiUrl = `${AppConstants.REWARDS_API_URL}/auth/mobile-login`;
      const requestBody = { account: address, timestamp, signature };

      // Call the silent login endpoint using fetch directly
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      Logger.log('RewardsController: API response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw { status: 401 };
        }
        throw new Error(`Silent login failed: ${response.status}`);
      }

      const loginResponse: LoginResponseDto = await response.json();

      // Update state with successful authentication
      const subscription = loginResponse.subscription;

      // Store the session token for this subscription
      await storeSubscriptionToken(subscription.id, loginResponse.sessionId);

      this.update((state) => {
        const currentTime = Date.now();

        // Update account to subscription mapping for all accounts in this subscription
        (subscription?.accounts || []).forEach((accountAddress) => {
          state.silentAuth.accountToSubscription[
            accountAddress.address.toLowerCase()
          ] = subscription.id;
        });

        state.silentAuth.lastAuthenticatedAccount = address;
        state.silentAuth.lastAuthTime = currentTime;
      });
    } catch (error: unknown) {
      Logger.log('RewardsController: Silent auth error:', error);
      // Handle 401 (not opted in) or other errors silently
      if (
        error &&
        typeof error === 'object' &&
        'status' in error &&
        (error as { status: number }).status === 401
      ) {
        Logger.log(
          'RewardsController: Account not opted in (401), clearing tokens',
        );

        // Update state so that we remember this account is not opted in
        this.update((state) => {
          // Remove this account from any existing subscription mappings
          delete state.silentAuth.accountToSubscription[address.toLowerCase()];

          state.silentAuth.lastAuthenticatedAccount = address;
          state.silentAuth.lastAuthTime = Date.now();
        });
      }
      // For other errors, we don't update the state to allow retries
    } finally {
      this.#isProcessingSilentAuth = false;
    }
  }

  /**
   * Get the current silent authentication state
   */
  getSilentAuthState(): SilentAuthState {
    return this.state.silentAuth;
  }

  /**
   * Reset silent authentication state and clear all tokens
   */
  async resetSilentAuthState(): Promise<void> {
    await resetAllSubscriptionTokens();
    this.update((state) => {
      state.silentAuth = getDefaultSilentAuthState();
    });
  }

  /**
   * Get the subscription ID for a given account address
   */
  getSubscriptionIdForAccount(address: string): string | null {
    return (
      this.state.silentAuth.accountToSubscription[address.toLowerCase()] || null
    );
  }
}
