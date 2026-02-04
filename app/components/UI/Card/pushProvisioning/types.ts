/**
 * Push Provisioning Types
 *
 * Core types and interfaces for the push provisioning feature.
 * This module supports adding cards to mobile wallets (Google Wallet, Apple Pay)
 * from card providers (Galileo, etc.).
 */

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Supported card provider identifiers
 */
export type CardProviderId = 'galileo' | 'monavate';

/**
 * Supported mobile wallet types
 */
export type WalletType = 'google_wallet' | 'apple_wallet';

/**
 * Supported card networks
 * Currently only Mastercard is supported.
 */
export type CardNetwork = 'MASTERCARD';

/**
 * Card token status in the wallet
 */
export type CardTokenStatus =
  | 'not_found'
  | 'active'
  | 'pending'
  | 'suspended'
  | 'deactivated'
  | 'requires_activation';

/**
 * Provisioning operation status
 */
export type ProvisioningStatus =
  | 'idle'
  | 'checking_eligibility'
  | 'provisioning'
  | 'success'
  | 'error'
  | 'canceled';

/**
 * Provisioning error codes
 */
export enum ProvisioningErrorCode {
  // Wallet-related errors
  WALLET_NOT_AVAILABLE = 'WALLET_NOT_AVAILABLE',
  WALLET_NOT_INITIALIZED = 'WALLET_NOT_INITIALIZED',
  CARD_ALREADY_IN_WALLET = 'CARD_ALREADY_IN_WALLET',

  // Card provider errors
  CARD_PROVIDER_NOT_FOUND = 'CARD_PROVIDER_NOT_FOUND',
  CARD_NOT_ELIGIBLE = 'CARD_NOT_ELIGIBLE',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  INVALID_CARD_DATA = 'INVALID_CARD_DATA',

  // User actions
  USER_CANCELED = 'USER_CANCELED',

  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  PLATFORM_NOT_SUPPORTED = 'PLATFORM_NOT_SUPPORTED',
}

// ============================================================================
// Device and Wallet Data Types
// ============================================================================

/**
 * User address for card provisioning
 */
export interface UserAddress {
  name: string;
  addressOne: string;
  addressTwo?: string;
  administrativeArea: string;
  locality: string;
  countryCode: string;
  postalCode: string;
  phoneNumber: string;
}

// ============================================================================
// Card Display Types
// ============================================================================

/**
 * Card information for display purposes
 */
export interface CardDisplayInfo {
  cardId: string;
  cardholderName: string;
  lastFourDigits: string;
  cardNetwork: CardNetwork;
  cardDescription?: string;
  expiryDate?: string;
}

// ============================================================================
// Provisioning Request/Response Types
// ============================================================================

/**
 * Encrypted payload for wallet provisioning
 */
export interface EncryptedPayload {
  opaquePaymentCard?: string;
}

/**
 * Apple Pay encrypted payload returned by the card provider
 *
 * This data is returned after sending nonce, nonceSignature, and certificates
 * to the card provider's Apple Pay provisioning endpoint.
 */
export interface ApplePayEncryptedPayload {
  /** Encrypted card data for PassKit */
  encryptedPassData: string;
  /** Activation data for the pass */
  activationData: string;
  /** Ephemeral public key used for encryption */
  ephemeralPublicKey: string;
}

/**
 * Response from card provider after encrypting payload
 */
export interface ProvisioningResponse {
  success: boolean;
  encryptedPayload?: EncryptedPayload;
  cardNetwork: CardNetwork;
  lastFourDigits: string;
  cardholderName: string;
  cardDescription?: string;
  error?: ProvisioningError;
}

/**
 * Parameters for provisioning a card to a wallet
 */
export interface ProvisionCardParams {
  cardNetwork: CardNetwork;
  cardholderName: string;
  lastFourDigits: string;
  cardDescription?: string;
  encryptedPayload: EncryptedPayload;
  userAddress?: UserAddress;
  /**
   * Callback for Apple Pay in-app provisioning
   *
   * When provisioning to Apple Wallet, PassKit provides nonce, nonceSignature,
   * and certificates that must be sent to the card provider to get the
   * encrypted payload. This callback handles that exchange.
   *
   * @param nonce - Cryptographic nonce from PassKit
   * @param nonceSignature - Signature of the nonce
   * @param certificates - Array of certificate strings from PassKit
   * @returns Promise resolving to the encrypted payload from card provider
   */
  issuerEncryptCallback?: (
    nonce: string,
    nonceSignature: string,
    certificates: string[],
  ) => Promise<ApplePayEncryptedPayload>;
}

/**
 * Result of a provisioning operation
 */
export interface ProvisioningResult {
  status: 'success' | 'canceled' | 'error';
  tokenId?: string;
  error?: ProvisioningError;
}

// ============================================================================
// Wallet Eligibility Types
// ============================================================================

/**
 * Recommended action based on card status
 */
export type WalletAction =
  | 'add_card' // Card not in wallet, show "Add to Wallet" button
  | 'resume' // Card requires activation (Yellow Path), show "Continue Setup"
  | 'none' // Card is active, hide button
  | 'contact_support' // Card is suspended/deactivated, show help option
  | 'wait'; // Card is pending, show status message

/**
 * Wallet eligibility check result
 */
export interface WalletEligibility {
  /** Whether the wallet SDK is available on the device */
  isAvailable: boolean;
  /** Whether a card can be added to the wallet */
  canAddCard: boolean;
  /** Status of existing card in wallet (if any) */
  existingCardStatus?: CardTokenStatus;
  /** Reason if card cannot be added */
  ineligibilityReason?: string;
  /** Recommended action based on card status */
  recommendedAction?: WalletAction;
  /** Token reference ID for resume flow (if status is 'requires_activation') */
  tokenReferenceId?: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Card activation event from wallet
 */
export interface CardActivationEvent {
  tokenId?: string;
  serialNumber?: string;
  status: 'activated' | 'canceled' | 'failed';
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Provisioning error with detailed information
 */
export class ProvisioningError extends Error {
  public code: ProvisioningErrorCode;
  public originalError?: Error;
  public metadata?: Record<string, unknown>;

  constructor(
    code: ProvisioningErrorCode,
    message: string,
    originalError?: Error,
    metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ProvisioningError';
    this.code = code;
    this.originalError = originalError;
    this.metadata = metadata;
  }
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Card details from CardHome (to avoid duplicate API calls)
 */
export interface CardDetails {
  id: string;
  holderName: string;
  panLast4: string;
  status: string;
  expiryDate?: string;
}

/**
 * Options for usePushProvisioning hook
 */
export interface UsePushProvisioningOptions {
  /** Card details from CardHome (includes holderName, panLast4, status, etc.) */
  cardDetails?: CardDetails | null;
  /** User address for Google Wallet provisioning (from user profile) */
  userAddress?: UserAddress;
  onSuccess?: (result: ProvisioningResult) => void;
  onError?: (error: ProvisioningError) => void;
  onCancel?: () => void;
}

/**
 * Return type for usePushProvisioning hook
 */
export interface UsePushProvisioningReturn {
  // Status
  status: ProvisioningStatus;
  error: ProvisioningError | null;

  // Actions
  initiateProvisioning: () => Promise<ProvisioningResult>;
  resetStatus: () => void;

  isProvisioning: boolean;
  isSuccess: boolean;
  isError: boolean;

  isLoading: boolean;
  canAddToWallet: boolean;
}
