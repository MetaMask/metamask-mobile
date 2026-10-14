/**
 * Controller-backed card provisioning adapter.
 *
 * Forwards raw PassKit values to CardController. Each provider adapts them.
 */

import {
  ProvisioningError,
  ProvisioningErrorCode,
  type ApplePayEncryptedPayload,
  type WalletType,
} from '../../types';
import type { ICardProviderAdapter } from './ICardProviderAdapter';
import Engine from '../../../../../../core/Engine';
import { strings } from '../../../../../../../locales/i18n';
import {
  CardProviderError,
  CardProviderErrorCode,
  type CardProviderId,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

function mapProviderError(error: unknown): ProvisioningError {
  if (error instanceof ProvisioningError) {
    return error;
  }

  if (error instanceof CardProviderError) {
    switch (error.code) {
      case CardProviderErrorCode.InvalidRequest:
        return new ProvisioningError(
          ProvisioningErrorCode.ENCRYPTION_FAILED,
          strings('card.push_provisioning.error_encryption_failed'),
          error,
        );
      case CardProviderErrorCode.Forbidden:
        return new ProvisioningError(
          ProvisioningErrorCode.CARD_NOT_ELIGIBLE,
          strings('card.push_provisioning.error_card_not_eligible'),
          error,
        );
      case CardProviderErrorCode.ServerError:
        return new ProvisioningError(
          ProvisioningErrorCode.PROVIDER_UNAVAILABLE,
          strings('card.push_provisioning.error_provider_unavailable'),
          error,
        );
      case CardProviderErrorCode.InvalidCredentials:
        return new ProvisioningError(
          ProvisioningErrorCode.UNKNOWN_ERROR,
          strings('card.push_provisioning.error_unknown'),
          error,
        );
      default:
        return new ProvisioningError(
          ProvisioningErrorCode.ENCRYPTION_FAILED,
          strings('card.push_provisioning.error_encryption_failed'),
          error,
        );
    }
  }

  return new ProvisioningError(
    ProvisioningErrorCode.ENCRYPTION_FAILED,
    strings('card.push_provisioning.error_encryption_failed'),
    error instanceof Error ? error : undefined,
  );
}

export class ControllerCardAdapter implements ICardProviderAdapter {
  get providerId(): CardProviderId {
    return Engine.context.CardController.state.activeProviderId ?? 'baanx';
  }

  supportsWallet(walletType: WalletType): boolean {
    return walletType === 'apple_wallet' || walletType === 'google_wallet';
  }

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
      throw mapProviderError(error);
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
      throw mapProviderError(error);
    }
  }
}
