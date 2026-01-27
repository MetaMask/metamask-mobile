/**
 * Push Provisioning Service
 *
 * Main orchestration service for push provisioning operations.
 * Coordinates between card provider adapters and wallet provider adapters.
 */

import { Platform, PlatformOSType } from 'react-native';
import {
  ProvisioningRequest,
  ProvisioningResult,
  ProvisioningError,
  ProvisioningErrorCode,
  WalletEligibility,
  DeviceInfo,
  CardDisplayInfo,
  CardActivationEvent,
} from '../types';
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
  private cardAdapter: ICardProviderAdapter | null;
  private walletAdapter: IWalletProviderAdapter | null;
  private enableLogs: boolean;

  constructor(
    cardAdapter: ICardProviderAdapter | null,
    walletAdapter: IWalletProviderAdapter | null,
    enableLogs = false,
  ) {
    this.cardAdapter = cardAdapter;
    this.walletAdapter = walletAdapter;
    this.enableLogs = enableLogs;
  }

  /**
   * Get the current platform
   */
  private getPlatform(): PlatformOSType {
    const platform = Platform.OS;
    if (platform !== 'android' && platform !== 'ios') {
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
      if (!this.walletAdapter) {
        this.logDebug('isAvailable: No wallet adapter for platform', {
          platform: Platform.OS,
        });
        return false;
      }

      return await this.walletAdapter.checkAvailability();
    } catch (error) {
      this.logDebug('isAvailable: Error', {
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof ProvisioningError ? error.code : undefined,
      });
      return false;
    }
  }

  /**
   * Check wallet eligibility for a specific card
   */
  async checkEligibility(lastFourDigits?: string): Promise<WalletEligibility> {
    try {
      if (!this.walletAdapter) {
        return {
          isAvailable: false,
          canAddCard: false,
          ineligibilityReason: strings(
            'card.push_provisioning.error_wallet_not_available',
          ),
        };
      }
      return await this.walletAdapter.getEligibility(lastFourDigits);
    } catch (error) {
      this.logDebug('checkEligibility error', error);
      return {
        isAvailable: false,
        canAddCard: false,
        ineligibilityReason:
          error instanceof Error
            ? error.message
            : strings('card.push_provisioning.error_unknown'),
      };
    }
  }

  /**
   * Get card display information
   */
  async getCardDisplayInfo(cardId: string): Promise<CardDisplayInfo> {
    if (!this.cardAdapter) {
      throw new ProvisioningError(
        ProvisioningErrorCode.CARD_PROVIDER_NOT_FOUND,
        strings('card.push_provisioning.error_card_provider_not_found'),
      );
    }
    return await this.cardAdapter.getCardDetails(cardId);
  }

  /**
   * Initiate push provisioning for a card
   *
   * This is the main entry point for provisioning a card to a mobile wallet.
   */
  async initiateProvisioning(
    options: ProvisioningOptions,
  ): Promise<ProvisioningResult> {
    const { cardId, skipEligibilityCheck = false } = options;

    this.logDebug('initiateProvisioning', { cardId });

    try {
      // 1. Validate adapters are available
      if (!this.cardAdapter) {
        throw new ProvisioningError(
          ProvisioningErrorCode.CARD_PROVIDER_NOT_FOUND,
          strings('card.push_provisioning.error_card_provider_not_found'),
        );
      }

      if (!this.walletAdapter) {
        throw new ProvisioningError(
          ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
          strings('card.push_provisioning.error_wallet_not_available'),
        );
      }

      // 2. Check card eligibility
      if (!skipEligibilityCheck) {
        const cardEligibility = await this.cardAdapter.checkEligibility(cardId);
        if (!cardEligibility.eligible) {
          throw new ProvisioningError(
            ProvisioningErrorCode.CARD_NOT_ELIGIBLE,
            cardEligibility.reason ??
              strings('card.push_provisioning.error_card_not_eligible'),
          );
        }
      }

      // 3. Check wallet availability
      const walletAvailable = await this.walletAdapter.checkAvailability();
      if (!walletAvailable) {
        throw new ProvisioningError(
          ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
          strings('card.push_provisioning.error_wallet_not_available'),
        );
      }

      // 4. Get card details for provisioning
      const cardDetails = await this.cardAdapter.getCardDetails(cardId);

      // 5. Provision the card
      return await this.provisionCard(
        this.cardAdapter,
        this.walletAdapter,
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
          error instanceof Error
            ? error.message
            : strings('card.push_provisioning.error_unknown'),
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  /**
   * Provision card to wallet
   *
   * Flow:
   * 1. Get wallet data (deviceId, walletAccountId)
   * 2. Get opaque payment card from card provider
   * 3. Call wallet adapter to push tokenize
   */
  private async provisionCard(
    cardAdapter: ICardProviderAdapter,
    walletAdapter: IWalletProviderAdapter,
    cardId: string,
    cardDetails: CardDisplayInfo,
  ): Promise<ProvisioningResult> {
    this.logDebug('provisionCard', { cardId });

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
      walletType: walletAdapter.walletType,
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
   * Resume provisioning for a card that requires activation
   */
  async resumeProvisioning(
    tokenReferenceId: string,
    cardNetwork: string,
    cardholderName?: string,
    lastFourDigits?: string,
  ): Promise<ProvisioningResult> {
    if (!this.walletAdapter) {
      return {
        status: 'error',
        error: new ProvisioningError(
          ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
          strings('card.push_provisioning.error_wallet_not_available'),
        ),
      };
    }

    try {
      if (!this.walletAdapter.resumeProvisioning) {
        return {
          status: 'error',
          error: new ProvisioningError(
            ProvisioningErrorCode.UNKNOWN_ERROR,
            strings('card.push_provisioning.error_unknown'),
          ),
        };
      }

      return await this.walletAdapter.resumeProvisioning(
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
    if (!this.walletAdapter) {
      return () => undefined;
    }
    return this.walletAdapter.addActivationListener(callback);
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

/**
 * Create a PushProvisioningService instance with the given adapters
 */
export function createPushProvisioningService(
  cardAdapter: ICardProviderAdapter | null,
  walletAdapter: IWalletProviderAdapter | null,
  enableLogs = __DEV__,
): PushProvisioningService {
  return new PushProvisioningService(cardAdapter, walletAdapter, enableLogs);
}
