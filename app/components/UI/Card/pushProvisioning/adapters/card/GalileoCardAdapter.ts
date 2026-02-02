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
  ProvisioningResponse,
  ProvisioningError,
  ProvisioningErrorCode,
  CardNetwork,
  ApplePayEncryptedPayload,
} from '../../types';
import { ICardProviderAdapter } from './ICardProviderAdapter';
import { CardSDK } from '../../../sdk/CardSDK';
import { strings } from '../../../../../../../locales/i18n';

/**
 * Galileo Card Provider Adapter
 *
 * This adapter interfaces with the Galileo API to encrypt card data
 * for push provisioning to Google Wallet.
 *
 * Galileo Push Provisioning Flow:
 * 1. App initiates provisioning and gets card ID
 * 2. App sends data to Galileo's Create Provisioning Request API
 * 3. Galileo encrypts the payload and returns it
 * 4. App passes encrypted payload to wallet SDK
 *
 * @see https://docs.galileo-ft.com/pro/docs/creating-a-provisioning-request
 */
export class GalileoCardAdapter implements ICardProviderAdapter {
  readonly providerId: CardProviderId = 'galileo';

  private cardSDK: CardSDK;

  constructor(cardSDK: CardSDK) {
    this.cardSDK = cardSDK;
  }

  /**
   * Get pre-encrypted opaque payment card data for Google Wallet
   *
   * For Google Wallet, we need to send the card ID
   * to Galileo, which returns the pre-encrypted opaque payment card data.
   */
  async getOpaquePaymentCard(): Promise<ProvisioningResponse> {
    try {
      const response =
        await this.cardSDK.createGoogleWalletProvisioningRequest();

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
   * Convert Base64-encoded string to hex-encoded string
   *
   * PassKit provides data as Base64-encoded strings, but the API
   * expects hex-encoded strings.
   *
   * @param base64 - Base64-encoded string
   * @returns Hex-encoded string
   */
  private base64ToHex(base64: string): string {
    // Use Buffer to decode Base64 and convert to hex
    return Buffer.from(base64, 'base64').toString('hex');
  }

  /**
   * Get encrypted payload for Apple Pay in-app provisioning
   *
   * For Apple Pay, PassKit provides cryptographic data (nonce, certificates)
   * as Base64-encoded strings. This method converts them to hex and sends
   * to Galileo to get the encrypted payload.
   *
   * @param nonce - Cryptographic nonce from PassKit (Base64-encoded)
   * @param nonceSignature - Signature of the nonce from PassKit (Base64-encoded)
   * @param certificates - Array of certificate strings from PassKit (Base64-encoded)
   * @param certificates[0] - leaf certificate
   * @param certificates[1] - intermediate certificate
   * @returns Promise resolving to the encrypted Apple Pay payload
   */
  async getApplePayEncryptedPayload(
    nonce: string,
    nonceSignature: string,
    certificates: string[],
  ): Promise<ApplePayEncryptedPayload> {
    try {
      // Validate certificates array
      if (!certificates || certificates.length < 2) {
        throw new ProvisioningError(
          ProvisioningErrorCode.ENCRYPTION_FAILED,
          strings('card.push_provisioning.error_encryption_failed'),
        );
      }

      // Convert Base64 to hex as required by the API
      const leafCertificate = this.base64ToHex(certificates[0]);
      const intermediateCertificate = this.base64ToHex(certificates[1]);
      const nonceHex = this.base64ToHex(nonce);
      const nonceSignatureHex = this.base64ToHex(nonceSignature);

      const response = await this.cardSDK.createApplePayProvisioningRequest({
        leafCertificate,
        intermediateCertificate,
        nonce: nonceHex,
        nonceSignature: nonceSignatureHex,
      });

      if (
        !response?.encryptedPassData ||
        !response?.activationData ||
        !response?.ephemeralPublicKey
      ) {
        throw new ProvisioningError(
          ProvisioningErrorCode.ENCRYPTION_FAILED,
          strings('card.push_provisioning.error_encryption_failed'),
        );
      }

      return {
        encryptedPassData: response.encryptedPassData,
        activationData: response.activationData,
        ephemeralPublicKey: response.ephemeralPublicKey,
      };
    } catch (error) {
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
}
