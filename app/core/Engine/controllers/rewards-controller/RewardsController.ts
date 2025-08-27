import { BaseController } from '@metamask/base-controller';
import type { RewardsControllerState, LoginResponseDto } from './types';
import type { RewardsControllerMessenger } from '../../messengers/rewards-controller-messenger';
import { storeSubscriptionToken } from './utils/multi-subscription-token-vault';
import Logger from '../../../../util/Logger';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { isHardwareAccount } from '../../../../util/address';
import { selectRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { store } from '../../../../store';

// Re-export the messenger type for convenience
export type { RewardsControllerMessenger };

const controllerName = 'RewardsController';

// Silent authentication constants
const GRACE_PERIOD_MS = 1000 * 60 * 10; // 10 minutes

/**
 * State metadata for the RewardsController
 */
const metadata = {
  lastAuthenticatedAccount: { persist: true, anonymous: false },
  lastAuthTime: { persist: true, anonymous: false },
  subscription: {
    persist: true,
    anonymous: false,
  },
};
/**
 * Get the default state for the RewardsController
 */
export const getRewardsControllerDefaultState = (): RewardsControllerState => ({
  lastAuthenticatedAccount: null,
  lastAuthTime: 0,
  subscription: null,
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

    this.#initializeEventSubscriptions();
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
  #shouldSkipSilentAuth(address: string): boolean {
    // Skip for hardware and Solana accounts
    if (isHardwareAccount(address) || isSolanaAddress(address)) return true;

    const now = Date.now();
    const { lastAuthTime, lastAuthenticatedAccount } = this.state;
    const timeSinceLastAuth = now - lastAuthTime;

    // Skip if within grace period and same account
    if (
      lastAuthenticatedAccount === address &&
      timeSinceLastAuth < GRACE_PERIOD_MS
    ) {
      return true;
    }

    return false;
  }

  /**
   * Perform silent authentication for the given address
   */
  async #performSilentAuth(account: InternalAccount): Promise<void> {
    const address = account.address;
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
        signature = await this.#signRewardsMessage(account, timestamp);
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
      const requestBody = { account: address, timestamp, signature };

      Logger.log('RewardsController: Performing silent auth for', address);

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
        const currentTime = Date.now();

        state.subscription = subscription;
        state.lastAuthenticatedAccount = address;
        state.lastAuthTime = currentTime;
      });
    } catch (error: unknown) {
      // Handle 401 (not opted in) or other errors silently
      if (error instanceof Error && error.message.includes('401')) {
        Logger.log(
          'RewardsController: Account not opted in (401), clearing tokens',
        );

        // Update state so that we remember this account is not opted in
        this.update((state: RewardsControllerState) => {
          state.subscription = null;
          state.lastAuthenticatedAccount = address;
          state.lastAuthTime = Date.now();
        });
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
}
