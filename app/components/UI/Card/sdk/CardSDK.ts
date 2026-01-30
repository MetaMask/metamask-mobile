import { ethers } from 'ethers';
import {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card';
import {
  BALANCE_SCANNER_ABI,
  cardNetworkInfos,
  SUPPORTED_ASSET_NETWORKS,
} from '../constants';
import Logger from '../../../../util/Logger';
import {
  EmailVerificationSendRequest,
  EmailVerificationSendResponse,
  EmailVerificationVerifyRequest,
  EmailVerificationVerifyResponse,
  PhoneVerificationSendRequest,
  PhoneVerificationSendResponse,
  PhoneVerificationVerifyRequest,
  RegisterPersonalDetailsRequest,
  RegisterUserResponse,
  RegisterPhysicalAddressRequest,
  RegisterAddressResponse,
  RegistrationSettingsResponse,
  StartUserVerificationResponse,
  CreateOnboardingConsentRequest,
  CreateOnboardingConsentResponse,
  LinkUserToConsentRequest,
  LinkUserToConsentResponse,
  UserResponse,
  StartUserVerificationRequest,
  CardAuthorizeResponse,
  CardDetailsResponse,
  CardError,
  CardErrorType,
  CardExchangeTokenRawResponse,
  CardExchangeTokenResponse,
  CardExternalWalletDetail,
  CardExternalWalletDetailsResponse,
  CardLocation,
  CardLoginInitiateResponse,
  CardLoginResponse,
  CardToken,
  CardWalletExternalPriorityResponse,
  CardWalletExternalResponse,
  CardNetwork,
  DelegationSettingsResponse,
  DelegationSettingsNetwork,
  GetOnboardingConsentResponse,
  CardDetailsTokenRequest,
  CardDetailsTokenResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  GetOrderStatusResponse,
} from '../types';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from '../util/mapBaanxApiUrl';
import { getCardBaanxToken } from '../util/cardTokenVault';
import { CaipChainId } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { isZeroValue } from '../../../../util/number';

// Default timeout for all API requests (10 seconds)
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

// The CardSDK class provides methods to interact with the Card feature
// and check if an address is a card holder, get supported tokens, and more.
// This implements a mimic of the Ramps SDK, but for the Card feature.
// Ideally it should be separated into its own package in the future.
export class CardSDK {
  private cardFeatureFlag: CardFeatureFlag;
  private enableLogs: boolean;
  private cardBaanxApiBaseUrl: string;
  private cardBaanxApiKey: string | undefined;
  private userCardLocation: CardLocation;

  constructor({
    cardFeatureFlag,
    userCardLocation,
    enableLogs = false,
  }: {
    cardFeatureFlag: CardFeatureFlag;
    userCardLocation?: CardLocation;
    enableLogs?: boolean;
  }) {
    this.cardFeatureFlag = cardFeatureFlag;
    this.enableLogs = enableLogs;
    this.cardBaanxApiBaseUrl = this.getBaanxApiBaseUrl();
    this.cardBaanxApiKey = process.env.MM_CARD_BAANX_API_CLIENT_KEY;
    this.userCardLocation = userCardLocation ?? 'international';
  }

  get isCardEnabled(): boolean {
    return (
      this.cardFeatureFlag.chains?.[cardNetworkInfos.linea.caipChainId]
        ?.enabled || false
    );
  }

  getSupportedTokensByChainId(
    caipChainId: CaipChainId = 'eip155:59144',
  ): SupportedToken[] {
    if (!this.isCardEnabled) {
      return [];
    }

    const tokens = this.cardFeatureFlag.chains?.[caipChainId]?.tokens;

    if (!tokens) {
      return [];
    }

    return tokens.filter(
      (token): token is SupportedToken =>
        token && typeof token.address === 'string' && token.enabled !== false,
    );
  }

  private foxConnectAddresses(network: CardNetwork) {
    const caipChainId = cardNetworkInfos[network].caipChainId;
    return this.cardFeatureFlag.chains?.[caipChainId]?.foxConnectAddresses;
  }

  private getEthersProvider(network: CardNetwork) {
    const rpcUrl = cardNetworkInfos[network].rpcUrl;

    if (!rpcUrl) {
      throw new Error('RPC URL is not defined for the current network');
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    return provider;
  }

  private getBalanceScannerInstance(network: CardNetwork) {
    const caipChainId = cardNetworkInfos[network].caipChainId;
    const balanceScannerAddress =
      this.cardFeatureFlag.chains?.[caipChainId]?.balanceScannerAddress;

    if (!balanceScannerAddress) {
      throw new Error(
        'Balance scanner address is not defined for the current chain',
      );
    }

    const ethersProvider = this.getEthersProvider(network);

    return new ethers.Contract(
      balanceScannerAddress,
      BALANCE_SCANNER_ABI,
      ethersProvider,
    );
  }

  private get accountsApiUrl() {
    const accountsApi = this.cardFeatureFlag.constants?.accountsApiUrl;

    if (!accountsApi) {
      throw new Error('Accounts API URL is not defined for the current chain');
    }

    return accountsApi;
  }

  private logDebugInfo(fnName: string, data: unknown) {
    if (this.enableLogs) {
      Logger.log(
        `CardSDK Debug Log - ${fnName}`,
        JSON.stringify(data, null, 2),
      );
    }
  }

  /**
   * Determines the Sentry context name based on the operation type.
   */
  private getContextName(operation: string): string {
    const lowerOp = operation.toLowerCase();
    if (
      lowerOp.includes('delegation') ||
      lowerOp.includes('allowance') ||
      lowerOp.includes('walletpriority')
    ) {
      return 'card_delegation';
    }
    if (
      lowerOp.includes('verification') ||
      lowerOp.includes('register') ||
      lowerOp.includes('consent') ||
      lowerOp.includes('onboarding')
    ) {
      return 'card_onboarding';
    }
    if (
      lowerOp.includes('login') ||
      lowerOp.includes('auth') ||
      lowerOp.includes('token') ||
      lowerOp.includes('authorize')
    ) {
      return 'card_auth';
    }
    return 'card_api_request';
  }

  /**
   * Creates a CardError and logs it to Sentry with consistent context.
   * This ensures all errors are properly tracked with searchable tags.
   *
   * @param type - The CardErrorType for categorization
   * @param message - User-friendly error message
   * @param operation - The SDK operation/method name
   * @param endpoint - The API endpoint that was called
   * @param httpStatus - Optional HTTP status code
   * @param extras - Optional additional context data (must not contain PII)
   * @returns The created CardError
   */
  private logAndCreateError(
    type: CardErrorType,
    message: string,
    operation: string,
    endpoint: string,
    httpStatus?: number,
    extras?: Record<string, unknown>,
  ): CardError {
    const error = new CardError(type, message);

    Logger.error(error, {
      tags: {
        feature: 'card',
        operation,
        errorType: type.toLowerCase().replace(/_/g, '_'),
      },
      context: {
        name: this.getContextName(operation),
        data: {
          endpoint,
          ...(httpStatus !== undefined && { httpStatus }),
          ...extras,
        },
      },
    });

    return error;
  }

  /**
   * Safely parses a Response body as JSON.
   * Returns null if parsing fails.
   */
  private async parseResponseBody(
    response: Response,
  ): Promise<Record<string, unknown> | null> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Standard API response handler that processes errors consistently.
   * Use this for endpoints with standard error handling patterns.
   *
   * For endpoints with special error handling (like login with OTP),
   * handle errors manually using logAndCreateError.
   *
   * @param response - The fetch Response object
   * @param operation - The SDK operation/method name
   * @param endpoint - The API endpoint (for logging)
   * @param defaultErrorMessage - Default error message if none provided by API
   * @returns The parsed JSON response
   * @throws CardError with appropriate type based on HTTP status
   */
  private async handleApiResponse<T>(
    response: Response,
    operation: string,
    endpoint: string,
    defaultErrorMessage: string,
  ): Promise<T> {
    if (response.ok) {
      return response.json() as Promise<T>;
    }

    const responseBody = await this.parseResponseBody(response);
    const message =
      (responseBody?.message as string) ||
      `${defaultErrorMessage}: ${response.status} ${response.statusText}`;

    let errorType: CardErrorType;
    if (response.status === 401 || response.status === 403) {
      errorType = CardErrorType.INVALID_CREDENTIALS;
    } else if (response.status >= 400 && response.status < 500) {
      errorType = CardErrorType.CONFLICT_ERROR;
    } else {
      errorType = CardErrorType.SERVER_ERROR;
    }

    throw this.logAndCreateError(
      errorType,
      message,
      operation,
      endpoint,
      response.status,
    );
  }

  /**
   * Wraps an async operation with standard error handling.
   * Catches non-CardError exceptions and logs them to Sentry.
   *
   * @param operation - The SDK operation/method name
   * @param endpoint - The API endpoint (for logging)
   * @param defaultErrorMessage - Default error message for unknown errors
   * @param fn - The async function to execute
   * @returns The result of the function
   */
  private async withErrorHandling<T>(
    operation: string,
    endpoint: string,
    defaultErrorMessage: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof CardError) {
        throw error;
      }

      throw this.logAndCreateError(
        CardErrorType.UNKNOWN_ERROR,
        defaultErrorMessage,
        operation,
        endpoint,
        undefined,
        { originalError: (error as Error).message },
      );
    }
  }

  /**
   * Checks if the given accounts are cardholders by querying the accounts API.
   * Supports batching for performance optimization - processes up to 3 batches of 50 accounts each.
   *
   * @param accounts - Array of account IDs to check
   * @returns Promise resolving to object containing array of cardholder accounts
   */
  isCardHolder = async (
    accounts: `${string}:${string}:${string}`[],
  ): Promise<`${string}:${string}:${string}`[]> => {
    // Early return for invalid input or disabled feature
    if (!this.isCardEnabled || !accounts?.length) {
      return [];
    }

    const BATCH_SIZE = 50;
    const MAX_BATCHES = 3;

    // Single batch optimization - no need for complex batching logic
    if (accounts.length <= BATCH_SIZE) {
      return await this.performCardholderRequest(accounts);
    }

    // Multi-batch processing for large account sets
    return await this.processBatchedCardholderRequests(
      accounts,
      BATCH_SIZE,
      MAX_BATCHES,
    );
  };

  /**
   * Performs a single API request to check if accounts are cardholders
   */
  private async performCardholderRequest(
    accountIds: string[],
  ): Promise<`${string}:${string}:${string}`[]> {
    try {
      const url = this.buildCardholderApiUrl(accountIds);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      this.logDebugInfo('performCardholderRequest', data);
      return data.is || [];
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card', operation: 'isCardHolder' },
        context: {
          name: 'card_api_request',
          data: { endpoint: 'metadata', accountCount: accountIds.length },
        },
      });
      return [];
    }
  }

  /**
   * Builds the API URL for cardholder checking requests
   */
  private buildCardholderApiUrl(accountIds: string[]): URL {
    const url = new URL('v1/metadata', this.accountsApiUrl);
    url.searchParams.set('accountIds', accountIds.join(',').toLowerCase());
    url.searchParams.set('label', 'card_user');
    return url;
  }

  /**
   * Processes multiple batches of accounts to check cardholder status
   */
  private async processBatchedCardholderRequests(
    accounts: `${string}:${string}:${string}`[],
    batchSize: number,
    maxBatches: number,
  ): Promise<`${string}:${string}:${string}`[]> {
    const batches = this.createAccountBatches(accounts, batchSize, maxBatches);
    const batchPromises = batches.map((batch) =>
      this.performCardholderRequest(batch),
    );

    const results = await Promise.all(batchPromises);
    const allCardholderAccounts = results.flatMap(
      (result) => result as `${string}:${string}:${string}`[],
    );
    this.logDebugInfo(
      'processBatchedCardholderRequests',
      allCardholderAccounts,
    );

    return allCardholderAccounts;
  }

  /**
   * Creates batches of accounts for API processing
   */
  private createAccountBatches(
    accounts: `${string}:${string}:${string}`[],
    batchSize: number,
    maxBatches: number,
  ): `${string}:${string}:${string}`[][] {
    const batches: `${string}:${string}:${string}`[][] = [];
    let remainingAccounts = accounts;

    while (remainingAccounts.length > 0 && batches.length < maxBatches) {
      const batch = remainingAccounts.slice(0, batchSize);
      remainingAccounts = remainingAccounts.slice(batchSize);
      batches.push(batch);
    }

    return batches;
  }

  getGeoLocation = async (): Promise<string> => {
    try {
      const env = process.env.NODE_ENV ?? 'production';
      const environment = env === 'production' ? 'PROD' : 'DEV';

      const GEOLOCATION_URLS = {
        DEV: 'https://on-ramp.dev-api.cx.metamask.io/geolocation',
        PROD: 'https://on-ramp.api.cx.metamask.io/geolocation',
      };
      const url = GEOLOCATION_URLS[environment];
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to get geolocation: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card', operation: 'getGeoLocation' },
        context: {
          name: 'card_geolocation',
          data: { endpoint: 'geolocation' },
        },
      });
      return 'UNKNOWN';
    }
  };

  // Only runs on linea network
  getSupportedTokensAllowances = async (
    address: string,
  ): Promise<
    {
      address: `0x${string}`;
      usAllowance: ethers.BigNumber;
      globalAllowance: ethers.BigNumber;
    }[]
  > => {
    if (!this.isCardEnabled) {
      throw new Error('Card feature is not enabled for this chain');
    }

    const supportedTokensAddresses = this.getSupportedTokensByChainId()
      .map((token) => token.address)
      // Ensure all addresses are valid Ethereum addresses
      .filter(
        (addr): addr is string => addr != null && ethers.utils.isAddress(addr),
      );

    if (supportedTokensAddresses.length === 0) {
      return [];
    }

    const contracts = this.foxConnectAddresses('linea');

    if (!contracts?.global || !contracts?.us) {
      throw new Error(
        'FoxConnect contracts are not defined for the current network',
      );
    }

    const { global: foxConnectGlobalAddress, us: foxConnectUsAddress } =
      contracts;

    const spenders: string[][] = supportedTokensAddresses.map(() => [
      foxConnectGlobalAddress,
      foxConnectUsAddress,
    ]);

    const balanceScannerInstance = this.getBalanceScannerInstance('linea');
    const spendersAllowancesForTokens: [boolean, string][][] =
      await balanceScannerInstance.spendersAllowancesForTokens(
        address,
        supportedTokensAddresses,
        spenders,
      );
    this.logDebugInfo(
      'getSupportedTokensAllowances',
      spendersAllowancesForTokens,
    );

    return supportedTokensAddresses.map((tokenAddress, index) => {
      const [globalAllowanceTuple, usAllowanceTuple] =
        spendersAllowancesForTokens[index];
      const globalAllowance = ethers.BigNumber.from(globalAllowanceTuple[1]);
      const usAllowance = ethers.BigNumber.from(usAllowanceTuple[1]);

      return {
        address: tokenAddress as `0x${string}`,
        usAllowance,
        globalAllowance,
      };
    });
  };

  getPriorityToken = async (
    address: string,
    nonZeroBalanceTokens: string[],
  ): Promise<CardToken | null> => {
    if (!this.isCardEnabled) {
      throw new Error('Card feature is not enabled for this chain');
    }

    // Handle simple cases first
    if (nonZeroBalanceTokens.length === 0) {
      this.logDebugInfo('getPriorityToken (Simple Case 1)', {
        address,
        nonZeroBalanceTokens,
      });
      return this.getFirstSupportedTokenOrNull();
    }

    if (nonZeroBalanceTokens.length === 1) {
      this.logDebugInfo('getPriorityToken (Simple Case 2)', {
        address,
        nonZeroBalanceTokens,
      });
      return this.findSupportedTokenByAddress(nonZeroBalanceTokens[0]);
    }

    // Handle complex case with multiple tokens
    this.logDebugInfo('getPriorityToken (Complex Case)', {
      address,
      nonZeroBalanceTokens,
    });
    return this.findPriorityTokenFromApprovalLogs(
      address,
      nonZeroBalanceTokens,
    );
  };

  private getBaanxApiBaseUrl() {
    // always using url from env var if set
    if (process.env.BAANX_API_URL) return process.env.BAANX_API_URL;
    // otherwise using default per-env url
    return getDefaultBaanxApiBaseUrlForMetaMaskEnv(
      process.env.METAMASK_ENVIRONMENT,
    );
  }

  private async makeRequest(
    endpoint: string,
    {
      fetchOptions = {},
      authenticated = false,
      location = this.userCardLocation,
      timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    }: {
      fetchOptions?: RequestInit & { query?: string };
      authenticated?: boolean;
      location?: CardLocation;
      timeoutMs?: number;
    } = {},
  ): Promise<Response> {
    const apiKey = this.cardBaanxApiKey;

    if (!apiKey) {
      throw new CardError(
        CardErrorType.API_KEY_MISSING,
        'Card API key is not configured',
      );
    }

    const isUSEnv = location === 'us';
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-us-env': String(isUSEnv),
      'x-client-key': apiKey,
    };

    // Add bearer token for authenticated requests
    try {
      if (authenticated) {
        const tokenResult = await getCardBaanxToken();
        if (tokenResult.success && tokenResult.tokenData?.accessToken) {
          headers.Authorization = `Bearer ${tokenResult.tokenData.accessToken}`;
        }
      }
    } catch (error) {
      // Continue without bearer token if retrieval fails
      Logger.error(error as Error, {
        tags: { feature: 'card', operation: 'makeRequest' },
        context: {
          name: 'card_auth',
          data: { action: 'retrieveBearerToken' },
        },
      });
    }

    const url = `${this.cardBaanxApiBaseUrl}${endpoint}${
      fetchOptions.query ? `?${fetchOptions.query}` : ''
    }`;

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        credentials: 'omit',
        ...fetchOptions,
        headers: {
          ...headers,
          ...fetchOptions.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Check if the error is due to timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new CardError(
          CardErrorType.TIMEOUT_ERROR,
          'Request timed out. Please check your connection.',
          error,
        );
      }

      // Network or other fetch errors
      if (error instanceof Error) {
        throw new CardError(
          CardErrorType.NETWORK_ERROR,
          'Network error. Please check your connection.',
          error,
        );
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'An unexpected error occurred.',
        error instanceof Error ? error : undefined,
      );
    }
  }

  initiateCardProviderAuthentication = async (queryParams: {
    state: string;
    codeChallenge: string;
    location: CardLocation;
  }): Promise<CardLoginInitiateResponse> => {
    if (!this.cardBaanxApiKey) {
      throw new CardError(
        CardErrorType.API_KEY_MISSING,
        'Card API key is not configured',
      );
    }

    const { state, codeChallenge } = queryParams;
    const queryParamsString = new URLSearchParams();
    queryParamsString.set('client_id', this.cardBaanxApiKey);
    // Redirect URI is required but not used by this flow
    queryParamsString.set('redirect_uri', 'https://example.com');
    queryParamsString.set('state', state);
    queryParamsString.set('code_challenge', codeChallenge);
    queryParamsString.set('code_challenge_method', 'S256');
    queryParamsString.set('mode', 'api');
    queryParamsString.set('client_secret', this.cardBaanxApiKey);
    queryParamsString.set('response_type', 'code');

    const response = await this.makeRequest(
      '/v1/auth/oauth/authorize/initiate',
      {
        fetchOptions: {
          method: 'GET',
          query: queryParamsString.toString(),
        },
        authenticated: false,
        location: queryParams.location,
      },
    );

    return this.handleApiResponse<CardLoginInitiateResponse>(
      response,
      'initiateAuth',
      'oauth/authorize/initiate',
      'Failed to initiate authentication',
    );
  };

  login = async (body: {
    email: string;
    password: string;
    location: CardLocation;
    otpCode?: string;
  }): Promise<CardLoginResponse> => {
    const { email, password, otpCode, location } = body;

    const response = await this.makeRequest('/v1/auth/login', {
      fetchOptions: {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          ...(otpCode ? { otpCode } : {}),
        }),
      },
      authenticated: false,
      location,
    });

    if (!response.ok) {
      let responseBody = null;
      try {
        responseBody = await response.json();
      } catch {
        // If we can't parse response, continue without it
      }

      if (responseBody?.message?.includes('Your account has been disabled')) {
        throw new CardError(
          CardErrorType.ACCOUNT_DISABLED,
          responseBody?.message,
        );
      }

      if (response.status === 400 && !!otpCode) {
        throw new CardError(CardErrorType.INVALID_OTP_CODE, 'Invalid OTP code');
      }

      // Handle specific HTTP status codes
      if (
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404
      ) {
        const error = new CardError(
          CardErrorType.INVALID_CREDENTIALS,
          'Invalid login details',
        );
        Logger.error(error, {
          tags: {
            feature: 'card',
            operation: 'login',
            errorType: 'invalid_credentials',
          },
          context: {
            name: 'card_auth',
            data: { endpoint: 'auth/login', httpStatus: response.status },
          },
        });
        throw error;
      }

      if (response.status >= 500) {
        const error = new CardError(
          CardErrorType.SERVER_ERROR,
          'Server error. Please try again later.',
        );
        Logger.error(error, {
          tags: {
            feature: 'card',
            operation: 'login',
            errorType: 'server_error',
          },
          context: {
            name: 'card_auth',
            data: { endpoint: 'auth/login', httpStatus: response.status },
          },
        });
        throw error;
      }

      const error = new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Login failed. Please try again.',
      );
      Logger.error(error, {
        tags: {
          feature: 'card',
          operation: 'login',
          errorType: 'unknown_error',
        },
        context: {
          name: 'card_auth',
          data: { endpoint: 'auth/login', httpStatus: response.status },
        },
      });
      throw error;
    }

    const data = await response.json();
    return data as CardLoginResponse;
  };

  sendOtpLogin = async (body: {
    userId: string;
    location: CardLocation;
  }): Promise<void> => {
    const { userId } = body;
    const response = await this.makeRequest('/v1/auth/login/otp', {
      fetchOptions: {
        method: 'POST',
        body: JSON.stringify({ userId }),
      },
      authenticated: false,
      location: body.location,
    });

    if (!response.ok) {
      throw this.logAndCreateError(
        CardErrorType.SERVER_ERROR,
        'Failed to send OTP login. Please try again.',
        'sendOtpLogin',
        'auth/login/otp',
        response.status,
      );
    }
  };

  authorize = async (body: {
    initiateAccessToken: string;
    loginAccessToken: string;
    location: CardLocation;
  }): Promise<CardAuthorizeResponse> => {
    const { initiateAccessToken, loginAccessToken, location } = body;
    const response = await this.makeRequest('/v1/auth/oauth/authorize', {
      fetchOptions: {
        method: 'POST',
        body: JSON.stringify({
          token: initiateAccessToken,
        }),
        headers: {
          Authorization: `Bearer ${loginAccessToken}`,
        },
      },
      authenticated: false,
      location,
    });

    return this.handleApiResponse<CardAuthorizeResponse>(
      response,
      'authorize',
      'oauth/authorize',
      'Authorization failed',
    );
  };

  exchangeToken = async (body: {
    code?: string;
    codeVerifier?: string;
    grantType: 'authorization_code' | 'refresh_token';
    location: CardLocation;
  }): Promise<CardExchangeTokenResponse> => {
    let requestBody = null;

    if (body.grantType === 'authorization_code') {
      requestBody = {
        code: body.code,
        code_verifier: body.codeVerifier,
        grant_type: body.grantType,
        // This is a required field for the authorization code grant type
        // but it is not used by the Card API
        redirect_uri: 'https://example.com',
      };
    } else {
      requestBody = {
        grant_type: body.grantType,
        refresh_token: body.code,
      };
    }

    const response = await this.makeRequest('/v1/auth/oauth/token', {
      fetchOptions: {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'x-secret-key': this.cardBaanxApiKey || '',
        },
      },
      authenticated: false,
      location: body.location,
    });

    if (!response.ok) {
      const errorType =
        response.status === 401 || response.status === 403
          ? CardErrorType.INVALID_CREDENTIALS
          : CardErrorType.SERVER_ERROR;

      throw this.logAndCreateError(
        errorType,
        'Token exchange failed. Please try again.',
        'exchangeToken',
        'oauth/token',
        response.status,
        { grantType: body.grantType },
      );
    }

    const data = (await response.json()) as CardExchangeTokenRawResponse;

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
      refreshTokenExpiresIn: data.refresh_token_expires_in,
    } as CardExchangeTokenResponse;
  };

  getUserDetails = async (): Promise<UserResponse> => {
    const response = await this.makeRequest('/v1/user', {
      fetchOptions: { method: 'GET' },
      authenticated: true,
    });

    return this.handleApiResponse<UserResponse>(
      response,
      'getUserDetails',
      'user',
      'Failed to get user details',
    );
  };

  getCardDetails = async (): Promise<CardDetailsResponse> => {
    const response = await this.makeRequest('/v1/card/status', {
      fetchOptions: { method: 'GET' },
      authenticated: true,
    });

    if (!response.ok) {
      // Special case: 404 means user has no card (not an error to log)
      if (response.status === 404) {
        throw new CardError(
          CardErrorType.NO_CARD,
          'User has no card. Request a card first.',
        );
      }

      const errorType =
        response.status === 401 || response.status === 403
          ? CardErrorType.INVALID_CREDENTIALS
          : CardErrorType.SERVER_ERROR;

      throw this.logAndCreateError(
        errorType,
        'Failed to get card details. Please try again.',
        'getCardDetails',
        'card/status',
        response.status,
      );
    }

    return (await response.json()) as CardDetailsResponse;
  };

  /**
   * Generate a secure token for displaying sensitive card details through an image-based display.
   * The token is time-limited (~10 minutes) and single-use.
   *
   * @param request - Optional customization for the card details image appearance
   * @returns Promise containing the token and imageUrl for displaying card details
   */
  generateCardDetailsToken = async (
    request?: CardDetailsTokenRequest,
  ): Promise<CardDetailsTokenResponse> => {
    const response = await this.makeRequest('/v1/card/details/token', {
      fetchOptions: {
        method: 'POST',
        ...(request && { body: JSON.stringify(request) }),
      },
      authenticated: true,
    });

    if (!response.ok) {
      const errorType =
        response.status === 401 || response.status === 403
          ? CardErrorType.INVALID_CREDENTIALS
          : response.status === 404
            ? CardErrorType.NO_CARD
            : CardErrorType.SERVER_ERROR;

      throw this.logAndCreateError(
        errorType,
        'Failed to generate card details token. Please try again.',
        'generateCardDetailsToken',
        'card/details/token',
        response.status,
      );
    }

    return (await response.json()) as CardDetailsTokenResponse;
  };

  getCardExternalWalletDetails = async (
    delegationSettings: DelegationSettingsNetwork[],
  ): Promise<CardExternalWalletDetailsResponse> => {
    const promises = [
      this.makeRequest('/v1/wallet/external', {
        fetchOptions: { method: 'GET' },
        authenticated: true,
      }),
      this.makeRequest('/v1/wallet/external/priority', {
        fetchOptions: { method: 'GET' },
        authenticated: true,
      }),
    ];

    const responses = await Promise.all(promises);

    if (!responses[0].ok || !responses[1].ok) {
      throw this.logAndCreateError(
        CardErrorType.SERVER_ERROR,
        'Failed to get card external wallet details. Please try again.',
        'getCardExternalWalletDetails',
        'wallet/external',
        undefined,
        {
          externalWalletStatus: responses[0].status,
          priorityWalletStatus: responses[1].status,
        },
      );
    }

    const externalWalletDetails =
      (await responses[0].json()) as CardWalletExternalResponse[];
    const priorityWalletDetails =
      (await responses[1].json()) as CardWalletExternalPriorityResponse[];

    if (
      externalWalletDetails.length === 0 ||
      priorityWalletDetails.length === 0
    ) {
      return [];
    }

    const combinedDetails = externalWalletDetails
      .map((wallet: CardWalletExternalResponse) => {
        const networkLower = wallet.network?.toLowerCase();
        const allowanceValue = parseFloat(wallet.allowance);
        if (
          !SUPPORTED_ASSET_NETWORKS.includes(networkLower as CardNetwork) ||
          isNaN(allowanceValue) ||
          isZeroValue(allowanceValue)
        ) {
          return null;
        }

        const priorityWallet = priorityWalletDetails.find(
          (p: CardWalletExternalPriorityResponse) =>
            p?.address?.toLowerCase() === wallet?.address?.toLowerCase() &&
            p?.currency === wallet?.currency &&
            p?.network?.toLowerCase() === wallet?.network?.toLowerCase(),
        );

        // Debug logging to identify matching issues (no PII - wallet.address is public blockchain data)
        if (!priorityWallet) {
          this.logDebugInfo('getCardExternalWalletDetails::noPriorityWallet', {
            currency: wallet.currency,
            network: wallet.network,
            priorityWalletCount: priorityWalletDetails.length,
          });
        }

        const tokenDetails =
          this.mapCardExternalWalletDetailsToDelegationSettings(
            wallet,
            delegationSettings,
          );

        if (!tokenDetails) {
          return null;
        }

        const caipChainId = (() => {
          if (networkLower === 'solana') {
            return cardNetworkInfos.solana.caipChainId;
          }

          if (!tokenDetails?.decimalChainId) {
            this.logDebugInfo('getCardExternalWalletDetails::missingChainId', {
              network: wallet.network,
              fallback: 'using network info',
            });
            return cardNetworkInfos[wallet.network].caipChainId;
          }

          return formatChainIdToCaip(tokenDetails.decimalChainId);
        })();

        return {
          id: priorityWallet?.id ?? 0,
          walletAddress: wallet.address,
          currency: wallet.currency,
          balance: wallet.balance,
          allowance: wallet.allowance,
          priority: priorityWallet?.priority ?? 0,
          caipChainId,
          tokenDetails: {
            address: tokenDetails?.address ?? '',
            decimals: tokenDetails?.decimals ?? 0,
            symbol: tokenDetails?.symbol ?? '',
            name: tokenDetails?.name ?? '',
          },
          network: wallet.network,
          totalAllowance: null, // Will be populated later for priority token only
          delegationContractAddress:
            tokenDetails?.delegationContractAddress ?? '',
          stagingTokenAddress: tokenDetails?.stagingTokenAddress ?? '',
        } as CardExternalWalletDetail;
      })
      .filter((detail): detail is CardExternalWalletDetail => detail !== null);

    // Sort - lower number = higher priority
    return combinedDetails.sort((a, b) => a.priority - b.priority);
  };

  mapCardExternalWalletDetailsToDelegationSettings = (
    cardWalletExternal: CardWalletExternalResponse,
    delegationSettings: DelegationSettingsNetwork[],
  ) => {
    const { network, currency } = cardWalletExternal;
    const caipChainId = cardNetworkInfos[network]?.caipChainId;

    // Get supported tokens for this network (used for fallback token details)
    const supportedTokens = caipChainId
      ? this.getSupportedTokensByChainId(caipChainId)
      : [];

    const delegationSettingNetwork = delegationSettings.find(
      (delegationSetting) =>
        delegationSetting.network?.toLowerCase() === network?.toLowerCase(),
    );

    // Fallback: Network not in delegation settings
    // Use supported tokens for display, but disable delegation (empty contract)
    if (!delegationSettingNetwork) {
      if (!caipChainId) {
        return null;
      }

      const matchingToken = supportedTokens.find(
        (token) => token.symbol?.toLowerCase() === currency?.toLowerCase(),
      );

      if (!matchingToken) {
        return null;
      }

      const tokenDetails = this.mapSupportedTokenToCardToken(matchingToken);

      return {
        symbol: tokenDetails.symbol,
        address: tokenDetails.address,
        decimals: tokenDetails.decimals ?? 18,
        decimalChainId: parseInt(caipChainId.split(':')[1], 10),
        name: tokenDetails.name,
        delegationContractAddress: '', // Empty - delegation disabled for this network
        stagingTokenAddress: null,
      };
    }

    const delegationSettingToken =
      delegationSettingNetwork.tokens[currency?.toLowerCase() ?? ''];

    // Fallback: Token not in delegation settings for this network
    // Use supported tokens for display, but disable delegation (empty contract)
    if (!delegationSettingToken) {
      const matchingToken = supportedTokens.find(
        (token) => token.symbol?.toLowerCase() === currency?.toLowerCase(),
      );

      if (!matchingToken) {
        return null;
      }

      const tokenDetails = this.mapSupportedTokenToCardToken(matchingToken);

      return {
        symbol: tokenDetails.symbol,
        address: tokenDetails.address,
        decimals: tokenDetails.decimals ?? 18,
        decimalChainId: delegationSettingNetwork.chainId,
        name: tokenDetails.name,
        delegationContractAddress: '',
        stagingTokenAddress: null,
      };
    }

    const tokenDetails = this.mapSupportedTokenToCardToken(
      supportedTokens.find(
        (token) =>
          token.symbol?.toLowerCase() ===
          delegationSettingToken.symbol?.toLowerCase(),
      ) ?? supportedTokens[0],
    );

    if (delegationSettingNetwork.environment === 'staging') {
      return {
        symbol: tokenDetails.symbol,
        address: tokenDetails.address,
        decimals: delegationSettingToken.decimals,
        decimalChainId: delegationSettingNetwork.chainId,
        name: tokenDetails.name,
        delegationContractAddress: delegationSettingNetwork.delegationContract,
        // This is used for getting the allowance and delegation on the Staging environment
        stagingTokenAddress: delegationSettingToken.address,
      };
    }

    return {
      symbol: tokenDetails.symbol,
      address: delegationSettingToken.address,
      decimals: delegationSettingToken.decimals,
      decimalChainId: delegationSettingNetwork.chainId,
      name: tokenDetails.name,
      delegationContractAddress: delegationSettingNetwork.delegationContract,
    };
  };

  /**
   * Get the most recent user-initiated allowance amount from approval events for a specific token.
   * This returns the last approval value set by the user, which represents their intended spending limit.
   * Note: ERC20 spending does not create approval events, so all approval events are user-initiated.
   *
   * @param walletAddress - The user's wallet address
   * @param tokenAddress - The ERC20 token contract address
   * @param delegationContractAddress - The delegation/spender contract address
   * @param currentAllowance - The current remaining allowance (from API) - unused but kept for API compatibility
   * @returns The most recent user-initiated approval value as a string (in wei), or null if no logs found
   */
  getLatestAllowanceFromLogs = async (
    walletAddress: string,
    tokenAddress: string,
    delegationContractAddress: string,
    cardNetwork: CardNetwork,
  ): Promise<string | null> => {
    try {
      const approvalInterface = new ethers.utils.Interface([
        'event Approval(address indexed owner, address indexed spender, uint256 value)',
      ]);

      const approvalTopic = approvalInterface.getEventTopic('Approval');
      const ownerTopic = ethers.utils.hexZeroPad(
        walletAddress.toLowerCase(),
        32,
      );
      const spenderTopic = ethers.utils.hexZeroPad(
        delegationContractAddress.toLowerCase(),
        32,
      );

      const spendersDeployedBlock = 2715910; // Block where the delegation contracts were deployed
      const ethersProvider = this.getEthersProvider(cardNetwork);

      // Get all approval logs for this specific wallet + token + spender combination
      const logs = await ethersProvider.getLogs({
        address: tokenAddress,
        fromBlock: spendersDeployedBlock,
        toBlock: 'latest',
        topics: [approvalTopic, ownerTopic, spenderTopic],
      });

      if (logs.length === 0) {
        return null;
      }

      // Sort chronologically (newest first)
      logs.sort((a, b) =>
        b.blockNumber === a.blockNumber
          ? b.logIndex - a.logIndex
          : b.blockNumber - a.blockNumber,
      );

      // Get the most recent approval event
      // This represents the last limit the user set, regardless of how much has been spent
      const latestLog = logs[0];
      const parsedLog = approvalInterface.parseLog(latestLog);
      const value = parsedLog.args.value as ethers.BigNumber;

      return value.toString();
    } catch (error) {
      Logger.error(error as Error, {
        tags: {
          feature: 'card',
          operation: 'getLatestAllowanceFromLogs',
          errorType: 'blockchain_error',
        },
        context: {
          name: 'card_blockchain',
          data: { network: cardNetwork, action: 'fetchApprovalLogs' },
        },
      });
      return null;
    }
  };

  updateWalletPriority = async (
    wallets: { id: number; priority: number }[],
  ): Promise<void> => {
    if (!this.isCardEnabled) {
      throw new Error('Card feature is not enabled for this chain');
    }

    this.logDebugInfo('updateWalletPriority', { wallets });

    const requestBody = { wallets };

    const response = await this.makeRequest('/v1/wallet/external/priority', {
      fetchOptions: {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      },
      authenticated: true,
    });

    if (!response.ok) {
      throw this.logAndCreateError(
        CardErrorType.SERVER_ERROR,
        'Failed to update wallet priority. Please try again.',
        'updateWalletPriority',
        'wallet/external/priority',
        response.status,
        { walletCount: wallets.length },
      );
    }

    this.logDebugInfo(
      'updateWalletPriority',
      'Successfully updated wallet priority',
    );
  };

  /**
   * Generate a delegation token for spending limit increase
   * This is Step 1 of the delegation process
   */
  generateDelegationToken = async (
    network: CardNetwork,
    address: string,
    faucet?: boolean,
  ): Promise<{
    token: string;
    expiresAt: string;
    nonce: string;
  }> => {
    const response = await this.makeRequest(
      `/v1/delegation/token?network=${network}&address=${address}${faucet ? '&faucet=true' : ''}`,
      {
        fetchOptions: { method: 'GET' },
        authenticated: true,
        timeoutMs: 30000,
      },
    );

    if (!response.ok) {
      throw this.logAndCreateError(
        CardErrorType.SERVER_ERROR,
        'Failed to generate delegation token. Please try again.',
        'generateDelegationToken',
        'delegation/token',
        response.status,
        { network },
      );
    }

    const tokenData = await response.json();
    this.logDebugInfo('generateDelegationToken', tokenData);

    return {
      token: tokenData.token,
      expiresAt: tokenData.expiresAt,
      nonce: tokenData.nonce,
    };
  };

  /**
   * Complete EVM wallet delegation for spending limit increase
   * This is Step 3 of the delegation process (after user completes blockchain transaction)
   */
  completeEVMDelegation = async (params: {
    address: string;
    network: CardNetwork;
    currency: string;
    amount: string;
    txHash: string;
    sigHash: string;
    sigMessage: string;
    token: string;
  }): Promise<{ success: boolean }> => {
    // Validate address format (must be valid Ethereum address)
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(params.address)) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Invalid Ethereum address format',
      );
    }

    // Validate signature format (must be valid EVM signature)
    const sigHashRegex = /^0x[a-fA-F0-9]{130}$/;
    if (!sigHashRegex.test(params.sigHash)) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Invalid signature format',
      );
    }

    // Validate network
    if (!SUPPORTED_ASSET_NETWORKS.includes(params.network)) {
      throw new CardError(CardErrorType.VALIDATION_ERROR, 'Invalid network');
    }

    const response = await this.makeRequest(
      '/v1/delegation/evm/post-approval',
      {
        fetchOptions: {
          method: 'POST',
          body: JSON.stringify(params),
        },
        authenticated: true,
      },
    );

    if (!response.ok) {
      throw this.logAndCreateError(
        CardErrorType.SERVER_ERROR,
        'Failed to complete delegation. Please try again.',
        'completeEVMDelegation',
        'delegation/evm/post-approval',
        response.status,
        { network: params.network, currency: params.currency },
      );
    }

    const result = await response.json();
    this.logDebugInfo('completeEVMDelegation', result);

    return result;
  };

  /**
   * Complete Solana wallet delegation for spending limit increase
   * This is Step 3 of the delegation process (after user completes SPL Token approve transaction)
   * Uses the Solana-specific endpoint: /v1/delegation/solana/post-approval
   */
  completeSolanaDelegation = async (params: {
    address: string;
    network: CardNetwork;
    currency: string;
    amount: string;
    txHash: string;
    sigHash: string;
    sigMessage: string;
    token: string;
  }): Promise<{ success: boolean }> => {
    // Validate address format (must be valid Solana address - Base58, 32-44 characters)
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!solanaAddressRegex.test(params.address)) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Invalid Solana address format',
      );
    }

    // Validate transaction signature format (Base58, 87-88 characters)
    const solanaTxHashRegex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
    if (!solanaTxHashRegex.test(params.txHash)) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Invalid Solana transaction signature format',
      );
    }

    // Validate network is solana
    if (params.network !== 'solana') {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Invalid network for Solana delegation',
      );
    }

    const response = await this.makeRequest(
      '/v1/delegation/solana/post-approval',
      {
        fetchOptions: {
          method: 'POST',
          body: JSON.stringify(params),
        },
        authenticated: true,
      },
    );

    if (!response.ok) {
      throw this.logAndCreateError(
        CardErrorType.SERVER_ERROR,
        'Failed to complete Solana delegation. Please try again.',
        'completeSolanaDelegation',
        'delegation/solana/post-approval',
        response.status,
        { network: params.network, currency: params.currency },
      );
    }

    const result = await response.json();
    this.logDebugInfo('completeSolanaDelegation', result);

    return result;
  };

  /**
   * Get delegation settings for a specific network (optional)
   * This fetches chain IDs, token contract addresses, and delegation contract addresses.
   * This needs to be cached at hook level to avoid unnecessary API calls.
   */
  getDelegationSettings = async (
    network?: CardNetwork,
  ): Promise<DelegationSettingsResponse> =>
    this.withErrorHandling(
      'getDelegationSettings',
      'delegation/chain/config',
      'Failed to get delegation settings. Please try again.',
      async () => {
        const queryParams = network ? `?network=${network}` : '';
        const response = await this.makeRequest(
          `/v1/delegation/chain/config${queryParams}`,
          {
            fetchOptions: { method: 'GET' },
            authenticated: true,
          },
        );

        if (!response.ok) {
          throw this.logAndCreateError(
            CardErrorType.SERVER_ERROR,
            'Failed to get delegation settings. Please try again.',
            'getDelegationSettings',
            'delegation/chain/config',
            response.status,
            { network },
          );
        }

        const responseData = await response.json();
        this.logDebugInfo('getDelegationSettings', {
          source: 'api',
          network,
          responseData,
        });

        // Validate the response data
        this.validateDelegationSettings(responseData);

        return responseData;
      },
    );

  encodeApproveTransaction = (spender: string, value: string): string => {
    const approvalInterface = new ethers.utils.Interface([
      'function approve(address spender, uint256 value)',
    ]);
    return approvalInterface.encodeFunctionData('approve', [spender, value]);
  };

  /**
   * Validate delegation settings response
   */
  private validateDelegationSettings = (
    responseData: DelegationSettingsResponse,
  ): void => {
    if (!responseData.networks || !Array.isArray(responseData.networks)) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Invalid delegation settings: networks array is missing or invalid',
      );
    }

    for (const network of responseData.networks) {
      if (!SUPPORTED_ASSET_NETWORKS.includes(network.network as CardNetwork)) {
        continue;
      }

      // Validate required fields
      if (!network.chainId || !network.delegationContract) {
        throw new CardError(
          CardErrorType.VALIDATION_ERROR,
          `Invalid delegation settings for ${network.network}: missing chainId or delegationContract`,
        );
      }

      // Validate token addresses
      if (!network.tokens) {
        throw new CardError(
          CardErrorType.VALIDATION_ERROR,
          `Invalid delegation settings for ${network.network}: tokens object is missing`,
        );
      }

      // Validate all tokens present in the configuration
      for (const [tokenSymbol, token] of Object.entries(network.tokens)) {
        if (
          !token?.address ||
          !token.symbol ||
          typeof token.decimals !== 'number'
        ) {
          throw new CardError(
            CardErrorType.VALIDATION_ERROR,
            `Invalid delegation settings for ${network.network}: ${tokenSymbol} token is missing or invalid`,
          );
        }
      }
    }
  };

  emailVerificationSend = async (
    request: EmailVerificationSendRequest,
  ): Promise<EmailVerificationSendResponse> => {
    this.logDebugInfo('emailVerificationSend', { email: request.email });

    return this.withErrorHandling(
      'emailVerificationSend',
      'auth/register/email/send',
      'Failed to send email verification',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/email/send',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<EmailVerificationSendResponse>(
          response,
          'emailVerificationSend',
          'auth/register/email/send',
          'Email verification send failed',
        );
      },
    );
  };

  emailVerificationVerify = async (
    request: EmailVerificationVerifyRequest,
  ): Promise<EmailVerificationVerifyResponse> => {
    this.logDebugInfo('emailVerificationVerify', {
      email: request.email,
      contactVerificationId: request.contactVerificationId,
      countryOfResidence: request.countryOfResidence,
      userExternalId: request.userExternalId,
    });

    return this.withErrorHandling(
      'emailVerificationVerify',
      'auth/register/email/verify',
      'Failed to verify email verification',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/email/verify',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<EmailVerificationVerifyResponse>(
          response,
          'emailVerificationVerify',
          'auth/register/email/verify',
          'Email verification verify failed',
        );
      },
    );
  };

  phoneVerificationSend = async (
    request: PhoneVerificationSendRequest,
  ): Promise<PhoneVerificationSendResponse> => {
    this.logDebugInfo('phoneVerificationSend request', request);

    return this.withErrorHandling(
      'phoneVerificationSend',
      'auth/register/phone/send',
      'Failed to send phone verification',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/phone/send',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<PhoneVerificationSendResponse>(
          response,
          'phoneVerificationSend',
          'auth/register/phone/send',
          'Phone verification send failed',
        );
      },
    );
  };

  phoneVerificationVerify = async (
    request: PhoneVerificationVerifyRequest,
  ): Promise<RegisterUserResponse> => {
    this.logDebugInfo('phoneVerificationVerify request', request);

    return this.withErrorHandling(
      'phoneVerificationVerify',
      'auth/register/phone/verify',
      'Failed to verify phone verification',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/phone/verify',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<RegisterUserResponse>(
          response,
          'phoneVerificationVerify',
          'auth/register/phone/verify',
          'Phone verification verify failed',
        );
      },
    );
  };

  startUserVerification = async (
    request: StartUserVerificationRequest,
  ): Promise<StartUserVerificationResponse> => {
    this.logDebugInfo('startUserVerification', request);

    return this.withErrorHandling(
      'startUserVerification',
      'auth/register/verification',
      'Failed to start user verification',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/verification',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<StartUserVerificationResponse>(
          response,
          'startUserVerification',
          'auth/register/verification',
          'Failed to start user verification',
        );
      },
    );
  };

  registerPersonalDetails = async (
    request: RegisterPersonalDetailsRequest,
  ): Promise<RegisterUserResponse> => {
    this.logDebugInfo('registerPersonalDetails', {
      onboardingId: request.onboardingId,
    });

    return this.withErrorHandling(
      'registerPersonalDetails',
      'auth/register/personal-details',
      'Failed to register personal details',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/personal-details',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<RegisterUserResponse>(
          response,
          'registerPersonalDetails',
          'auth/register/personal-details',
          'Personal details registration failed',
        );
      },
    );
  };

  registerPhysicalAddress = async (
    request: RegisterPhysicalAddressRequest,
  ): Promise<RegisterAddressResponse> => {
    this.logDebugInfo('registerPhysicalAddress', {
      onboardingId: request.onboardingId,
    });

    return this.withErrorHandling(
      'registerPhysicalAddress',
      'auth/register/address',
      'Failed to register address',
      async () => {
        const response = await this.makeRequest('/v1/auth/register/address', {
          fetchOptions: {
            method: 'POST',
            body: JSON.stringify(request),
          },
          authenticated: false,
        });

        return this.handleApiResponse<RegisterAddressResponse>(
          response,
          'registerPhysicalAddress',
          'auth/register/address',
          'Address registration failed',
        );
      },
    );
  };

  registerMailingAddress = async (
    request: RegisterPhysicalAddressRequest,
  ): Promise<RegisterAddressResponse> => {
    this.logDebugInfo('registerMailingAddress', {
      onboardingId: request.onboardingId,
    });

    return this.withErrorHandling(
      'registerMailingAddress',
      'auth/register/mailing-address',
      'Failed to register address',
      async () => {
        const response = await this.makeRequest(
          '/v1/auth/register/mailing-address',
          {
            fetchOptions: {
              method: 'POST',
              body: JSON.stringify(request),
            },
            authenticated: false,
          },
        );

        return this.handleApiResponse<RegisterAddressResponse>(
          response,
          'registerMailingAddress',
          'auth/register/mailing-address',
          'Address registration failed',
        );
      },
    );
  };

  getRegistrationSettings = async (): Promise<RegistrationSettingsResponse> =>
    this.withErrorHandling(
      'getRegistrationSettings',
      'auth/settings',
      'Failed to get registration settings',
      async () => {
        const response = await this.makeRequest('/v1/auth/settings', {
          fetchOptions: { method: 'GET' },
          authenticated: false,
        });

        const data = await this.handleApiResponse<RegistrationSettingsResponse>(
          response,
          'getRegistrationSettings',
          'auth/settings',
          'Failed to get registration settings',
        );

        this.logDebugInfo('getRegistrationSettings response', data);
        return data;
      },
    );

  getRegistrationStatus = async (onboardingId: string): Promise<UserResponse> =>
    this.withErrorHandling(
      'getRegistrationStatus',
      'auth/register',
      'Failed to get registration status',
      async () => {
        const response = await this.makeRequest(
          `/v1/auth/register?onboardingId=${onboardingId}`,
          {
            fetchOptions: { method: 'GET' },
            authenticated: false,
          },
        );

        const data = await this.handleApiResponse<UserResponse>(
          response,
          'getRegistrationStatus',
          'auth/register',
          'Failed to get registration status',
        );

        this.logDebugInfo('getRegistrationStatus response', data);
        return data;
      },
    );

  getConsentSetByOnboardingId = async (
    onboardingId: string,
  ): Promise<GetOnboardingConsentResponse | null> =>
    this.withErrorHandling(
      'getConsentSetByOnboardingId',
      'consent/onboarding',
      'Failed to get consent set by onboarding id',
      async () => {
        const response = await this.makeRequest(
          `/v2/consent/onboarding/${onboardingId}`,
          {
            fetchOptions: { method: 'GET' },
            authenticated: false,
          },
        );

        // Special case: 404 means consent not found (not an error)
        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          throw this.logAndCreateError(
            response.status >= 500
              ? CardErrorType.SERVER_ERROR
              : CardErrorType.CONFLICT_ERROR,
            'Failed to get consent set by onboarding id',
            'getConsentSetByOnboardingId',
            'consent/onboarding',
            response.status,
          );
        }

        const data = await response.json();
        this.logDebugInfo('getConsentSetByOnboardingId response', data);
        return data;
      },
    );

  createOnboardingConsent = async (
    request: Omit<CreateOnboardingConsentRequest, 'tenantId'>,
  ): Promise<CreateOnboardingConsentResponse> => {
    this.logDebugInfo('createOnboardingConsent', { request });
    const requestBody = {
      ...request,
      tenantId: this.cardBaanxApiKey || 'tenant_baanx_global',
    } as CreateOnboardingConsentRequest;

    return this.withErrorHandling(
      'createOnboardingConsent',
      'consent/onboarding',
      'Failed to create onboarding consent',
      async () => {
        const response = await this.makeRequest('/v2/consent/onboarding', {
          fetchOptions: {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: {
              'x-secret-key': this.cardBaanxApiKey || '',
            },
          },
          authenticated: false,
        });

        const data =
          await this.handleApiResponse<CreateOnboardingConsentResponse>(
            response,
            'createOnboardingConsent',
            'consent/onboarding',
            'Failed to create onboarding consent',
          );

        this.logDebugInfo('createOnboardingConsent response', data);
        return data;
      },
    );
  };

  linkUserToConsent = async (
    consentSetId: string,
    request: LinkUserToConsentRequest,
  ): Promise<LinkUserToConsentResponse> => {
    this.logDebugInfo('linkUserToConsent', {
      consentSetId,
      request,
    });

    return this.withErrorHandling(
      'linkUserToConsent',
      'consent/onboarding',
      'Failed to link user to consent',
      async () => {
        const response = await this.makeRequest(
          `/v2/consent/onboarding/${consentSetId}`,
          {
            fetchOptions: {
              method: 'PATCH',
              body: JSON.stringify(request),
              headers: {
                'x-secret-key': this.cardBaanxApiKey || '',
              },
            },
            authenticated: false,
          },
        );

        const data = await this.handleApiResponse<LinkUserToConsentResponse>(
          response,
          'linkUserToConsent',
          'consent/onboarding',
          'Failed to link user to consent',
        );

        this.logDebugInfo('linkUserToConsent response', data);
        return data;
      },
    );
  };

  /**
   * Creates a new order for a product (e.g., premium account upgrade, metal card)
   * POST /v1/order
   *
   * @param request - The order creation request
   * @param location - User's card location (us or international)
   * @returns Promise resolving to order response with orderId and payment configuration
   */
  createOrder = async (): Promise<CreateOrderResponse> => {
    const request: CreateOrderRequest = {
      productId: 'PREMIUM_SUBSCRIPTION',
      paymentMethod: 'CRYPTO_EXTERNAL_DAIMO',
    };
    this.logDebugInfo('createOrder', request);

    return this.withErrorHandling(
      'createOrder',
      'order',
      'Failed to create order',
      async () => {
        const response = await this.makeRequest('/v1/order', {
          fetchOptions: {
            method: 'POST',
            body: JSON.stringify(request),
          },
          authenticated: true,
        });

        const data = await this.handleApiResponse<CreateOrderResponse>(
          response,
          'createOrder',
          'order',
          'Failed to create order',
        );

        this.logDebugInfo('createOrder response', data);
        return data;
      },
    );
  };

  /**
   * Fetches the status of an order by ID
   * GET /v1/order/:orderId
   *
   * Can be used for polling async completion of an order after interactive payment
   *
   * @param orderId - The unique order identifier
   * @param location - User's card location (us or international)
   * @returns Promise resolving to order status response
   */
  getOrderStatus = async (orderId: string): Promise<GetOrderStatusResponse> => {
    this.logDebugInfo('getOrderStatus', { orderId });

    return this.withErrorHandling(
      'getOrderStatus',
      `order/${orderId}`,
      'Failed to get order status',
      async () => {
        const response = await this.makeRequest(`/v1/order/${orderId}`, {
          fetchOptions: {
            method: 'GET',
          },
          authenticated: true,
        });

        // Handle 404 - order not found
        if (response.status === 404) {
          throw new CardError(
            CardErrorType.NOT_FOUND,
            `Order not found: ${orderId}`,
          );
        }

        const data = await this.handleApiResponse<GetOrderStatusResponse>(
          response,
          'getOrderStatus',
          `order/${orderId}`,
          'Failed to get order status',
        );

        this.logDebugInfo('getOrderStatus response', data);
        return data;
      },
    );
  };

  private getFirstSupportedTokenOrNull(): CardToken | null {
    const lineaSupportedTokens = this.getSupportedTokensByChainId();

    return lineaSupportedTokens.length > 0
      ? this.mapSupportedTokenToCardToken(lineaSupportedTokens[0])
      : null;
  }

  private findSupportedTokenByAddress(tokenAddress: string): CardToken | null {
    const match = this.getSupportedTokensByChainId().find(
      (supportedToken) =>
        supportedToken.address?.toLowerCase() === tokenAddress.toLowerCase(),
    );

    return match ? this.mapSupportedTokenToCardToken(match) : null;
  }

  private async findPriorityTokenFromApprovalLogs(
    address: string,
    nonZeroBalanceTokens: string[],
  ): Promise<CardToken | null> {
    const approvalLogs = await this.getApprovalLogs(
      address,
      nonZeroBalanceTokens,
    );

    if (approvalLogs.length === 0) {
      return this.getFirstSupportedTokenOrNull();
    }

    const lastNonZeroApprovalToken =
      this.findLastNonZeroApprovalToken(approvalLogs);
    return lastNonZeroApprovalToken
      ? this.findSupportedTokenByAddress(lastNonZeroApprovalToken)
      : null;
  }

  private async getApprovalLogs(
    address: string,
    nonZeroBalanceTokensAddresses: string[],
  ): Promise<(ethers.providers.Log & { tokenAddress: string })[]> {
    const approvalInterface = new ethers.utils.Interface([
      'event Approval(address indexed owner,address indexed spender,uint256 value)',
    ]);
    const contracts = this.foxConnectAddresses('linea');

    if (!contracts?.global || !contracts?.us) {
      throw new Error(
        'FoxConnect contracts are not defined for the current network',
      );
    }

    const { global: foxConnectGlobalAddress, us: foxConnectUsAddress } =
      contracts;

    const approvalTopic = approvalInterface.getEventTopic('Approval');
    const ownerTopic = ethers.utils.hexZeroPad(address.toLowerCase(), 32);
    const spenders = [foxConnectGlobalAddress, foxConnectUsAddress];
    const spenderTopics = spenders.map((s) =>
      ethers.utils.hexZeroPad(s.toLowerCase(), 32),
    );
    const spendersDeployedBlock = 2715910; // Block where the spenders were deployed
    const ethersProvider = this.getEthersProvider('linea');

    const logsPerToken = await Promise.all(
      nonZeroBalanceTokensAddresses.map((tokenAddress) =>
        ethersProvider
          .getLogs({
            address: tokenAddress,
            fromBlock: spendersDeployedBlock,
            toBlock: 'latest',
            topics: [approvalTopic, ownerTopic, spenderTopics],
          })
          .then((logs) =>
            logs.map((log) => ({
              ...log,
              tokenAddress,
            })),
          ),
      ),
    );

    const allLogs = logsPerToken.flat();

    // Sort chronologically
    allLogs.sort((a, b) =>
      a.blockNumber === b.blockNumber
        ? a.logIndex - b.logIndex
        : a.blockNumber - b.blockNumber,
    );

    return allLogs;
  }

  private findLastNonZeroApprovalToken(
    logs: (ethers.providers.Log & { tokenAddress: string })[],
  ): string | null {
    const approvalInterface = new ethers.utils.Interface([
      'event Approval(address indexed owner,address indexed spender,uint256 value)',
    ]);

    // Find the last non-zero approval by iterating backwards
    for (let i = logs.length - 1; i >= 0; i--) {
      const { args } = approvalInterface.parseLog(logs[i]);
      const value = args.value as ethers.BigNumber;

      if (!value.isZero()) {
        return logs[i].tokenAddress;
      }
    }

    return null;
  }

  private mapSupportedTokenToCardToken(token: SupportedToken): CardToken {
    return {
      address: token.address || null,
      decimals: token.decimals || null,
      symbol: token.symbol || null,
      name: token.name || null,
    };
  }
}
