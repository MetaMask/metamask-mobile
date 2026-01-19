/**
 * Push Provisioning Service
 *
 * Main orchestration service for push provisioning operations.
 * Coordinates between card provider adapters and wallet provider adapters.
 */

import { Platform, PlatformOSType } from 'react-native';
import {
  CardProviderId,
  ProvisioningRequest,
  ProvisioningResult,
  ProvisioningError,
  ProvisioningErrorCode,
  WalletEligibility,
  DeviceInfo,
  CardDisplayInfo,
  CardActivationEvent,
} from '../types';
import { CardProviderRegistry } from '../adapters/card/CardProviderRegistry';
import { WalletProviderRegistry } from '../adapters/wallet/WalletProviderRegistry';
import { ICardProviderAdapter } from '../adapters/card/ICardProviderAdapter';
import { IWalletProviderAdapter } from '../adapters/wallet/IWalletProviderAdapter';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';

/**
 * Options for initiating provisioning
 */
export interface ProvisioningOptions {
  /** The card ID to provision */
  cardId: string;
  /** The card provider ID (defaults to 'galileo') */
  cardProviderId?: CardProviderId;
  /** Skip eligibility check (for resuming provisioning) */
  skipEligibilityCheck?: boolean;
  /** Enable debug logging */
  enableLogs?: boolean;
}

/**
 * Push Provisioning Service
 *
 * This service orchestrates the push provisioning flow by:
 * 1. Checking wallet availability and eligibility
 * 2. Getting wallet-specific data
 * 3. Coordinating with card provider for payload encryption
 * 4. Initiating the native provisioning flow
 */
export class PushProvisioningService {
  private cardProviderRegistry: CardProviderRegistry;
  private walletProviderRegistry: WalletProviderRegistry;
  private enableLogs: boolean;

  constructor(
    cardProviderRegistry?: CardProviderRegistry,
    walletProviderRegistry?: WalletProviderRegistry,
    enableLogs = false,
  ) {
    this.cardProviderRegistry =
      cardProviderRegistry ?? CardProviderRegistry.getInstance();
    this.walletProviderRegistry =
      walletProviderRegistry ?? WalletProviderRegistry.getInstance();
    this.enableLogs = enableLogs;
  }

  /**
   * Get the current platform
   */
  private getPlatform(): PlatformOSType {
    const platform = Platform.OS;
    if (platform !== 'android') {
      throw new ProvisioningError(
        ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
        strings('card.push_provisioning.error_platform_not_supported'),
      );
    }
    return platform;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    return {
      platform: this.getPlatform(),
      osVersion: Platform.Version?.toString(),
    };
  }

  /**
   * Check if push provisioning is available on this device
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if platform is supported first
      this.logDebug('isAvailable: Checking platform', {
        platform: Platform.OS,
      });

      if (Platform.OS !== 'android') {
        this.logDebug('isAvailable: Platform not supported', {
          platform: Platform.OS,
        });
        return false;
      }

      // Check if adapter is registered
      this.logDebug('isAvailable: Getting active adapter...', {
        platform: Platform.OS,
      });
      this.logDebug('isAvailable: Registered adapters', {
        hasGoogleWallet:
          this.walletProviderRegistry.hasAdapter('google_wallet'),
      });

      const walletAdapter = this.walletProviderRegistry.getActiveAdapter();
      this.logDebug('isAvailable: Got adapter, checking availability...', {
        walletType: walletAdapter.walletType,
        platform: walletAdapter.platform,
      });

      const available = await walletAdapter.checkAvailability();
      this.logDebug('isAvailable: Result', { available });
      return available;
    } catch (error) {
      this.logDebug('isAvailable: Error', {
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof ProvisioningError ? error.code : undefined,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    }
  }

  /**
   * Check wallet eligibility for a specific card
   */
  async checkEligibility(lastFourDigits?: string): Promise<WalletEligibility> {
    try {
      const walletAdapter = this.walletProviderRegistry.getActiveAdapter();
      return await walletAdapter.getEligibility(lastFourDigits);
    } catch (error) {
      this.logDebug('checkEligibility error', error);
      return {
        isAvailable: false,
        canAddCard: false,
        ineligibilityReason:
          error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get card display information
   */
  async getCardDisplayInfo(
    cardId: string,
    cardProviderId?: CardProviderId,
  ): Promise<CardDisplayInfo> {
    const cardAdapter = this.getCardAdapter(cardProviderId);
    return await cardAdapter.getCardDetails(cardId);
  }

  /**
   * Initiate push provisioning for a card
   *
   * This is the main entry point for provisioning a card to a mobile wallet.
   */
  async initiateProvisioning(
    options: ProvisioningOptions,
  ): Promise<ProvisioningResult> {
    const { cardId, cardProviderId, skipEligibilityCheck = false } = options;

    this.logDebug('initiateProvisioning', { cardId, cardProviderId });

    try {
      // 1. Get the appropriate adapters
      const cardAdapter = this.getCardAdapter(cardProviderId);
      const walletAdapter = this.walletProviderRegistry.getActiveAdapter();

      // 2. Check card eligibility
      if (!skipEligibilityCheck) {
        const cardEligibility = await cardAdapter.checkEligibility(cardId);
        if (!cardEligibility.eligible) {
          throw new ProvisioningError(
            ProvisioningErrorCode.CARD_NOT_ELIGIBLE,
            cardEligibility.reason ??
              strings('card.push_provisioning.error_card_not_eligible'),
          );
        }
      }

      // 3. Check wallet availability
      const walletAvailable = await walletAdapter.checkAvailability();
      if (!walletAvailable) {
        throw new ProvisioningError(
          ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
          strings('card.push_provisioning.error_wallet_not_available'),
        );
      }

      // 4. Get card details for provisioning
      const cardDetails = await cardAdapter.getCardDetails(cardId);

      // 5. Provision for Google Wallet (only supported platform currently)
      this.getPlatform(); // Validates platform is Android
      return await this.provisionForGoogleWallet(
        cardAdapter,
        walletAdapter,
        cardId,
        cardDetails,
      );
    } catch (error) {
      this.logDebug('initiateProvisioning error', error);

      if (error instanceof ProvisioningError) {
        return {
          status: 'error',
          error,
        };
      }

      return {
        status: 'error',
        error: new ProvisioningError(
          ProvisioningErrorCode.UNKNOWN_ERROR,
          error instanceof Error ? error.message : 'Unknown error occurred',
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  /**
   * Provision for Google Wallet (Android)
   *
   * Flow:
   * 1. Get wallet data (deviceId, walletAccountId)
   * 2. Get opaque payment card from card provider
   * 3. Call wallet adapter to push tokenize
   */
  private async provisionForGoogleWallet(
    cardAdapter: ICardProviderAdapter,
    walletAdapter: IWalletProviderAdapter,
    cardId: string,
    cardDetails: CardDisplayInfo,
  ): Promise<ProvisioningResult> {
    this.logDebug('provisionForGoogleWallet', { cardId });

    // 1. Get wallet data
    const walletData = await walletAdapter.getWalletData();

    if (!walletData.deviceId || !walletData.walletAccountId) {
      throw new ProvisioningError(
        ProvisioningErrorCode.WALLET_NOT_INITIALIZED,
        strings('card.push_provisioning.error_wallet_not_initialized'),
      );
    }

    // 2. Get opaque payment card from card provider
    const deviceInfo = this.getDeviceInfo();
    const request: ProvisioningRequest = {
      cardId,
      walletType: 'google_wallet',
      deviceInfo,
      walletData,
    };

    const response = await cardAdapter.getOpaquePaymentCard(request);

    if (!response.success || !response.encryptedPayload?.opaquePaymentCard) {
      throw new ProvisioningError(
        ProvisioningErrorCode.ENCRYPTION_FAILED,
        strings('card.push_provisioning.error_encryption_failed'),
      );
    }

    // 3. Provision the card
    return await walletAdapter.provisionCard({
      cardNetwork: cardDetails.cardNetwork,
      cardholderName: cardDetails.cardholderName,
      lastFourDigits: cardDetails.lastFourDigits,
      cardDescription: cardDetails.cardDescription,
      encryptedPayload: response.encryptedPayload,
    });
  }

  /**
   * Resume provisioning for a card that requires activation (Android only)
   */
  async resumeProvisioning(
    tokenReferenceId: string,
    cardNetwork: string,
    cardholderName?: string,
    lastFourDigits?: string,
  ): Promise<ProvisioningResult> {
    if (Platform.OS !== 'android') {
      return {
        status: 'error',
        error: new ProvisioningError(
          ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
          strings('card.push_provisioning.error_platform_not_supported'),
        ),
      };
    }

    try {
      const walletAdapter = this.walletProviderRegistry.getActiveAdapter();

      if (!walletAdapter.resumeProvisioning) {
        return {
          status: 'error',
          error: new ProvisioningError(
            ProvisioningErrorCode.UNKNOWN_ERROR,
            strings('card.push_provisioning.error_unknown'),
          ),
        };
      }

      return await walletAdapter.resumeProvisioning(
        tokenReferenceId,
        cardNetwork,
        cardholderName,
        lastFourDigits,
      );
    } catch (error) {
      this.logDebug('resumeProvisioning error', error);
      return {
        status: 'error',
        error: new ProvisioningError(
          ProvisioningErrorCode.UNKNOWN_ERROR,
          error instanceof Error
            ? error.message
            : strings('card.push_provisioning.error_unknown'),
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  /**
   * Add a listener for card activation events
   */
  addActivationListener(
    callback: (event: CardActivationEvent) => void,
  ): () => void {
    try {
      const walletAdapter = this.walletProviderRegistry.getActiveAdapter();
      return walletAdapter.addActivationListener(callback);
    } catch {
      // Return a no-op unsubscribe function if adapter is not available
      return () => undefined;
    }
  }

  /**
   * Get the card adapter for a given provider ID
   */
  private getCardAdapter(providerId?: CardProviderId): ICardProviderAdapter {
    if (providerId) {
      return this.cardProviderRegistry.getAdapter(providerId);
    }
    return this.cardProviderRegistry.getDefaultAdapter();
  }

  /**
   * Log debug information
   */
  private logDebug(method: string, data: unknown): void {
    if (this.enableLogs) {
      Logger.log(
        `PushProvisioningService.${method}`,
        JSON.stringify(data, null, 2),
      );
    }
  }
}

// Export singleton instance
let provisioningServiceInstance: PushProvisioningService | null = null;

/**
 * Get the singleton instance of PushProvisioningService
 */
export function getPushProvisioningService(): PushProvisioningService {
  if (!provisioningServiceInstance) {
    // Enable logs in dev mode
    provisioningServiceInstance = new PushProvisioningService(
      undefined,
      undefined,
      __DEV__,
    );
  }
  return provisioningServiceInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetPushProvisioningService(): void {
  provisioningServiceInstance = null;
}
