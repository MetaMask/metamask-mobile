/**
 * Controller-backed Card Provider Adapter
 *
 * Implementation of ICardProviderAdapter that delegates to CardController
 * instead of directly using CardSDK. Used after the SDK-to-Controller migration.
 */

import {
  ProvisioningError,
  ProvisioningErrorCode,
  type CardProviderId,
  type ApplePayEncryptedPayload,
} from '../../types';
import type { ICardProviderAdapter } from './ICardProviderAdapter';
import Engine from '../../../../../../core/Engine';
import { strings } from '../../../../../../../locales/i18n';

export class ControllerCardAdapter implements ICardProviderAdapter {
  readonly providerId: CardProviderId = 'galileo';

  async getOpaquePaymentCard(): Promise<{ opaquePaymentCard: string }> {
    try {
      const response =
        await Engine.context.CardController.createGoogleWalletProvisioningRequest();

      if (!response?.opaquePaymentCard) {
        throw new ProvisioningError(
          ProvisioningErrorCode.ENCRYPTION_FAILED,
          strings('card.push_provisioning.error_encryption_failed'),
        );
      }

      return { opaquePaymentCard: response.opaquePaymentCard };
    } catch (error) {
      if (error instanceof ProvisioningError) throw error;
      throw new ProvisioningError(
        ProvisioningErrorCode.ENCRYPTION_FAILED,
        strings('card.push_provisioning.error_encryption_failed'),
        error instanceof Error ? error : undefined,
      );
    }
  }

  private base64ToHex(base64: string): string {
    return Buffer.from(base64, 'base64').toString('hex');
  }

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

      const response =
        await Engine.context.CardController.createApplePayProvisioningRequest({
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
      if (error instanceof ProvisioningError) throw error;
      throw new ProvisioningError(
        ProvisioningErrorCode.ENCRYPTION_FAILED,
        strings('card.push_provisioning.error_encryption_failed'),
        error instanceof Error ? error : undefined,
      );
    }
  }
}
