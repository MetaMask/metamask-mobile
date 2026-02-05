/**
 * Base Wallet Provider Adapter
 *
 * Abstract base class providing common functionality for wallet adapters.
 * Handles module loading, activation listeners, and eligibility determination.
 */

import { Platform, PlatformOSType } from 'react-native';
import {
  WalletType,
  WalletEligibility,
  CardTokenStatus,
  CardActivationEvent,
  ProvisioningError,
  ProvisioningErrorCode,
} from '../../types';
import { mapCardStatus, logAdapterError } from './utils';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';
import { getWalletName } from '../../constants';

/**
 * Base class for wallet adapters providing common functionality
 *
 * Subclasses must implement:
 * - walletType, platform properties
 * - provisionCard method
 * - onActivationEvent method (for handling activation events)
 */
export abstract class BaseWalletAdapter {
  abstract readonly walletType: WalletType;
  abstract readonly platform: PlatformOSType;

  protected activationListeners: Set<(event: CardActivationEvent) => void>;
  protected walletModule:
    | typeof import('@expensify/react-native-wallet')
    | null = null;
  protected listenerSubscription?: { remove: () => void };
  protected moduleLoadPromise: Promise<void> | null = null;
  protected moduleLoadError: Error | null = null;

  constructor() {
    this.activationListeners = new Set();
  }

  /**
   * Get the adapter name for logging
   */
  protected abstract getAdapterName(): string;

  /**
   * Get the expected platform for this adapter
   */
  protected abstract getExpectedPlatform(): PlatformOSType;

  /**
   * Handle raw activation event data from native module
   */
  protected abstract handleNativeActivationEvent(data: unknown): void;

  /**
   * Initialize the wallet module lazily
   */
  protected async initializeWalletModule(): Promise<void> {
    if (Platform.OS !== this.getExpectedPlatform()) {
      return;
    }

    try {
      this.walletModule = await import('@expensify/react-native-wallet');
      this.moduleLoadError = null;
    } catch (error) {
      this.moduleLoadError =
        error instanceof Error ? error : new Error(String(error));
      Logger.log(
        `${this.getAdapterName()}: Failed to load wallet module`,
        this.moduleLoadError.message,
      );
    }
  }

  /**
   * Get the wallet module, ensuring it's loaded
   */
  protected async getWalletModule(): Promise<
    typeof import('@expensify/react-native-wallet')
  > {
    // Wait for the initial load to complete
    if (this.moduleLoadPromise) {
      await this.moduleLoadPromise;
    }

    // If still not loaded, try again
    if (!this.walletModule && !this.moduleLoadError) {
      await this.initializeWalletModule();
    }

    if (!this.walletModule) {
      const errorMessage = this.moduleLoadError
        ? `Failed to load wallet module: ${this.moduleLoadError.message}`
        : strings('card.push_provisioning.error_wallet_not_available', {
            walletName: getWalletName(),
          });

      Logger.log(
        `${this.getAdapterName()}.getWalletModule: Module not available`,
        {
          hasModule: !!this.walletModule,
          loadError: this.moduleLoadError?.message,
          platform: Platform.OS,
        },
      );

      throw new ProvisioningError(
        ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
        errorMessage,
        this.moduleLoadError ?? undefined,
      );
    }

    return this.walletModule;
  }

  /**
   * Check if wallet is available on this device
   */
  async checkAvailability(): Promise<boolean> {
    if (Platform.OS !== this.getExpectedPlatform()) {
      Logger.log(
        `${this.getAdapterName()}: Not available - platform is not ${this.getExpectedPlatform()}`,
      );
      return false;
    }

    try {
      const wallet = await this.getWalletModule();
      const isAvailable = await wallet.checkWalletAvailability();

      if (!isAvailable) {
        Logger.log(`${this.getAdapterName()}: Not available`);
      }

      return isAvailable;
    } catch (error) {
      Logger.log(`${this.getAdapterName()}: Not available - Error:`, {
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Check the status of a specific card in the wallet
   */
  async getCardStatus(lastFourDigits: string): Promise<CardTokenStatus> {
    try {
      const wallet = await this.getWalletModule();
      const status = await wallet.getCardStatusBySuffix(lastFourDigits);
      return mapCardStatus(status);
    } catch (error) {
      logAdapterError(this.getAdapterName(), 'getCardStatus', error);
      return 'not_found';
    }
  }

  /**
   * Get detailed wallet eligibility information
   */
  async getEligibility(lastFourDigits?: string): Promise<WalletEligibility> {
    const isAvailable = await this.checkAvailability();

    if (!isAvailable) {
      return {
        isAvailable: false,
        canAddCard: false,
        ineligibilityReason: strings(
          'card.push_provisioning.error_wallet_not_available',
          { walletName: getWalletName() },
        ),
        recommendedAction: 'none',
      };
    }

    let existingCardStatus: CardTokenStatus | undefined;

    if (lastFourDigits) {
      existingCardStatus = await this.getCardStatus(lastFourDigits);
    }

    // Get additional eligibility info (e.g., tokenReferenceId for Google)
    const additionalInfo = await this.getAdditionalEligibilityInfo(
      lastFourDigits,
      existingCardStatus,
    );

    // Determine recommended action based on card status
    const { canAddCard, recommendedAction, ineligibilityReason } =
      this.determineActionForStatus(existingCardStatus);

    return {
      isAvailable: true,
      canAddCard,
      existingCardStatus,
      ineligibilityReason,
      recommendedAction,
      ...additionalInfo,
    };
  }

  /**
   * Get additional eligibility information (override in subclasses)
   */
  protected async getAdditionalEligibilityInfo(
    _lastFourDigits?: string,
    _existingCardStatus?: CardTokenStatus,
  ): Promise<Partial<WalletEligibility>> {
    return {};
  }

  /**
   * Determine the recommended action based on card status
   * Can be overridden by subclasses for platform-specific behavior
   */
  protected determineActionForStatus(status?: CardTokenStatus): {
    canAddCard: boolean;
    recommendedAction: WalletEligibility['recommendedAction'];
    ineligibilityReason?: string;
  } {
    switch (status) {
      case undefined:
      case 'not_found':
        return {
          canAddCard: true,
          recommendedAction: 'add_card',
        };

      case 'requires_activation':
        // Default behavior - subclasses can override
        return {
          canAddCard: true,
          recommendedAction: 'add_card',
        };

      case 'active':
        return {
          canAddCard: false,
          recommendedAction: 'none',
          ineligibilityReason: strings(
            'card.push_provisioning.error_card_already_in_wallet',
            { walletName: getWalletName() },
          ),
        };

      case 'pending':
        return {
          canAddCard: false,
          recommendedAction: 'wait',
          ineligibilityReason: strings(
            'card.push_provisioning.error_card_pending',
            { walletName: getWalletName() },
          ),
        };

      case 'suspended':
      case 'deactivated':
        return {
          canAddCard: false,
          recommendedAction: 'contact_support',
          ineligibilityReason: strings(
            'card.push_provisioning.error_card_suspended',
            { walletName: getWalletName() },
          ),
        };

      default:
        return {
          canAddCard: false,
          recommendedAction: 'none',
        };
    }
  }

  /**
   * Add a listener for card activation events
   */
  addActivationListener(
    callback: (event: CardActivationEvent) => void,
  ): () => void {
    this.activationListeners.add(callback);

    // Set up the native listener asynchronously once the module is loaded
    this.setupNativeListenerIfNeeded();

    // Return unsubscribe function
    return () => {
      this.activationListeners.delete(callback);

      // Remove native listener if no more listeners
      if (this.activationListeners.size === 0 && this.listenerSubscription) {
        this.listenerSubscription.remove();
        this.listenerSubscription = undefined;
      }
    };
  }

  /**
   * Set up the native event listener once the module is loaded
   */
  protected async setupNativeListenerIfNeeded(): Promise<void> {
    // Already have a listener subscription
    if (this.listenerSubscription) {
      return;
    }

    // No listeners registered, don't set up native listener
    if (this.activationListeners.size === 0) {
      return;
    }

    try {
      // Wait for the module to load
      const wallet = await this.getWalletModule();

      // Check again after await - subscription might have been set up or listeners removed
      if (this.listenerSubscription || this.activationListeners.size === 0) {
        return;
      }

      this.listenerSubscription = wallet.addListener(
        'onCardActivated',
        (data: unknown) => {
          Logger.log(`${this.getAdapterName()}: onCardActivated`, data);
          this.handleNativeActivationEvent(data);
        },
      );
    } catch (error) {
      Logger.log(`${this.getAdapterName()}: Failed to set up native listener`, {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Notify all activation listeners
   */
  protected notifyActivationListeners(event: CardActivationEvent): void {
    this.activationListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        Logger.log(`${this.getAdapterName()}: Error in activation listener`, {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Create a platform not supported error result
   */
  protected createPlatformNotSupportedError(): ProvisioningError {
    return new ProvisioningError(
      ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
      strings('card.push_provisioning.error_platform_not_supported'),
    );
  }

  /**
   * Create an invalid card data error result
   */
  protected createInvalidCardDataError(): ProvisioningError {
    return new ProvisioningError(
      ProvisioningErrorCode.INVALID_CARD_DATA,
      strings('card.push_provisioning.error_invalid_card_data'),
    );
  }
}
