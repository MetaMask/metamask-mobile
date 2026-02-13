/**
 * Push Provisioning Types
 *
 * Core types and interfaces for the push provisioning feature.
 * Supports adding cards to mobile wallets (Google Wallet, Apple Pay)
 * from card providers (Galileo, etc.).
 */

/** Supported card provider identifiers */
export type CardProviderId = 'galileo' | 'monavate';

/** Supported mobile wallet types */
export type WalletType = 'google_wallet' | 'apple_wallet';

/** Supported card networks (currently only Mastercard) */
export type CardNetwork = 'MASTERCARD';

/** Card token status in the wallet */
export type CardTokenStatus =
  | 'not_found'
  | 'active'
  | 'pending'
  | 'suspended'
  | 'deactivated'
  | 'requires_activation';

/** Provisioning operation status */
export type ProvisioningStatus =
  | 'idle'
  | 'checking_eligibility'
  | 'provisioning'
  | 'success'
  | 'error'
  | 'canceled';

/** Provisioning error codes */
export enum ProvisioningErrorCode {
  WALLET_NOT_AVAILABLE = 'WALLET_NOT_AVAILABLE',
  CARD_PROVIDER_NOT_FOUND = 'CARD_PROVIDER_NOT_FOUND',
  CARD_NOT_ELIGIBLE = 'CARD_NOT_ELIGIBLE',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  INVALID_CARD_DATA = 'INVALID_CARD_DATA',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  PLATFORM_NOT_SUPPORTED = 'PLATFORM_NOT_SUPPORTED',
}

/** User address for card provisioning */
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

/** Card information for display during provisioning */
export interface CardDisplayInfo {
  cardId: string;
  cardholderName: string;
  lastFourDigits: string;
  cardNetwork: CardNetwork;
  cardDescription?: string;
  expiryDate?: string;
}

/** Encrypted payload for wallet provisioning */
export interface EncryptedPayload {
  opaquePaymentCard?: string;
}

/**
 * Apple Pay encrypted payload returned by the card provider
 * after sending nonce, nonceSignature, and certificates.
 */
export interface ApplePayEncryptedPayload {
  encryptedPassData: string;
  activationData: string;
  ephemeralPublicKey: string;
}

/** Parameters for provisioning a card to a wallet */
export interface ProvisionCardParams {
  cardNetwork: CardNetwork;
  cardholderName: string;
  lastFourDigits: string;
  cardDescription?: string;
  encryptedPayload: EncryptedPayload;
  userAddress?: UserAddress;
  /** Callback for Apple Pay: PassKit provides nonce/certs, returns encrypted payload */
  issuerEncryptCallback?: (
    nonce: string,
    nonceSignature: string,
    certificates: string[],
  ) => Promise<ApplePayEncryptedPayload>;
}

/** Result of a provisioning operation */
export interface ProvisioningResult {
  status: 'success' | 'canceled' | 'error';
  tokenId?: string;
  error?: ProvisioningError;
}

/** Recommended action based on card status */
export type WalletAction =
  | 'add_card'
  | 'resume'
  | 'none'
  | 'contact_support'
  | 'wait';

/** Wallet eligibility check result */
export interface WalletEligibility {
  isAvailable: boolean;
  canAddCard: boolean;
  existingCardStatus?: CardTokenStatus;
  ineligibilityReason?: string;
  recommendedAction?: WalletAction;
  /** Token reference ID for resume flow (requires_activation status) */
  tokenReferenceId?: string;
}

/** Card activation event from wallet */
export interface CardActivationEvent {
  tokenId?: string;
  serialNumber?: string;
  status: 'activated' | 'canceled' | 'failed';
}

/** Provisioning error with detailed information */
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

/** Card details from CardHome (to avoid duplicate API calls) */
export interface CardDetails {
  id: string;
  holderName: string;
  panLast4: string;
  status: string;
  expiryDate?: string;
}

/** Options for usePushProvisioning hook */
export interface UsePushProvisioningOptions {
  cardDetails?: CardDetails | null;
  userAddress?: UserAddress;
  onSuccess?: (result: ProvisioningResult) => void;
  onError?: (error: ProvisioningError) => void;
  onCancel?: () => void;
}

/** Return type for usePushProvisioning hook */
export interface UsePushProvisioningReturn {
  status: ProvisioningStatus;
  error: ProvisioningError | null;
  initiateProvisioning: () => Promise<ProvisioningResult>;
  resetStatus: () => void;
  isProvisioning: boolean;
  isSuccess: boolean;
  isError: boolean;
  isLoading: boolean;
  canAddToWallet: boolean;
}
