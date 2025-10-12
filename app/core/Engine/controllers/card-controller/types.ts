import type { CaipAccountId } from '@metamask/utils';
import type { ControllerGetStateAction } from '@metamask/base-controller';
import type { Patch } from '../rewards-controller/types';

// Import Card feature flag types
import type {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card';

// Import existing Card types to maintain compatibility
import type {
  CardToken,
  CardType,
  CardDetailsResponse,
  CardExternalWalletDetail,
  CardExternalWalletDetailsResponse,
  CardLocation,
  CardLoginInitiateResponse,
  CardLoginResponse,
  CardAuthorizeResponse,
  CardExchangeTokenRawResponse,
  CardExchangeTokenResponse,
  CardError,
  CardErrorType,
} from '../../../../components/UI/Card/types';

// JSON-serializable version of CardTokenAllowance for controller state
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardTokenAllowanceState = {
  allowanceState: string;
  allowance: string;
  address: string | null;
  decimals: number | null;
  symbol: string | null;
  name: string | null;
};

// Re-export for external use
export type {
  CardFeatureFlag,
  SupportedToken,
  CardToken,
  CardType,
  CardDetailsResponse,
  CardExternalWalletDetail,
  CardExternalWalletDetailsResponse,
  CardLocation,
  CardLoginInitiateResponse,
  CardLoginResponse,
  CardAuthorizeResponse,
  CardExchangeTokenRawResponse,
  CardExchangeTokenResponse,
  CardError,
  CardErrorType,
};

/**
 * Loading phases for Card operations
 */
export enum CardLoadingPhase {
  INITIALIZING = 'initializing',
  AUTHENTICATING = 'authenticating',
  FETCHING_DATA = 'fetching_data',
  COMPLETE = 'complete',
}

/**
 * Data source strategy for Card operations
 */
export enum CardDataSource {
  ON_CHAIN = 'on-chain',
  API = 'api',
  CACHE = 'cache',
}

/**
 * Consolidated login state that combines cardholder status and authentication
 */
// Removed CardLoginState enum - authentication is now global, not per-wallet

/**
 * Card authentication token data
 */
export interface CardTokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  location: 'us' | 'international';
  tokenType?: string;
  expiresIn?: number;
  refreshTokenExpiresIn?: number;
}

/**
 * Card account state for a specific address - contains per-wallet on-chain data only
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardAccountState = {
  address: string;
  // On-chain cardholder status (per wallet)
  isCardholder: boolean;
  cardholderLastChecked: number | null;
  // Priority token data
  priorityToken: CardTokenAllowanceState | null;
  priorityTokenLastFetched: number | null;
  // Card details as JSON string for simplicity
  cardDetailsJson: string | null;
  cardDetailsLastFetched: number | null;
  // External wallet details as JSON string for simplicity
  externalWalletDetailsJson: string | null;
  externalWalletDetailsLastFetched: number | null;
  // Supported tokens allowances as JSON string for simplicity
  supportedTokensAllowancesJson: string | null;
  supportedTokensAllowancesLastFetched: number | null;
  needsProvisioning: boolean;
};

/**
 * Global Card state - contains user-level authentication and feature flags
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardGlobalState = {
  // Feature flags
  isFeatureEnabled: boolean;
  isBaanxLoginEnabled: boolean;
  // User authentication state (universal across all wallets)
  isAuthenticated: boolean;
  userLocation: 'us' | 'international' | null;
  authTokenJson: string | null; // CardTokenData as JSON
  authTokenExpiresAt: number | null;
  // Geo location for the user
  geoLocation: string | null;
  geoLocationLastFetched: number | null;
  // List of cardholder accounts (addresses that are cardholders on-chain)
  cardholderAccounts: string[];
  cardholderAccountsLastFetched: number | null;
};

/**
 * Complete Card controller state
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CardControllerState = {
  accounts: { [account: string]: CardAccountState };
  global: CardGlobalState;
  activeAccount: string | null;
  loadingPhase: CardLoadingPhase;
  lastError: string | null;
};

/**
 * Priority token request parameters
 */
export interface GetPriorityTokenParams {
  address: string;
  dataSource?: CardDataSource;
  forceRefresh?: boolean;
}

/**
 * Supported tokens allowances request parameters
 */
export interface GetSupportedTokensAllowancesParams {
  address: string;
  forceRefresh?: boolean;
}

/**
 * Card details request parameters
 */
export interface GetCardDetailsParams {
  forceRefresh?: boolean;
}

/**
 * External wallet details request parameters
 */
export interface GetExternalWalletDetailsParams {
  forceRefresh?: boolean;
}

/**
 * Authentication request parameters
 */
export interface AuthenticateParams {
  email: string;
  password: string;
  location: 'us' | 'international';
}

/**
 * Login initiation parameters
 */
export interface InitiateLoginParams {
  state: string;
  codeChallenge: string;
  location: 'us' | 'international';
}

/**
 * Token exchange parameters
 */
export interface ExchangeTokenParams {
  code?: string;
  codeVerifier?: string;
  grantType: 'authorization_code' | 'refresh_token';
  location: 'us' | 'international';
}

/**
 * Authorization parameters
 */
export interface AuthorizeParams {
  initiateAccessToken: string;
  loginAccessToken: string;
  location: 'us' | 'international';
}

/**
 * Cardholder check parameters
 */
export interface CheckCardholderParams {
  accounts: CaipAccountId[];
  forceRefresh?: boolean;
}

/**
 * Geolocation request parameters
 */
export interface GetGeoLocationParams {
  forceRefresh?: boolean;
}

/**
 * Token refresh parameters
 */
export interface RefreshTokenParams {
  refreshToken: string;
  location: 'us' | 'international';
}

/**
 * Individual Card controller event types
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
export type CardControllerAuthenticationChangedEvent = {
  type: 'CardController:authenticationChanged';
  payload: [
    {
      isAuthenticated: boolean;
      userLocation: 'us' | 'international' | null;
    },
  ];
};

export type CardControllerPriorityTokenUpdatedEvent = {
  type: 'CardController:priorityTokenUpdated';
  payload: [
    {
      address: string;
      tokenAddress: string | null;
      tokenSymbol: string | null;
    },
  ];
};

export type CardControllerCardDetailsUpdatedEvent = {
  type: 'CardController:cardDetailsUpdated';
  payload: [
    {
      address: string;
      cardDetailsJson: string | null;
      needsProvisioning: boolean;
    },
  ];
};

export type CardControllerCardholderStatusUpdatedEvent = {
  type: 'CardController:cardholderStatusUpdated';
  payload: [
    {
      accounts: string[];
      cardholderAccounts: string[];
    },
  ];
};

export type CardControllerErrorOccurredEvent = {
  type: 'CardController:errorOccurred';
  payload: [
    {
      error: string;
      context?: string;
    },
  ];
};

export type CardControllerCardholderChangedEvent = {
  type: 'CardController:cardholderChanged';
  payload: [
    {
      address: string;
      isCardholder: boolean;
    },
  ];
};

/**
 * Card controller events union type
 */
export type CardControllerEvents =
  | {
      type: 'CardController:stateChange';
      payload: [CardControllerState, Patch[]];
    }
  | CardControllerAuthenticationChangedEvent
  | CardControllerPriorityTokenUpdatedEvent
  | CardControllerCardDetailsUpdatedEvent
  | CardControllerCardholderStatusUpdatedEvent
  | CardControllerCardholderChangedEvent
  | CardControllerErrorOccurredEvent;
/* eslint-enable @typescript-eslint/consistent-type-definitions */

/**
 * Individual Card controller action types
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
export type CardControllerGetAccountStateAction = {
  type: 'CardController:getAccountState';
  handler: (address: string) => CardAccountState | null;
};

export type CardControllerIsCardholderAction = {
  type: 'CardController:isCardholder';
  handler: (address: string) => boolean;
};

export type CardControllerIsAuthenticatedAction = {
  type: 'CardController:isAuthenticated';
  handler: () => boolean;
};

export type CardControllerGetIsCardholderAction = {
  type: 'CardController:getIsCardholder';
  handler: (address: string) => boolean;
};

export type CardControllerGetIsAuthenticatedAction = {
  type: 'CardController:getIsAuthenticated';
  handler: () => boolean;
};

export type CardControllerGetPriorityTokenAction = {
  type: 'CardController:getPriorityToken';
  handler: (
    params: GetPriorityTokenParams,
  ) => Promise<CardTokenAllowanceState | null>;
};

export type CardControllerGetSupportedTokensAllowancesAction = {
  type: 'CardController:getSupportedTokensAllowances';
  handler: (params: GetSupportedTokensAllowancesParams) => Promise<
    {
      address: string;
      usAllowance: string;
      globalAllowance: string;
    }[]
  >;
};

export type CardControllerGetCardDetailsAction = {
  type: 'CardController:getCardDetails';
  handler: (params: GetCardDetailsParams) => Promise<string | null>;
};

export type CardControllerGetExternalWalletDetailsAction = {
  type: 'CardController:getExternalWalletDetails';
  handler: (params: GetExternalWalletDetailsParams) => Promise<string | null>;
};

export type CardControllerCheckCardholderAction = {
  type: 'CardController:checkCardholder';
  handler: (params: CheckCardholderParams) => Promise<string[]>;
};

export type CardControllerGetGeoLocationAction = {
  type: 'CardController:getGeoLocation';
  handler: (params: GetGeoLocationParams) => Promise<string>;
};

export type CardControllerInitiateLoginAction = {
  type: 'CardController:initiateLogin';
  handler: (params: InitiateLoginParams) => Promise<CardLoginInitiateResponse>;
};

export type CardControllerAuthenticateAction = {
  type: 'CardController:authenticate';
  handler: (params: AuthenticateParams) => Promise<CardLoginResponse>;
};

export type CardControllerAuthorizeAction = {
  type: 'CardController:authorize';
  handler: (params: AuthorizeParams) => Promise<CardAuthorizeResponse>;
};

export type CardControllerExchangeTokenAction = {
  type: 'CardController:exchangeToken';
  handler: (params: ExchangeTokenParams) => Promise<CardExchangeTokenResponse>;
};

export type CardControllerRefreshTokenAction = {
  type: 'CardController:refreshToken';
  handler: (params: RefreshTokenParams) => Promise<CardExchangeTokenResponse>;
};

export type CardControllerLogoutAction = {
  type: 'CardController:logout';
  handler: () => Promise<void>;
};

export type CardControllerSetActiveAccountAction = {
  type: 'CardController:setActiveAccount';
  handler: (address: string | null) => void;
};

export type CardControllerIsFeatureEnabledAction = {
  type: 'CardController:isFeatureEnabled';
  handler: () => boolean;
};

export type CardControllerIsBaanxLoginEnabledAction = {
  type: 'CardController:isBaanxLoginEnabled';
  handler: () => boolean;
};

export type CardControllerGetSupportedTokensAction = {
  type: 'CardController:getSupportedTokens';
  handler: () => SupportedToken[];
};

export type CardControllerResetStateAction = {
  type: 'CardController:resetState';
  handler: () => void;
};

/**
 * Card controller actions union type
 */
export type CardControllerActions =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ControllerGetStateAction<'CardController', any>
  | CardControllerGetAccountStateAction
  | CardControllerIsCardholderAction
  | CardControllerIsAuthenticatedAction
  | CardControllerGetIsCardholderAction
  | CardControllerGetIsAuthenticatedAction
  | CardControllerGetPriorityTokenAction
  | CardControllerGetSupportedTokensAllowancesAction
  | CardControllerGetCardDetailsAction
  | CardControllerGetExternalWalletDetailsAction
  | CardControllerCheckCardholderAction
  | CardControllerGetGeoLocationAction
  | CardControllerInitiateLoginAction
  | CardControllerAuthenticateAction
  | CardControllerAuthorizeAction
  | CardControllerExchangeTokenAction
  | CardControllerRefreshTokenAction
  | CardControllerLogoutAction
  | CardControllerSetActiveAccountAction
  | CardControllerIsFeatureEnabledAction
  | CardControllerIsBaanxLoginEnabledAction
  | CardControllerGetSupportedTokensAction
  | CardControllerResetStateAction;
/* eslint-enable @typescript-eslint/consistent-type-definitions */

/**
 * Default Card controller state
 */
export const getCardControllerDefaultState = (): CardControllerState => ({
  accounts: {},
  global: {
    isFeatureEnabled: false,
    isBaanxLoginEnabled: false,
    isAuthenticated: false,
    userLocation: null,
    authTokenJson: null,
    authTokenExpiresAt: null,
    geoLocation: null,
    geoLocationLastFetched: null,
    cardholderAccounts: [],
    cardholderAccountsLastFetched: null,
  },
  activeAccount: null,
  loadingPhase: CardLoadingPhase.INITIALIZING,
  lastError: null,
});

export const defaultCardControllerState = getCardControllerDefaultState();
