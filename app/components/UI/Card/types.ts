import { ethers } from 'ethers';
import { FlashListAssetKey } from '../Tokens/TokenList';

/**
 * Enum for asset delegation status
 */
export enum AllowanceState {
  Enabled = 'enabled',
  Limited = 'limited',
  NotEnabled = 'not_enabled',
}

// Helper interface for token balances
export interface CardToken {
  address: string | null;
  decimals: number | null;
  symbol: string | null;
  name: string | null;
}

export type CardTokenAllowance = {
  allowanceState: AllowanceState;
  allowance: ethers.BigNumber;
} & FlashListAssetKey &
  CardToken;

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

export enum CardErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  API_KEY_MISSING = 'API_KEY_MISSING',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
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
