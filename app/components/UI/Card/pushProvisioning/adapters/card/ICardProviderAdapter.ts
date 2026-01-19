/**
 * Card Provider Adapter Interface
 *
 * Defines the contract for card provider adapters that handle
 * payload encryption for push provisioning.
 */

import {
  CardProviderId,
  CardDisplayInfo,
  ProvisioningRequest,
  ProvisioningResponse,
} from '../../types';

/**
 * Interface for card provider adapters.
 *
 * Card providers (e.g., Galileo) are responsible for:
 * - Validating card eligibility for provisioning
 * - Encrypting card data for wallet providers
 * - Providing card display information
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
   * Check if this adapter supports provisioning for the given card
   *
   * @param cardId - The card identifier to check
   * @returns Promise resolving to true if the card is supported
   */
  supportsCard(cardId: string): Promise<boolean>;

  /**
   * Get pre-encrypted opaque payment card data for Google Wallet
   *
   * The card provider pre-encrypts the card data before it's passed
   * to the Tap and Pay SDK.
   *
   * Flow:
   * 1. Get wallet data (deviceId, walletAccountId) from Google SDK
   * 2. Send wallet data to card provider API
   * 3. Card provider returns encrypted opaque payment card
   * 4. Opaque payment card is passed to Google Tap and Pay SDK
   *
   * @param request - The provisioning request with wallet data
   * @returns Promise resolving to the provisioning response with encrypted payload
   */
  getOpaquePaymentCard(
    request: ProvisioningRequest,
  ): Promise<ProvisioningResponse>;

  /**
   * Get card details for display purposes
   *
   * Used to show card information in the UI before provisioning.
   *
   * @param cardId - The card identifier
   * @returns Promise resolving to card display information
   */
  getCardDetails(cardId: string): Promise<CardDisplayInfo>;

  /**
   * Check if the card is eligible for provisioning
   *
   * This performs a deeper eligibility check than supportsCard,
   * including checking card status, account standing, etc.
   *
   * @param cardId - The card identifier
   * @returns Promise resolving to eligibility status with optional reason
   */
  checkEligibility(
    cardId: string,
  ): Promise<{ eligible: boolean; reason?: string }>;
}
