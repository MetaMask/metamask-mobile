/**
 * Push Provisioning Types
 *
 * Core types and interfaces for the push provisioning feature.
 * This module supports adding cards to mobile wallets (Google Wallet, Apple Pay)
 * from card providers (Galileo, etc.).
 */

import { PlatformOSType } from 'react-native';

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Supported card provider identifiers
 */
export type CardProviderId = 'galileo' | 'monavate' | 'mock';

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

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',

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
 * Device information for provisioning requests
 */
export interface DeviceInfo {
  platform: PlatformOSType;
  deviceId?: string;
  deviceModel?: string;
  osVersion?: string;
}

/**
 * Wallet-specific data needed for provisioning
 */
export interface WalletData {
  /** Device identifier from the wallet SDK */
  deviceId?: string;
  /** Wallet account identifier (Android only) */
  walletAccountId?: string;
}

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
 * Request to create a provisioning payload
 */
export interface ProvisioningRequest {
  /** Unique card identifier */
  cardId: string;
  /** Target wallet type */
  walletType: WalletType;
  /** Device information */
  deviceInfo: DeviceInfo;
  /** Wallet-specific data */
  walletData: WalletData;
}

/**
 * Encrypted payload for wallet provisioning
 */
export interface EncryptedPayload {
  opaquePaymentCard?: string;
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
}

/**
 * Result of a provisioning operation
 */
export interface ProvisioningResult {
  status: 'success' | 'canceled' | 'error';
  tokenId?: string;
  primaryAccountIdentifier?: string;
  error?: ProvisioningError;
}

// ============================================================================
// Wallet Eligibility Types
// ============================================================================

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

  /**
   * Check if the error is recoverable (user can retry)
   */
  get isRecoverable(): boolean {
    return [
      ProvisioningErrorCode.NETWORK_ERROR,
      ProvisioningErrorCode.TIMEOUT_ERROR,
      ProvisioningErrorCode.SERVER_ERROR,
    ].includes(this.code);
  }

  /**
   * Check if the error was caused by user action
   */
  get isUserCanceled(): boolean {
    return this.code === ProvisioningErrorCode.USER_CANCELED;
  }
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Card provider configuration
 */
export interface CardProviderConfig {
  apiBaseUrl: string;
  apiKey?: string;
  timeout?: number;
  enableLogs?: boolean;
}

/**
 * Galileo-specific configuration
 */
export interface GalileoConfig extends CardProviderConfig {
  programId?: string;
}

// ============================================================================
// API Request/Response Types (for CardSDK extension)
// ============================================================================

/**
 * Parameters for creating a provisioning request via CardSDK
 */
export interface CreateProvisioningRequestParams {
  cardId: string;
  walletType: WalletType;
  deviceId?: string;
  walletAccountId?: string;
}

/**
 * Response from creating a provisioning request
 */
export interface CreateProvisioningResponse {
  cardNetwork: CardNetwork;
  lastFourDigits: string;
  cardholderName: string;
  cardDescription?: string;
  opaquePaymentCard?: string;
}

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Options for usePushProvisioning hook
 */
export interface UsePushProvisioningOptions {
  cardId: string;
  /** Last 4 digits of the card PAN, used to check if card is already in wallet */
  lastFourDigits?: string;
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

/**
 * Options for useWalletAvailability hook
 */
export interface UseWalletAvailabilityOptions {
  lastFourDigits?: string;
  checkOnMount?: boolean;
}

/**
 * Return type for useWalletAvailability hook
 */
export interface UseWalletAvailabilityReturn {
  isLoading: boolean;
  isAvailable: boolean;
  eligibility: WalletEligibility | null;
  walletType: WalletType | null;
  checkAvailability: () => Promise<WalletEligibility>;
  error: Error | null;
}
