import { CaipChainId } from '@metamask/utils';

/**
 * Enum for asset delegation status
 */
export enum AllowanceState {
  Enabled = 'enabled',
  Limited = 'limited',
  NotEnabled = 'not_enabled',
}

/**
 * Card state warnings - used for internal logic in hooks
 * These represent states returned from the API or derived conditions
 */
export enum CardStateWarning {
  NoCard = 'no_card',
  NeedDelegation = 'need_delegation',
  Frozen = 'frozen',
  Blocked = 'blocked',
}

/**
 * Card message box variants - determines the visual style of the message box
 */
export enum CardMessageBoxVariant {
  Warning = 'warning',
  Info = 'info',
}

/**
 * Card message box types - used for UI display in CardMessageBox component
 * These are user-facing messages that render as visual message boxes
 */
export enum CardMessageBoxType {
  CloseSpendingLimit = 'close_spending_limit',
  KYCPending = 'kyc_pending',
  CardProvisioning = 'card_provisioning',
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
// Note: refreshToken and refreshTokenExpiresAt are optional to support
// the onboarding flow where we only receive a short-lived accessToken
export interface CardTokenData {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt?: number;
  location: CardLocation;
}

export interface AuthenticatedCardTokenAllowanceData {
  availableBalance?: string;
  walletAddress?: string;
  priority?: number; // Lower number = higher priority (1 is highest)
  delegationContract?: string | null;
  stagingTokenAddress?: string | null; // Used in staging environment for actual on-chain token address
}

export type CardTokenAllowance = {
  caipChainId: CaipChainId;
  allowanceState: AllowanceState;
  allowance: string;
  totalAllowance?: string;
} & CardToken &
  AuthenticatedCardTokenAllowanceData;

export interface CardLoginInitiateResponse {
  token: string;
  url: string;
}

export type CardLocation = 'us' | 'international';

export type CardNetwork = 'linea' | 'solana' | 'base';

export interface CardNetworkInfo {
  caipChainId: CaipChainId;
  rpcUrl?: string;
}

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
  network: CardNetwork;
}

export interface CardWalletExternalPriorityResponse {
  id: number;
  address: string; // This is the wallet address;
  currency: string;
  network: CardNetwork;
  priority: number;
}

export interface CardExternalWalletDetail {
  id: number;
  walletAddress: string;
  currency: string;
  balance: string;
  allowance: string; // Remaining allowance for the token
  priority: number;
  tokenDetails: CardToken;
  caipChainId: CaipChainId;
  network: CardNetwork;
  delegationContractAddress?: string;
  stagingTokenAddress?: string;
}

export type CardExternalWalletDetailsResponse = CardExternalWalletDetail[];

export enum CardErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_OTP_CODE = 'INVALID_OTP_CODE',
  OTP_REQUIRED = 'OTP_REQUIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  API_KEY_MISSING = 'API_KEY_MISSING',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  NO_CARD = 'NO_CARD',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  NOT_FOUND = 'NOT_FOUND',
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
  userExternalId?: string;
}

export interface EmailVerificationVerifyResponse {
  hasAccount: boolean;
  onboardingId: string;
  user: UserResponse;
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
  contactVerificationId: string;
}

export interface StartUserVerificationRequest {
  onboardingId: string;
}

export interface StartUserVerificationResponse {
  sessionUrl: string;
}

export interface RegisterPersonalDetailsRequest {
  onboardingId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // Format: YYYY-MM-DD
  countryOfNationality: string; // ISO 3166-1 alpha-2 country code
  ssn?: string; // Required for US users only
}

export interface RegisterUserResponse {
  onboardingId: string;
  user: UserResponse;
}

export interface RegisterPhysicalAddressRequest {
  onboardingId: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  zip: string;
  usState?: string; // Required for US users
  isSameMailingAddress?: boolean;
}

export interface RegisterAddressResponse {
  accessToken: string | null;
  onboardingId: string;
  user?: UserResponse;
}

export interface UserResponse {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null; // Format: YYYY-MM-DD
  email?: string | null;
  verificationState?: CardVerificationState;
  phoneNumber?: string | null; // Format: 2345678901
  phoneCountryCode?: string | null; // Format: +1
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  zip?: string | null;
  usState?: string | null; // Required for US users
  countryOfResidence?: string | null; // ISO 3166-1 alpha-2 country code
  countryOfNationality?: string | null; // ISO 3166-1 alpha-2 country code
  ssn?: string | null; // Required for US users only
  mailingAddressLine1?: string | null;
  mailingAddressLine2?: string | null;
  mailingCity?: string | null;
  mailingZip?: string | null;
  mailingUsState?: string | null; // Required for US users
  contactVerificationId?: string | null;
  createdAt?: string | null;
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
      eSignConsentDisclosure: string;
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

export interface ConsentSet {
  consentSetId: string;
  userId: string | null;
  onboardingId: string;
  tenantId: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  consents: Consent[];
}

export interface GetOnboardingConsentResponse {
  onboardingId: string;
  consentSets: ConsentSet[];
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
  consents: Consent[];
  tenantId: string;
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

export interface ChainConfigToken {
  symbol: string;
  decimals: number;
  address: string;
}

export interface DelegationSettingsNetwork {
  network: string;
  environment: string;
  chainId: string;
  delegationContract: string;
  tokens: Record<string, ChainConfigToken>;
}

export interface DelegationSettingsResponse {
  networks: DelegationSettingsNetwork[];
  count: number;
  _links: {
    self: string;
  };
}

/**
 * Request body for generating card details token
 * Used to customize the visual appearance of the card details image
 */
export interface CardDetailsTokenRequest {
  customCss?: {
    cardBackgroundColor?: string;
    cardTextColor?: string;
    panBackgroundColor?: string;
    panTextColor?: string;
  };
}

/**
 * Response from generating card details token
 */
export interface CardDetailsTokenResponse {
  token: string;
  imageUrl: string;
}

/**
 * Payment methods supported for orders
 */
export type OrderPaymentMethod = 'CRYPTO_EXTERNAL_DAIMO';

/**
 * Request body for creating a new order
 * POST /v1/order
 */
export interface CreateOrderRequest {
  productId: string;
  paymentMethod: OrderPaymentMethod;
}

/**
 * Payment configuration returned when creating an order
 */
export interface OrderPaymentConfig {
  paymentAmount: number;
  paymentCurrency: string;
  destinationAddress: string;
  destinationChainId: string;
  destinationTokenSymbol: string;
  destinationTokenAddress: string;
}

/**
 * Response from creating a new order
 * POST /v1/order
 */
export interface CreateOrderResponse {
  orderId: string;
  requestId: string;
  paymentConfig: OrderPaymentConfig;
}

/**
 * Status of an order
 */
export type OrderStatus =
  | 'STARTED'
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';

/**
 * Metadata returned with order status
 */
export interface OrderStatusMetadata {
  paymentId?: string;
  txHash?: string;
  note?: string;
}

/**
 * Response from fetching order status
 * GET /v1/order/:orderId
 */
export interface GetOrderStatusResponse {
  orderId: string;
  paidAt?: string;
  status: OrderStatus;
  metadata?: OrderStatusMetadata;
}

// ============================================================================
// OAuth 2.0 Authorization Code Flow with PKCE Types (Demo)
// Based on Baanx API v1/auth/oauth2 endpoints
// ============================================================================

/**
 * Configuration for Baanx OAuth 2.0 Authorization Code Flow with PKCE
 */
export interface BaanxOAuth2Config {
  /** Authorization endpoint for browser-based OAuth */
  authorizationEndpoint: string;
  /** Token endpoint for code exchange and refresh */
  tokenEndpoint: string;
  /** Revoke endpoint for token invalidation */
  revokeEndpoint: string;
  /** User info endpoint for token validation */
  userEndpoint: string;
  /** OAuth client identifier */
  clientId: string;
  /** OAuth scopes to request */
  scopes: string[];
  /** PKCE code challenge method (always S256) */
  codeChallengeMethod: 'S256';
}

/**
 * Raw token response from Baanx OAuth2 token endpoint
 * POST /v1/auth/oauth2/token
 */
export interface BaanxOAuth2TokenRawResponse {
  access_token: string;
  expires_in: number;
  id_token?: string;
  refresh_token: string;
  scope: string;
  token_type: 'Bearer';
}

/**
 * Normalized token response with camelCase properties
 */
export interface BaanxOAuth2TokenResponse {
  accessToken: string;
  expiresIn: number;
  idToken?: string;
  refreshToken: string;
  scope: string;
  tokenType: 'Bearer';
}

/**
 * Response from token revocation endpoint
 * POST /v1/auth/oauth2/revoke
 */
export interface BaanxOAuth2RevokeResponse {
  success: boolean;
}

/**
 * Token hint for revocation - specifies which token to revoke
 */
export type BaanxOAuth2TokenHint = 'access_token' | 'refresh_token';

/**
 * Request body for token revocation
 */
export interface BaanxOAuth2RevokeRequest {
  token: string;
  token_hint: BaanxOAuth2TokenHint;
}

/**
 * Request body for authorization code exchange
 */
export interface BaanxOAuth2TokenExchangeRequest {
  code_verifier: string;
  redirect_uri: string;
  grant_type: 'authorization_code';
  code: string;
}

/**
 * Request body for token refresh
 */
export interface BaanxOAuth2RefreshRequest {
  grant_type: 'refresh_token';
  refresh_token: string;
}

/**
 * Result from the OAuth2 authorization flow
 */
export interface BaanxOAuth2AuthResult {
  /** Whether the authorization was successful */
  success: boolean;
  /** Authorization code received from the authorization endpoint */
  code?: string;
  /** State parameter for CSRF protection */
  state?: string;
  /** Code verifier used for PKCE (needed for token exchange) */
  codeVerifier?: string;
  /** Error message if authorization failed */
  error?: string;
  /** Error type for programmatic handling */
  errorType?: BaanxOAuth2ErrorType;
}

/**
 * Error types specific to OAuth2 flow
 */
export enum BaanxOAuth2ErrorType {
  /** User cancelled the authorization */
  USER_CANCELLED = 'USER_CANCELLED',
  /** User dismissed the authorization modal */
  USER_DISMISSED = 'USER_DISMISSED',
  /** Network error during authorization */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Invalid state parameter (potential CSRF attack) */
  INVALID_STATE = 'INVALID_STATE',
  /** Token exchange failed */
  TOKEN_EXCHANGE_FAILED = 'TOKEN_EXCHANGE_FAILED',
  /** Token refresh failed */
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  /** Token revocation failed */
  TOKEN_REVOKE_FAILED = 'TOKEN_REVOKE_FAILED',
  /** Unknown error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for OAuth2 errors
 */
export class BaanxOAuth2Error extends Error {
  public type: BaanxOAuth2ErrorType;
  public originalError?: Error;

  constructor(
    type: BaanxOAuth2ErrorType,
    message: string,
    originalError?: Error,
  ) {
    super(message);
    this.name = 'BaanxOAuth2Error';
    this.type = type;
    this.originalError = originalError;
  }
}

/**
 * Hook return type for useBaanxOAuth2Demo
 */
export interface UseBaanxOAuth2DemoReturn {
  /** The AuthRequest instance from useAuthRequest (null until loaded) */
  request: import('expo-auth-session').AuthRequest | null;
  /** The auth session result from useAuthRequest (null until promptAsync completes) */
  response: import('expo-auth-session').AuthSessionResult | null;
  /** Initiates the OAuth2 authorization flow in the browser */
  authorize: () => Promise<BaanxOAuth2AuthResult>;
  /** Exchanges authorization code for tokens */
  exchangeToken: (
    code: string,
    codeVerifier: string,
  ) => Promise<BaanxOAuth2TokenResponse>;
  /** Refreshes the access token using a refresh token */
  refreshToken: (refreshToken: string) => Promise<BaanxOAuth2TokenResponse>;
  /** Revokes a token (access or refresh) */
  revokeToken: (
    token: string,
    tokenHint: BaanxOAuth2TokenHint,
  ) => Promise<BaanxOAuth2RevokeResponse>;
  /** Validates the access token by fetching user info */
  validateToken: (accessToken: string) => Promise<UserResponse>;
  /** Whether an OAuth operation is in progress */
  loading: boolean;
  /** Current error, if any */
  error: BaanxOAuth2Error | null;
  /** Clear the current error */
  clearError: () => void;
}
