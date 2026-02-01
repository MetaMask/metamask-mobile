/**
 * Apple Wallet Provider Adapter
 *
 * Implementation of IWalletProviderAdapter for Apple Wallet on iOS.
 * Wraps the react-native-wallet library's iOS-specific methods.
 *
 * Currently only Mastercard is supported.
 */

import { Platform, PlatformOSType } from 'react-native';
import {
  WalletType,
  WalletEligibility,
  ProvisionCardParams,
  ProvisioningResult,
  CardActivationEvent,
  ProvisioningError,
  ProvisioningErrorCode,
  CardTokenStatus,
} from '../../types';
import { IWalletProviderAdapter } from './IWalletProviderAdapter';
import {
  mapCardStatus,
  mapTokenizationStatus,
  createErrorResult,
  logAdapterError,
} from './utils';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';
import { getWalletName } from '../../constants';

// Types from react-native-wallet for iOS
interface IOSCardData {
  network: string;
  cardHolderName: string;
  lastDigits: string;
  cardDescription: string;
}

interface IOSEncryptPayload {
  encryptedPassData: string;
  activationData: string;
  ephemeralPublicKey: string;
}

/**
 * Apple Wallet Provider Adapter
 *
 * This adapter handles card provisioning to Apple Wallet on iOS devices.
 * It uses the react-native-wallet library to interact with the PassKit SDK.
 *
 * Apple Pay In-App Provisioning Flow:
 * 1. Check if Apple Wallet is available on the device (PKAddPaymentPassViewController)
 * 2. Present the Add Payment Pass view to the user
 * 3. PassKit SDK returns nonce, nonceSignature, and certificates
 * 4. Send these to the card provider API to get encrypted payload
 * 5. Return encrypted payload to PassKit to complete provisioning
 * 6. Apple Wallet adds the card
 */
export class AppleWalletAdapter implements IWalletProviderAdapter {
  readonly walletType: WalletType = 'apple_wallet';
  readonly platform: PlatformOSType = 'ios';

  private activationListeners: Set<(event: CardActivationEvent) => void>;
  private walletModule: typeof import('@expensify/react-native-wallet') | null =
    null;
  private listenerSubscription?: { remove: () => void };

  private moduleLoadPromise: Promise<void> | null = null;
  private moduleLoadError: Error | null = null;

  constructor() {
    this.activationListeners = new Set();
    // Start loading the module immediately but don't block
    this.moduleLoadPromise = this.initializeWalletModule();
  }

  /**
   * Initialize the wallet module lazily
   */
  private async initializeWalletModule(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      this.walletModule = await import('@expensify/react-native-wallet');
      this.moduleLoadError = null;
    } catch (error) {
      this.moduleLoadError =
        error instanceof Error ? error : new Error(String(error));
      Logger.log(
        'AppleWalletAdapter: Failed to load wallet module',
        this.moduleLoadError.message,
      );
    }
  }

  /**
   * Get the wallet module, ensuring it's loaded
   */
  private async getWalletModule(): Promise<
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

      Logger.log('AppleWalletAdapter.getWalletModule: Module not available', {
        hasModule: !!this.walletModule,
        loadError: this.moduleLoadError?.message,
        platform: Platform.OS,
      });

      throw new ProvisioningError(
        ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
        errorMessage,
        this.moduleLoadError ?? undefined,
      );
    }

    return this.walletModule;
  }

  /**
   * Check if Apple Wallet is available on this device
   */
  async checkAvailability(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      Logger.log('AppleWalletAdapter: Not available - platform is not iOS');
      return false;
    }

    try {
      const wallet = await this.getWalletModule();
      const isAvailable = await wallet.checkWalletAvailability();

      if (!isAvailable) {
        Logger.log('AppleWalletAdapter: Not available');
      }

      return isAvailable;
    } catch (error) {
      Logger.log('AppleWalletAdapter: Not available - Error:', {
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get detailed wallet eligibility information
   *
   * Returns eligibility details including:
   * - Whether wallet is available
   * - Whether card can be added
   * - Current card status in wallet
   * - Recommended action (add_card, resume, none, etc.)
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

    // Determine recommended action based on card status
    const { canAddCard, recommendedAction, ineligibilityReason } =
      this.determineActionForStatus(existingCardStatus);

    return {
      isAvailable: true,
      canAddCard,
      existingCardStatus,
      ineligibilityReason,
      recommendedAction,
    };
  }

  /**
   * Determine the recommended action based on card status
   */
  private determineActionForStatus(status?: CardTokenStatus): {
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
        // Apple Wallet doesn't have a separate resume flow like Google
        // Users need to re-add the card
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
   * Check the status of a specific card in Apple Wallet
   */
  async getCardStatus(lastFourDigits: string): Promise<CardTokenStatus> {
    try {
      const wallet = await this.getWalletModule();
      const status = await wallet.getCardStatusBySuffix(lastFourDigits);
      return mapCardStatus(status);
    } catch (error) {
      logAdapterError('AppleWalletAdapter', 'getCardStatus', error);
      return 'not_found';
    }
  }

  /**
   * Provision a card to Apple Wallet
   *
   * This uses the PassKit SDK's in-app provisioning flow with a callback
   * pattern. The SDK presents the Add Payment Pass view, which returns
   * cryptographic data (nonce, certificates) that must be sent to the
   * card provider to get the encrypted payload.
   *
   * @param params - The provisioning parameters
   * @returns Promise resolving to the provisioning result
   */
  async provisionCard(
    params: ProvisionCardParams,
  ): Promise<ProvisioningResult> {
    if (Platform.OS !== 'ios') {
      return {
        status: 'error',
        error: new ProvisioningError(
          ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
          strings('card.push_provisioning.error_platform_not_supported'),
        ),
      };
    }

    // Apple Pay requires the issuer encrypt callback to be provided
    const { issuerEncryptCallback } = params;
    if (!issuerEncryptCallback) {
      return {
        status: 'error',
        error: new ProvisioningError(
          ProvisioningErrorCode.INVALID_CARD_DATA,
          strings('card.push_provisioning.error_invalid_card_data'),
        ),
      };
    }

    try {
      const wallet = await this.getWalletModule();

      const cardData: IOSCardData = {
        network: params.cardNetwork.toLowerCase(),
        cardHolderName: params.cardholderName || 'Card Holder', // Fallback for staging environment
        lastDigits: params.lastFourDigits,
        cardDescription:
          params.cardDescription ||
          `MetaMask Card ending in ${params.lastFourDigits}`,
      };

      // Validate required fields before calling native code
      if (
        !cardData.network ||
        !cardData.cardHolderName ||
        !cardData.lastDigits ||
        !cardData.cardDescription
      ) {
        return {
          status: 'error',
          error: new ProvisioningError(
            ProvisioningErrorCode.INVALID_CARD_DATA,
            strings('card.push_provisioning.error_invalid_card_data'),
          ),
        };
      }

      // Call addCardToAppleWallet with the callback
      // The callback is invoked by PassKit with nonce, nonceSignature, and certificates
      // We must call the card provider to get the encrypted payload and return it
      const status = await wallet.addCardToAppleWallet(
        cardData,
        async (
          nonce: string,
          nonceSignature: string,
          certificates: string[],
        ): Promise<IOSEncryptPayload> => {
          // Call the issuer encrypt callback to get encrypted data from card provider
          const encryptedPayload = await issuerEncryptCallback(
            nonce,
            nonceSignature,
            certificates,
          );

          return {
            encryptedPassData: encryptedPayload.encryptedPassData,
            activationData: encryptedPayload.activationData,
            ephemeralPublicKey: encryptedPayload.ephemeralPublicKey,
          };
        },
      );

      return {
        status: mapTokenizationStatus(status),
      };
    } catch (error) {
      logAdapterError('AppleWalletAdapter', 'provisionCard', error);
      return createErrorResult(
        error,
        ProvisioningErrorCode.UNKNOWN_ERROR,
        strings('card.push_provisioning.error_unknown'),
      );
    }
  }

  /**
   * Add a listener for card activation events
   *
   * On iOS, this listens for PKPassLibraryDidChange notifications
   * and checks for newly activated passes.
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
  private async setupNativeListenerIfNeeded(): Promise<void> {
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
        (data) => {
          Logger.log('AppleWalletAdapter: onCardActivated', data);
          // data is onCardActivatedPayload: { tokenId: string; actionStatus: 'active' | 'canceled' }
          const event: CardActivationEvent = {
            serialNumber: data.tokenId,
            status:
              data.actionStatus === 'active'
                ? 'activated'
                : data.actionStatus === 'canceled'
                  ? 'canceled'
                  : 'failed',
          };
          this.notifyActivationListeners(event);
        },
      );
    } catch (error) {
      Logger.log('AppleWalletAdapter: Failed to set up native listener', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Notify all activation listeners
   */
  private notifyActivationListeners(event: CardActivationEvent): void {
    this.activationListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        Logger.log('AppleWalletAdapter: Error in activation listener', {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
}
