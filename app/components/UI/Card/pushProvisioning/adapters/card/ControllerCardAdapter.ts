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

  async getApplePayEncryptedPayload(
    nonce: string,
    nonceSignature: string,
    certificates: string[],
  ): Promise<ApplePayEncryptedPayload> {
    try {
      const response =
        await Engine.context.CardController.createApplePayProvisioningRequest({
          nonce,
          nonceSignature,
          certificates,
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
