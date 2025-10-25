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

// Transaction History Types
export interface CardTransaction {
  name: string;
  amount: string;
  currency: string;
  sign: 'debit' | 'credit';
  date: string;
}

export interface CardTotalSpendingResponse {
  totalSpending: string;
  transactionCount: number;
  period: string;
}
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

// Chain Configuration Types for Baanx Delegation API
export interface ChainConfigToken {
  symbol: string;
  decimals: number;
  address: string;
}

export interface ChainConfigNetwork {
  network: string;
  environment: string;
  chainId: string;
  delegationContract: string;
  tokens: Record<string, ChainConfigToken>;
}

export interface ChainConfigResponse {
  networks: ChainConfigNetwork[];
  count: number;
  _links: {
    self: string;
  };
}

export interface CachedChainConfig {
  config: ChainConfigResponse;
  timestamp: number;
  expiresAt: number;
}

export interface CachedNetworkConfig {
  config: ChainConfigNetwork;
  timestamp: number;
  expiresAt: number;
}
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

export interface ConsentMetadata {
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
  clientId?: string;
  version?: string;
}

export interface Consent {
  consentType:
    | 'eSignAct'
    | 'termsAndPrivacy'
    | 'marketingNotifications'
    | 'smsNotifications'
    | 'emailNotifications';
  consentStatus: 'granted' | 'denied';
  metadata: ConsentMetadata;
}

export interface CreateOnboardingConsentRequest {
  policyType: 'us' | 'global';
  onboardingId: string;
  tenantId: string;
  consents: Consent[];
  metadata?: ConsentMetadata;
}

export interface CreateOnboardingConsentResponse {
  consentSetId: string;
}

export interface LinkUserToConsentRequest {
  userId: string;
}

export interface LinkUserToConsentResponse {
  useId: string;
  consentSetId: string;
}
