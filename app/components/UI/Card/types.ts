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
  Frozen = 'frozen',
  Blocked = 'blocked',
  NoCard = 'no_card',
}

export type CardUserPhase =
  | 'ACCOUNT'
  | 'PHONE_NUMBER'
  | 'PERSONAL_INFORMATION'
  | 'PHYSICAL_ADDRESS'
  | 'MAILING_ADDRESS';

export type CardVerificationState =
  | 'VERIFIED'
  | 'UNVERIFIED'
  | 'PENDING'
  | 'REJECTED';

// Helper interface for token balances
export interface CardToken {
  address: string | null;
  decimals: number | null;
  symbol: string | null;
  name: string | null;
}

// Card token data interface
// Used on Keychain storage
export interface CardTokenData {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  location: CardLocation;
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
  phase: CardUserPhase | null;
  userId: string;
  isOtpRequired: boolean;
  phoneNumber: string | null;
  accessToken: string;
  verificationState: CardVerificationState;
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
  OTP_REQUIRED = 'OTP_REQUIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  API_KEY_MISSING = 'API_KEY_MISSING',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  NO_CARD = 'NO_CARD',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
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

// Email verification types
export interface EmailVerificationSendRequest {
  email: string;
}

export interface EmailVerificationSendResponse {
  contactVerificationId: string;
}

export interface EmailVerificationVerifyRequest {
  email: string;
  password: string;
  verificationCode: string;
  contactVerificationId: string;
  countryOfResidence: string;
  allowMarketing: boolean;
  allowSms: boolean;
}

export interface EmailVerificationVerifyResponse {
  hasAccount: boolean;
  onboardingId: string;
  user: {
    id: string;
    email: string;
    verificationState: string;
  };
}

// Phone verification interfaces
export interface PhoneVerificationSendRequest {
  phoneCountryCode: string;
  phoneNumber: string;
  contactVerificationId: string;
}

export interface PhoneVerificationSendResponse {
  success: boolean;
}

export interface PhoneVerificationVerifyRequest {
  phoneCountryCode: string;
  phoneNumber: string;
  verificationCode: string;
  onboardingId: string;
}

export interface PhoneVerificationVerifyResponse {
  success: boolean;
}

// Registration interfaces
export interface RegisterPersonalDetailsRequest {
  onboardingId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // Format: YYYY-MM-DD
  countryOfNationality: string; // ISO 3166-1 alpha-2 country code
  ssn?: string; // Required for US users only
}

export interface RegisterPersonalDetailsResponse {
  success: boolean;
}

export interface RegisterPhysicalAddressRequest {
  onboardingId: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zip: string;
  usState?: string; // Required for US users
  isSameMailingAddress: boolean;
}

export interface RegisterMailingAddressRequest {
  onboardingId: string;
  mailingAddressLine1: string;
  mailingAddressLine2?: string;
  mailingCity: string;
  mailingZip: string;
  mailingUsState?: string; // Required for US users
}

export interface RegisterAddressResponse {
  accessToken: string | null;
  user?: {
    id: string;
    email: string;
    verificationState: string;
  };
}

// Country type definition
export interface RegistrationSettingsResponse {
  countries: {
    id: string;
    name: string;
    iso3166alpha2: string;
    callingCode: string;
    canSignUp: boolean;
  }[];
  usStates: {
    id: string;
    name: string;
    postalAbbreviation: string;
    canSignUp: boolean;
  }[];
  links: {
    us: {
      termsAndConditions: string;
      accountOpeningDisclosure: string;
      noticeOfPrivacy: string;
    };
    intl: {
      termsAndConditions: string;
      rightToInformation: string;
    };
  };
  config: {
    us: {
      emailSpecialCharactersDomainsException: string;
      consentSmsNumber: string;
      supportEmail: string;
    };
    intl: {
      emailSpecialCharactersDomainsException: string;
      consentSmsNumber: string;
      supportEmail: string;
    };
  };
}
