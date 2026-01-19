/**
 * Galileo Card Provider Adapter
 *
 * Implementation of ICardProviderAdapter for Galileo card issuing platform.
 * Handles payload encryption for Google Wallet provisioning.
 *
 * @see https://docs.galileo-ft.com/pro/docs/setup-for-push-provisioning
 */

import {
  CardProviderId,
  CardDisplayInfo,
  ProvisioningRequest,
  ProvisioningResponse,
  ProvisioningError,
  ProvisioningErrorCode,
  GalileoConfig,
  CardNetwork,
} from '../../types';
import { ICardProviderAdapter } from './ICardProviderAdapter';
import { CardSDK } from '../../../sdk/CardSDK';
import Logger from '../../../../../../util/Logger';
import { strings } from '../../../../../../../locales/i18n';

/**
 * Galileo-specific provisioning request parameters
 */
interface GalileoProvisioningParams {
  cardId: string;
  walletType: 'google_wallet';
  deviceId?: string;
  walletAccountId?: string;
}

/**
 * Galileo Card Provider Adapter
 *
 * This adapter interfaces with the Galileo API to encrypt card data
 * for push provisioning to Google Wallet.
 *
 * Galileo Push Provisioning Flow:
 * 1. App initiates provisioning and gets wallet data (deviceId, walletId)
 * 2. App sends data to Galileo's Create Provisioning Request API
 * 3. Galileo encrypts the payload and returns it
 * 4. App passes encrypted payload to wallet SDK
 *
 * @see https://docs.galileo-ft.com/pro/docs/creating-a-provisioning-request
 */
export class GalileoCardAdapter implements ICardProviderAdapter {
  readonly providerId: CardProviderId = 'galileo';

  private cardSDK: CardSDK;
  private config: GalileoConfig;
  private enableLogs: boolean;

  constructor(cardSDK: CardSDK, config?: Partial<GalileoConfig>) {
    this.cardSDK = cardSDK;
    this.config = {
      apiBaseUrl: config?.apiBaseUrl ?? '',
      apiKey: config?.apiKey,
      timeout: config?.timeout ?? 30000,
      enableLogs: config?.enableLogs ?? false,
      programId: config?.programId,
    };
    this.enableLogs = this.config.enableLogs ?? false;
  }

  /**
   * Check if this adapter supports the given card
   *
   * For Galileo, we check if the card exists and is in a provisionable state.
   */
  async supportsCard(cardId: string): Promise<boolean> {
    try {
      this.logDebug('supportsCard', { cardId });

      // Use the CardSDK to check if the card exists and is valid
      // This would typically call an endpoint to verify the card
      const cardDetails = await this.cardSDK.getCardDetails();

      // Check if this card ID matches and is in a valid state
      return cardDetails?.id === cardId && cardDetails?.status === 'ACTIVE';
    } catch (error) {
      this.logDebug('supportsCard error', error);
      return false;
    }
  }

  /**
   * Check if the card is eligible for provisioning
   */
  async checkEligibility(
    cardId: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      this.logDebug('checkEligibility', { cardId });

      const cardDetails = await this.cardSDK.getCardDetails();

      if (!cardDetails) {
        return {
          eligible: false,
          reason: 'Card not found',
        };
      }

      if (cardDetails.id !== cardId) {
        return {
          eligible: false,
          reason: 'Card ID mismatch',
        };
      }

      if (cardDetails.status !== 'ACTIVE') {
        return {
          eligible: false,
          reason: `Card is not active (status: ${cardDetails.status})`,
        };
      }

      return { eligible: true };
    } catch (error) {
      this.logDebug('checkEligibility error', error);
      return {
        eligible: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get pre-encrypted opaque payment card data for Google Wallet
   *
   * For Google Wallet, we need to send the device ID and wallet account ID
   * to Galileo, which returns the pre-encrypted opaque payment card data.
   */
  async getOpaquePaymentCard(
    request: ProvisioningRequest,
  ): Promise<ProvisioningResponse> {
    try {
      this.logDebug('getOpaquePaymentCard', {
        cardId: request.cardId,
        deviceId: request.walletData.deviceId,
        walletAccountId: request.walletData.walletAccountId,
      });

      const params: GalileoProvisioningParams = {
        cardId: request.cardId,
        walletType: 'google_wallet',
        deviceId: request.walletData.deviceId,
        walletAccountId: request.walletData.walletAccountId,
      };

      const response = await this.cardSDK.createProvisioningRequest(params);

      if (!response?.opaquePaymentCard) {
        throw new ProvisioningError(
          ProvisioningErrorCode.ENCRYPTION_FAILED,
          strings('card.push_provisioning.error_encryption_failed'),
        );
      }

      return {
        success: true,
        encryptedPayload: {
          opaquePaymentCard: response.opaquePaymentCard,
        },
        cardNetwork: response.cardNetwork as CardNetwork,
        lastFourDigits: response.lastFourDigits,
        cardholderName: response.cardholderName,
        cardDescription: response.cardDescription,
      };
    } catch (error) {
      this.logDebug('getOpaquePaymentCard error', error);

      if (error instanceof ProvisioningError) {
        throw error;
      }

      throw new ProvisioningError(
        ProvisioningErrorCode.ENCRYPTION_FAILED,
        strings('card.push_provisioning.error_encryption_failed'),
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get card details for display purposes
   */
  async getCardDetails(cardId: string): Promise<CardDisplayInfo> {
    try {
      this.logDebug('getCardDetails', { cardId });

      const cardDetails = await this.cardSDK.getCardDetails();

      if (!cardDetails || cardDetails.id !== cardId) {
        throw new ProvisioningError(
          ProvisioningErrorCode.INVALID_CARD_DATA,
          strings('card.push_provisioning.error_card_not_found'),
        );
      }

      return {
        cardId: cardDetails.id,
        cardholderName: cardDetails.holderName,
        lastFourDigits: cardDetails.panLast4,
        cardNetwork: 'MASTERCARD',
        cardDescription: `MetaMask Card ending in ${cardDetails.panLast4}`,
        expiryDate: cardDetails.expiryDate,
      };
    } catch (error) {
      this.logDebug('getCardDetails error', error);

      if (error instanceof ProvisioningError) {
        throw error;
      }

      throw new ProvisioningError(
        ProvisioningErrorCode.INVALID_CARD_DATA,
        strings('card.push_provisioning.error_invalid_card_data'),
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Log debug information
   */
  private logDebug(method: string, data: unknown): void {
    if (this.enableLogs) {
      Logger.log(`GalileoCardAdapter.${method}`, JSON.stringify(data, null, 2));
    }
  }
}
