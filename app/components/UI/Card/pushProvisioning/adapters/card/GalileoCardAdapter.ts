/**
 * Galileo Card Provider Adapter
 *
 * Implementation of ICardProviderAdapter for Galileo card issuing platform.
 *
 * @see https://docs.galileo-ft.com/pro/docs/setup-for-push-provisioning
 */

import {
  CardProviderId,
  ProvisioningError,
  ProvisioningErrorCode,
  ApplePayEncryptedPayload,
} from '../../types';
import { ICardProviderAdapter } from './ICardProviderAdapter';
import { CardSDK } from '../../../sdk/CardSDK';
import { strings } from '../../../../../../../locales/i18n';

export class GalileoCardAdapter implements ICardProviderAdapter {
  readonly providerId: CardProviderId = 'galileo';

  private cardSDK: CardSDK;

  constructor(cardSDK: CardSDK) {
    this.cardSDK = cardSDK;
  }

  async getOpaquePaymentCard(): Promise<{ opaquePaymentCard: string }> {
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
        opaquePaymentCard: response.opaquePaymentCard,
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

  /** Convert Base64-encoded string to hex (PassKit provides Base64, API expects hex) */
  private base64ToHex(base64: string): string {
    return Buffer.from(base64, 'base64').toString('hex');
  }

  /**
   * Get encrypted payload for Apple Pay in-app provisioning.
   * Converts PassKit's Base64-encoded nonce/certificates to hex before sending to Galileo.
   */
  async getApplePayEncryptedPayload(
    nonce: string,
    nonceSignature: string,
    certificates: string[],
  ): Promise<ApplePayEncryptedPayload> {
    try {
      if (!certificates || certificates.length < 2) {
        throw new ProvisioningError(
          ProvisioningErrorCode.ENCRYPTION_FAILED,
          strings('card.push_provisioning.error_encryption_failed'),
        );
      }

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
