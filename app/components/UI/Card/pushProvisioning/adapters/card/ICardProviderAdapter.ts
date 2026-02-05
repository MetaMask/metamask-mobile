/**
 * Card Provider Adapter Interface
 *
 * Defines the contract for card provider adapters that handle
 * payload encryption for push provisioning.
 */

import {
  CardProviderId,
  ProvisioningResponse,
  ApplePayEncryptedPayload,
} from '../../types';

/**
 * Interface for card provider adapters.
 *
 * Card providers (e.g., Galileo) are responsible for:
 * - Encrypting card data for wallet providers
 *
 * Each card provider has different APIs and encryption requirements,
 * so this interface abstracts those differences.
 */
export interface ICardProviderAdapter {
  /**
   * Unique identifier for this card provider
   */
  readonly providerId: CardProviderId;

  /**
   * Get pre-encrypted opaque payment card data for Google Wallet
   *
   * The card provider pre-encrypts the card data before it's passed
   * to the Tap and Pay SDK.
   *
   * Flow:
   * 1. Send card ID to card provider API
   * 3. Card provider returns encrypted opaque payment card
   * 4. Opaque payment card is passed to Google Tap and Pay SDK
   *
   * @returns Promise resolving to the provisioning response with encrypted payload
   */
  getOpaquePaymentCard(): Promise<ProvisioningResponse>;

  /**
   * Get encrypted payload for Apple Pay in-app provisioning
   *
   * This method is called during the Apple Pay provisioning flow when PassKit
   * provides cryptographic data (nonce, certificates) that must be sent to
   * the card provider to get the encrypted payload.
   *
   * Flow:
   * 1. User initiates Add to Apple Wallet
   * 2. PassKit presents the provisioning UI
   * 3. PassKit returns nonce, nonceSignature, and certificates
   * 4. This method sends those to the card provider API
   * 5. Card provider returns encrypted payload
   * 6. Encrypted payload is returned to PassKit to complete provisioning
   *
   * @param nonce - Cryptographic nonce from PassKit
   * @param nonceSignature - Signature of the nonce from PassKit
   * @param certificates - Array of certificate strings from PassKit
   * @returns Promise resolving to the encrypted Apple Pay payload
   */
  getApplePayEncryptedPayload?(
    nonce: string,
    nonceSignature: string,
    certificates: string[],
  ): Promise<ApplePayEncryptedPayload>;
}
