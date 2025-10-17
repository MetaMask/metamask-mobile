import { FlashListAssetKey } from '../Tokens/TokenList';

/**
 * Enum for asset delegation status
 */
export enum AllowanceState {
  Enabled = 'enabled',
  Limited = 'limited',
  NotEnabled = 'not_enabled',
}

export enum CardWarning {
  NeedDelegation = 'need_delegation',
  CloseSpendingLimit = 'close_spending_limit',
}

// Helper interface for token balances
export interface CardToken {
  address: string | null;
  decimals: number | null;
  symbol: string | null;
  name: string | null;
}

export interface AuthenticatedCardTokenAllowanceData {
  availableBalance?: string;
  walletAddress?: string;
}

export type CardTokenAllowance = {
  allowanceState: AllowanceState;
  allowance: string;
} & FlashListAssetKey &
  CardToken &
  AuthenticatedCardTokenAllowanceData;

export interface CardLoginInitiateResponse {
  token: string;
  url: string;
}

export type CardLocation = 'us' | 'international';

export interface CardLoginResponse {
  phase: string | null;
  userId: string;
  isOtpRequired: boolean;
  phoneNumber: string | null;
  accessToken: string;
  verificationState: string;
  isLinked: boolean;
}

export interface CardAuthorizeResponse {
  state: string;
  url: string;
  code: string;
}

export interface CardExchangeTokenRawResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
}

export interface CardExchangeTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
}

export enum CardStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  BLOCKED = 'BLOCKED',
}

export enum CardType {
  VIRTUAL = 'VIRTUAL',
  PHYSICAL = 'PHYSICAL',
  METAL = 'METAL',
}

export interface CardDetailsResponse {
  id: string;
  holderName: string;
  expiryDate: string;
  panLast4: string;
  status: CardStatus;
  type: CardType;
  orderedAt: string;
}

export interface CardWalletExternalResponse {
  address: string; // This is the wallet address;
  currency: string;
  balance: string;
  allowance: string;
  network: 'linea' | 'solana';
}

export interface CardWalletExternalPriorityResponse {
  id: number;
  address: string; // This is the wallet address;
  currency: string;
  network: 'linea' | 'solana';
  priority: number;
}

export interface CardExternalWalletDetail {
  id: number;
  walletAddress: string;
  currency: string;
  balance: string;
  allowance: string;
  priority: number;
  tokenDetails: CardToken;
  chainId: string;
}

export type CardExternalWalletDetailsResponse = CardExternalWalletDetail[];

export enum CardErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  API_KEY_MISSING = 'API_KEY_MISSING',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  NO_CARD = 'NO_CARD',
}

export class CardError extends Error {
  public type: CardErrorType;
  public originalError?: Error;

  constructor(type: CardErrorType, message: string, originalError?: Error) {
    super(message);
    this.name = 'CardError';
    this.type = type;
    this.originalError = originalError;
  }
}
