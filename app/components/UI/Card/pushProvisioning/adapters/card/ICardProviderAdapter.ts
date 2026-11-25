/**
 * Card Provider Adapter Interface
 *
 * Abstracts card provider differences (APIs, encryption requirements)
 * for push provisioning payload encryption.
 */

import { ApplePayEncryptedPayload, WalletType } from '../../types';
import type { CardProviderId } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

export interface ICardProviderAdapter {
  readonly providerId: CardProviderId;

  supportsWallet(walletType: WalletType): boolean;

  /** Get pre-encrypted opaque payment card data for Google Wallet */
  getOpaquePaymentCard(): Promise<{ opaquePaymentCard: string }>;

  /** Get encrypted payload for Apple Pay in-app provisioning via PassKit nonce/certificates exchange */
  getApplePayEncryptedPayload?(
    nonce: string,
    nonceSignature: string,
    certificates: string[],
  ): Promise<ApplePayEncryptedPayload>;
}
