import { ethers } from 'ethers';
import {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card';
import { getDecimalChainId } from '../../../../util/networks';
import { LINEA_DEFAULT_RPC_URL } from '../../../../constants/urls';
import { BALANCE_SCANNER_ABI, SUPPORTED_ASSET_NETWORKS } from '../constants';
import Logger from '../../../../util/Logger';
import {
  CardType,
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
} from '../types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from '../util/mapBaanxApiUrl';
import { getCardBaanxToken } from '../util/cardTokenVault';
import { SOLANA_MAINNET } from '../../Ramp/Deposit/constants/networks';
import { CaipChainId } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { SolScope } from '@metamask/keyring-api';
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
  lineaChainId: CaipChainId;

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
    this.lineaChainId = `eip155:${getDecimalChainId(CHAIN_IDS.LINEA_MAINNET)}`;
    this.userCardLocation = userCardLocation ?? 'international';
  }

  get isCardEnabled(): boolean {
    return this.cardFeatureFlag.chains?.[this.lineaChainId]?.enabled || false;
  }

  getSupportedTokensByChainId(chainId: CaipChainId): SupportedToken[] {
    if (!this.isCardEnabled) {
      return [];
    }

    const tokens = this.cardFeatureFlag.chains?.[chainId]?.tokens;

    if (!tokens) {
      return [];
    }

    return tokens.filter(
      (token): token is SupportedToken =>
        token && typeof token.address === 'string' && token.enabled !== false,
    );
  }

  private get foxConnectAddresses() {
    const foxConnect =
      this.cardFeatureFlag.chains?.[this.lineaChainId]?.foxConnectAddresses;

    if (!foxConnect?.global || !foxConnect?.us) {
      throw new Error(
        'FoxConnect addresses are not defined for the current chain',
      );
    }

    return {
      global: foxConnect.global || null,
      us: foxConnect.us || null,
    };
  }

  private getEthersProvider() {
    // Default RPC URL for LINEA mainnet
    const provider = new ethers.providers.JsonRpcProvider(
      LINEA_DEFAULT_RPC_URL,
    );

    return provider;
  }

  private getBalanceScannerInstance() {
    const balanceScannerAddress =
      this.cardFeatureFlag.chains?.[this.lineaChainId]?.balanceScannerAddress;

    if (!balanceScannerAddress) {
      throw new Error(
        'Balance scanner address is not defined for the current chain',
      );
    }

    const ethersProvider = this.getEthersProvider();

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
      Logger.log(
        error as Error,
        'CardSDK: Failed to check if address is a card holder',
      );
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
      Logger.log(error as Error, 'CardSDK: Failed to get geolocation');
      return 'UNKNOWN';
    }
  };

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

    const supportedTokensAddresses = this.getSupportedTokensByChainId(
      this.lineaChainId,
    )
      .map((token) => token.address)
      // Ensure all addresses are valid Ethereum addresses
      .filter(
        (addr): addr is string => addr != null && ethers.utils.isAddress(addr),
      );

    if (supportedTokensAddresses.length === 0) {
      return [];
    }

    const { global: foxConnectGlobalAddress, us: foxConnectUsAddress } =
      this.foxConnectAddresses;

    const spenders: string[][] = supportedTokensAddresses.map(() => [
      foxConnectGlobalAddress,
      foxConnectUsAddress,
    ]);

    const balanceScannerInstance = this.getBalanceScannerInstance();
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
    options: RequestInit & { query?: string } = {},
    authenticated: boolean = false,
    location: CardLocation = this.userCardLocation,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
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
      Logger.log('Failed to retrieve Card bearer token:', error);
    }

    const url = `${this.cardBaanxApiBaseUrl}${endpoint}${
      options.query ? `?${options.query}` : ''
    }`;

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        credentials: 'omit',
        ...options,
        headers: {
          ...headers,
          ...options.headers,
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
        method: 'GET',
        query: queryParamsString.toString(),
      },
      false,
      queryParams.location,
    );

    if (!response.ok) {
      let responseBody = null;
      try {
        responseBody = await response.text();
      } catch {
        // If we can't parse response, continue without it
      }

      const error = new CardError(
        CardErrorType.SERVER_ERROR,
        'Failed to initiate authentication. Please try again.',
      );
      Logger.log(
        error,
        `CardSDK: Failed to initiate card provider authentication. Status: ${response.status}, Response: ${responseBody}`,
      );
      throw error;
    }

    const data = await response.json();
    return data as CardLoginInitiateResponse;
  };

  login = async (body: {
    email: string;
    password: string;
    location: CardLocation;
    otpCode?: string;
  }): Promise<CardLoginResponse> => {
    const { email, password, otpCode, location } = body;

    const response = await this.makeRequest(
      '/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          ...(otpCode ? { otpCode } : {}),
        }),
      },
      false,
      location,
    );

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
        Logger.log(
          error,
          `CardSDK: Invalid credentials during login. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw error;
      }

      if (response.status >= 500) {
        const error = new CardError(
          CardErrorType.SERVER_ERROR,
          'Server error. Please try again later.',
        );
        Logger.log(
          error,
          `CardSDK: Server error during login. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw error;
      }

      const error = new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Login failed. Please try again.',
      );
      Logger.log(
        error,
        `CardSDK: Unknown error during login. Status: ${response.status}`,
        JSON.stringify(responseBody, null, 2),
      );
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
    const response = await this.makeRequest(
      '/v1/auth/login/otp',
      {
        method: 'POST',
        body: JSON.stringify({ userId }),
      },
      false,
      body.location,
    );

    if (!response.ok) {
      let responseBody = null;
      try {
        responseBody = await response.text();
      } catch {
        // If we can't parse response, continue without it
      }

      const error = new CardError(
        CardErrorType.SERVER_ERROR,
        'Failed to send OTP login. Please try again.',
      );
      Logger.log(
        error,
        `CardSDK: Failed to send OTP login. Status: ${response.status}`,
        JSON.stringify(responseBody, null, 2),
      );
      throw error;
    }
  };

  authorize = async (body: {
    initiateAccessToken: string;
    loginAccessToken: string;
    location: CardLocation;
  }): Promise<CardAuthorizeResponse> => {
    const { initiateAccessToken, loginAccessToken, location } = body;
    const response = await this.makeRequest(
      '/v1/auth/oauth/authorize',
      {
        method: 'POST',
        body: JSON.stringify({
          token: initiateAccessToken,
        }),
        headers: {
          Authorization: `Bearer ${loginAccessToken}`,
        },
      },
      false,
      location,
    );

    if (!response.ok) {
      let responseBody = null;
      try {
        responseBody = await response.text();
      } catch {
        // If we can't parse response, continue without it
      }

      if (response.status === 401 || response.status === 403) {
        const error = new CardError(
          CardErrorType.INVALID_CREDENTIALS,
          'Authorization failed. Please try logging in again.',
        );
        Logger.log(
          error,
          `CardSDK: Authorization failed - invalid credentials. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw error;
      }

      const error = new CardError(
        CardErrorType.SERVER_ERROR,
        'Authorization failed. Please try again.',
      );
      Logger.log(
        error,
        `CardSDK: Authorization failed. Status: ${response.status}`,
        JSON.stringify(responseBody, null, 2),
      );
      throw error;
    }

    const data = await response.json();
    return data as CardAuthorizeResponse;
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

    const response = await this.makeRequest(
      '/v1/auth/oauth/token',
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'x-secret-key': this.cardBaanxApiKey || '',
        },
      },
      false,
      body.location,
    );

    if (!response.ok) {
      let responseBody = null;
      try {
        responseBody = await response.text();
      } catch {
        // If we can't parse response, continue without it
      }

      if (response.status === 401 || response.status === 403) {
        const error = new CardError(
          CardErrorType.INVALID_CREDENTIALS,
          'Token exchange failed. Please try logging in again.',
        );
        Logger.log(
          error,
          `CardSDK: Token exchange failed - invalid credentials. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw error;
      }

      const error = new CardError(
        CardErrorType.SERVER_ERROR,
        'Token exchange failed. Please try again.',
      );
      Logger.log(
        error,
        `CardSDK: Token exchange failed. Status: ${response.status}`,
        JSON.stringify(responseBody, null, 2),
      );
      throw error;
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
    const response = await this.makeRequest(
      '/v1/user',
      { method: 'GET' },
      true,
    );

    if (!response.ok) {
      let responseBody = null;
      try {
        responseBody = await response.json();
      } catch {
        // If we can't parse response, continue without it
      }

      this.logDebugInfo(
        'getUserDetails::error',
        `Status: ${response.status}, Message: ${JSON.stringify(responseBody, null, 2)}`,
      );

      if (response.status === 401 || response.status === 403) {
        throw new CardError(
          CardErrorType.INVALID_CREDENTIALS,
          responseBody?.message ||
            'Invalid credentials. Please try logging in again.',
        );
      }

      throw new CardError(
        CardErrorType.SERVER_ERROR,
        responseBody?.message ||
          'Failed to get user details. Please try again.',
      );
    }

    const data = await response.json();
    return data as UserResponse;
  };

  getCardDetails = async (): Promise<CardDetailsResponse> => {
    const response = await this.makeRequest(
      '/v1/card/status',
      { method: 'GET' },
      true,
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new CardError(
          CardErrorType.INVALID_CREDENTIALS,
          'Invalid credentials. Please try logging in again.',
        );
      }

      if (response.status === 404) {
        throw new CardError(
          CardErrorType.NO_CARD,
          'User has no card. Request a card first.',
        );
      }

      const errorResponse = await response.json();
      Logger.log(errorResponse, 'Failed to get card details.');
      throw new CardError(
        CardErrorType.SERVER_ERROR,
        'Failed to get card details. Please try again.',
      );
    }

    return (await response.json()) as CardDetailsResponse;
  };

  getCardExternalWalletDetails = async (
    delegationSettings: DelegationSettingsNetwork[],
  ): Promise<CardExternalWalletDetailsResponse> => {
    const promises = [
      this.makeRequest('/v1/wallet/external', { method: 'GET' }, true),
      this.makeRequest('/v1/wallet/external/priority', { method: 'GET' }, true),
    ];

    const responses = await Promise.all(promises);

    if (!responses[0].ok || !responses[1].ok) {
      try {
        const errorResponse0 = await responses[0].json();
        const errorResponse1 = await responses[1].json();
        Logger.log(
          errorResponse0,
          'Failed to get card external wallet details. Please try again.',
        );
        Logger.log(
          errorResponse1,
          'Failed to get card priority wallet details. Please try again.',
        );
      } catch (error) {
        Logger.error(
          error as Error,
          'Failed to get parse external wallet details.',
        );
      }

      throw new CardError(
        CardErrorType.SERVER_ERROR,
        'Failed to get card external wallet details. Please try again.',
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
        if (
          !SUPPORTED_ASSET_NETWORKS.includes(networkLower) ||
          isNaN(parseInt(wallet.allowance)) ||
          isZeroValue(parseInt(wallet.allowance))
        ) {
          return null;
        }

        const priorityWallet = priorityWalletDetails.find(
          (p: CardWalletExternalPriorityResponse) =>
            p?.address?.toLowerCase() === wallet?.address?.toLowerCase() &&
            p?.currency === wallet?.currency &&
            p?.network?.toLowerCase() === wallet?.network?.toLowerCase(),
        );

        // Debug logging to identify matching issues
        if (!priorityWallet) {
          Logger.log(
            `CardSDK: No priority wallet found for address: ${wallet.address}, currency: ${wallet.currency}, network: ${wallet.network}`,
          );
          Logger.log('Available priority wallets:', priorityWalletDetails);
        }

        const tokenDetails =
          this.mapCardExternalWalletDetailsToDelegationSettings(
            wallet,
            delegationSettings,
          );

        // Determine caipChainId based on network type
        // For Solana, use the proper Solana CAIP chain ID
        // For EVM chains, convert the decimal chainId to CAIP format
        const caipChainId = (() => {
          if (networkLower === 'solana') {
            return SolScope.Mainnet;
          }

          // For EVM chains, ensure we have valid tokenDetails before formatting
          if (!tokenDetails?.decimalChainId) {
            Logger.log(
              `Missing decimalChainId for network ${wallet.network}, using network fallback`,
            );
            return this.mapAPINetworkToCaipChainId(wallet.network);
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
    const delegationSettingNetwork = delegationSettings.find(
      (delegationSetting) =>
        delegationSetting.network?.toLowerCase() === network?.toLowerCase(),
    );

    if (!delegationSettingNetwork) {
      return null;
    }

    const delegationSettingToken =
      delegationSettingNetwork.tokens[currency?.toLowerCase() ?? ''];

    if (!delegationSettingToken) {
      return null;
    }

    const supportedTokens = this.getSupportedTokensByChainId(
      this.mapAPINetworkToCaipChainId(cardWalletExternal.network),
    );
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
      const ethersProvider = this.getEthersProvider();

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
      Logger.error(
        error as Error,
        `getLatestAllowanceFromLogs: Failed to get latest allowance for token ${tokenAddress}`,
      );
      return null;
    }
  };

  provisionCard = async (): Promise<{ success: boolean }> => {
    const response = await this.makeRequest(
      '/v1/card/order',
      {
        method: 'POST',
        body: JSON.stringify({
          type: CardType.VIRTUAL,
        }),
      },
      true,
    );

    if (!response.ok) {
      try {
        const errorResponse = await response.json();
        Logger.log(errorResponse, 'Failed to provision card.');
      } catch (error) {
        Logger.error(
          error as Error,
          'Failed to parse provision card response.',
        );
      }

      throw new CardError(
        CardErrorType.SERVER_ERROR,
        'Failed to provision card. Please try again.',
      );
    }

    return (await response.json()) as { success: boolean };
  };

  updateWalletPriority = async (
    wallets: { id: number; priority: number }[],
  ): Promise<void> => {
    if (!this.isCardEnabled) {
      throw new Error('Card feature is not enabled for this chain');
    }

    this.logDebugInfo('updateWalletPriority', { wallets });

    const requestBody = { wallets };

    const response = await this.makeRequest(
      '/v1/wallet/external/priority',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
      true, // authenticated
    );

    if (!response.ok) {
      let responseBody = null;
      try {
        responseBody = await response.text();
        Logger.log('CardSDK: Priority update error response:', responseBody);
      } catch {
        // If we can't parse response, continue without it
      }

      const error = new CardError(
        CardErrorType.SERVER_ERROR,
        'Failed to update wallet priority. Please try again.',
      );
      Logger.log(
        error,
        `CardSDK: Failed to update wallet priority. Status: ${response.status}`,
        JSON.stringify(responseBody, null, 2),
      );
      throw error;
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
  ): Promise<{
    token: string;
    expiresAt: string;
    nonce: string;
  }> => {
    // The endpoint only accepts linea or solana.
    // linea-us can be mapped to linea.
    const mapNetworkPropToEndpointParam =
      network === 'solana' ? 'solana' : 'linea';
    const response = await this.makeRequest(
      `/v1/delegation/token?network=${mapNetworkPropToEndpointParam}&address=${address}`,
      { method: 'GET' },
      true, // authenticated
    );

    if (!response.ok) {
      let responseBody = null;
      try {
        responseBody = await response.text();
      } catch {
        // If we can't parse response, continue without it
      }

      const error = new CardError(
        CardErrorType.SERVER_ERROR,
        'Failed to generate delegation token. Please try again.',
      );
      Logger.log(
        error,
        `CardSDK: Failed to generate delegation token. Status: ${response.status}`,
        JSON.stringify(responseBody, null, 2),
      );
      throw error;
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
    if (!['linea', 'solana'].includes(params.network)) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Invalid network. Must be "linea" or "solana"',
      );
    }

    const response = await this.makeRequest(
      '/v1/delegation/evm/post-approval',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      true, // authenticated
    );

    if (!response.ok) {
      let responseBody = null;
      try {
        responseBody = await response.text();
      } catch {
        // If we can't parse response, continue without it
      }

      const error = new CardError(
        CardErrorType.SERVER_ERROR,
        'Failed to complete delegation. Please try again.',
      );
      Logger.log(
        error,
        `CardSDK: Failed to complete delegation. Status: ${response.status}`,
        JSON.stringify(responseBody, null, 2),
      );
      throw error;
    }

    const result = await response.json();
    this.logDebugInfo('completeEVMDelegation', result);

    return result;
  };

  /**
   * Get delegation settings for a specific network (optional)
   * This fetches chain IDs, token contract addresses, and delegation contract addresses.
   * This needs to be cached at hook level to avoid unnecessary API calls.
   */
  getDelegationSettings = async (
    network?: CardNetwork,
  ): Promise<DelegationSettingsResponse> => {
    try {
      const queryParams = network ? `?network=${network}` : '';
      const response = await this.makeRequest(
        `/v1/delegation/chain/config${queryParams}`,
        { method: 'GET' },
        true, // authenticated
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.text();
        } catch {
          // If we can't parse response, continue without it
        }

        const error = new CardError(
          CardErrorType.SERVER_ERROR,
          'Failed to get delegation settings. Please try again.',
        );
        Logger.log(
          error,
          `CardSDK: Failed to get delegation settings. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw error;
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
    } catch (error) {
      Logger.log(error, 'CardSDK: Failed to get delegation settings from API');
      throw new CardError(
        CardErrorType.SERVER_ERROR,
        'Failed to get delegation settings. Please try again.',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };

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

    const supportedNetworks = ['linea', 'linea-us', 'solana'];

    for (const network of responseData.networks) {
      if (!supportedNetworks.includes(network.network)) {
        continue; // Skip unsupported networks
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

    try {
      const response = await this.makeRequest(
        '/v1/auth/register/email/send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        },
        false, // not authenticated
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }
        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message ||
              `Email verification send failed: ${response.status} ${response.statusText}`,
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              `Email verification send failed: ${response.status} ${response.statusText}`,
          );
        }
      }

      const data = await response.json();
      return data as EmailVerificationSendResponse;
    } catch (error) {
      this.logDebugInfo('emailVerificationSend error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to send email verification',
        error as Error,
      );
    }
  };

  emailVerificationVerify = async (
    request: EmailVerificationVerifyRequest,
  ): Promise<EmailVerificationVerifyResponse> => {
    this.logDebugInfo('emailVerificationVerify', {
      email: request.email,
      contactVerificationId: request.contactVerificationId,
      countryOfResidence: request.countryOfResidence,
    });

    try {
      const response = await this.makeRequest(
        '/v1/auth/register/email/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        },
        false, // not authenticated
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }
        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message ||
              `Email verification verify failed: ${response.status} ${response.statusText}`,
          );
        }
        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              `Email verification verify failed: ${response.status} ${response.statusText}`,
          );
        }
      }

      const data = await response.json();
      return data as EmailVerificationVerifyResponse;
    } catch (error) {
      this.logDebugInfo('emailVerificationVerify error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to verify email verification',
        error as Error,
      );
    }
  };

  phoneVerificationSend = async (
    request: PhoneVerificationSendRequest,
  ): Promise<PhoneVerificationSendResponse> => {
    try {
      this.logDebugInfo('phoneVerificationSend request', request);

      const response = await this.makeRequest(
        '/v1/auth/register/phone/send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        },
        false,
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }
        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message ||
              `Phone verification send failed: ${response.status} ${response.statusText}`,
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              `Phone verification send failed: ${response.status} ${response.statusText}`,
          );
        }
      }

      const data = await response.json();
      return data as PhoneVerificationSendResponse;
    } catch (error) {
      this.logDebugInfo('phoneVerificationSend error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to send phone verification',
        error as Error,
      );
    }
  };

  phoneVerificationVerify = async (
    request: PhoneVerificationVerifyRequest,
  ): Promise<RegisterUserResponse> => {
    try {
      this.logDebugInfo('phoneVerificationVerify request', request);

      const response = await this.makeRequest(
        '/v1/auth/register/phone/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        },
        false,
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }

        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message ||
              `Phone verification verify failed: ${response.status} ${response.statusText}`,
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              `Phone verification verify failed: ${response.status} ${response.statusText}`,
          );
        }
      }

      const data = await response.json();
      return data as RegisterUserResponse;
    } catch (error) {
      this.logDebugInfo('phoneVerificationVerify error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to verify phone verification',
        error as Error,
      );
    }
  };

  startUserVerification = async (
    request: StartUserVerificationRequest,
  ): Promise<StartUserVerificationResponse> => {
    this.logDebugInfo('startUserVerification', request);
    try {
      const response = await this.makeRequest(
        '/v1/auth/register/verification',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        },
        false,
      );
      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }

        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message || 'Failed to get registration settings',
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              'Server error while getting registration settings',
          );
        }
      }
      const data = await response.json();
      return data as StartUserVerificationResponse;
    } catch (error) {
      this.logDebugInfo('startUserVerification error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to start user verification',
        error as Error,
      );
    }
  };

  registerPersonalDetails = async (
    request: RegisterPersonalDetailsRequest,
  ): Promise<RegisterUserResponse> => {
    this.logDebugInfo('registerPersonalDetails', {
      onboardingId: request.onboardingId,
    });

    try {
      const response = await this.makeRequest(
        '/v1/auth/register/personal-details',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        },
        false,
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }

        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message ||
              `Personal details registration failed: ${response.status} ${response.statusText}`,
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              `Personal details registration failed: ${response.status} ${response.statusText}`,
          );
        }
      }

      const data = await response.json();
      return data as RegisterUserResponse;
    } catch (error) {
      this.logDebugInfo('registerPersonalDetails error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to register personal details',
        error as Error,
      );
    }
  };

  registerPhysicalAddress = async (
    request: RegisterPhysicalAddressRequest,
  ): Promise<RegisterAddressResponse> => {
    this.logDebugInfo('registerPhysicalAddress', {
      onboardingId: request.onboardingId,
    });

    try {
      const response = await this.makeRequest(
        '/v1/auth/register/address',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        },
        false,
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }

        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message ||
              `Address registration failed: ${response.status} ${response.statusText}`,
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              `Address registration failed: ${response.status} ${response.statusText}`,
          );
        }
      }

      const data = await response.json();
      return data as RegisterAddressResponse;
    } catch (error) {
      this.logDebugInfo('registerAddress error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to register address',
        error as Error,
      );
    }
  };

  registerMailingAddress = async (
    request: RegisterPhysicalAddressRequest,
  ): Promise<RegisterAddressResponse> => {
    this.logDebugInfo('registerMailingAddress', {
      onboardingId: request.onboardingId,
    });

    try {
      const response = await this.makeRequest(
        '/v1/auth/register/mailing-address',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        },
        false,
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }

        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message ||
              `Address registration failed: ${response.status} ${response.statusText}`,
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              `Address registration failed: ${response.status} ${response.statusText}`,
          );
        }
      }

      const data = await response.json();
      return data as RegisterAddressResponse;
    } catch (error) {
      this.logDebugInfo('registerAddress error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to register address',
        error as Error,
      );
    }
  };

  getRegistrationSettings = async (): Promise<RegistrationSettingsResponse> => {
    try {
      const response = await this.makeRequest(
        '/v1/auth/settings',
        {
          method: 'GET',
        },
        false, // not authenticated
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }

        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message || 'Failed to get registration settings',
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              'Server error while getting registration settings',
          );
        }
      }

      const data = await response.json();
      this.logDebugInfo('getRegistrationSettings response', data);
      return data;
    } catch (error) {
      this.logDebugInfo('getRegistrationSettings error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to get registration settings',
        error as Error,
      );
    }
  };

  getRegistrationStatus = async (
    onboardingId: string,
  ): Promise<UserResponse> => {
    try {
      const response = await this.makeRequest(
        `/v1/auth/register?onboardingId=${onboardingId}`,
        {
          method: 'GET',
        },
        false, // not authenticated
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }

        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message || 'Failed to get registration status',
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              'Server error while getting registration status',
          );
        }
      }

      const data = await response.json();
      this.logDebugInfo('getRegistrationStatus response', data);
      return data;
    } catch (error) {
      this.logDebugInfo('getRegistrationStatus error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to get registration status',
        error as Error,
      );
    }
  };

  getConsentSetByOnboardingId = async (
    onboardingId: string,
  ): Promise<GetOnboardingConsentResponse | null> => {
    try {
      const response = await this.makeRequest(
        `/v2/consent/onboarding/${onboardingId}`,
        {
          method: 'GET',
        },
        false, // not authenticated
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }

        if (response.status === 404) {
          return null;
        }

        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message ||
              'Failed to get consent set by onboarding id',
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              'Server error while getting consent set by onboarding id',
          );
        }
      }

      const data = await response.json();
      this.logDebugInfo('getConsentSetByOnboardingId response', data);
      return data;
    } catch (error) {
      this.logDebugInfo('getConsentSetByOnboardingId error', error);
      if (error instanceof CardError) {
        throw error;
      }
      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to get consent set by onboarding id',
        error as Error,
      );
    }
  };

  createOnboardingConsent = async (
    request: Omit<CreateOnboardingConsentRequest, 'tenantId'>,
  ): Promise<CreateOnboardingConsentResponse> => {
    this.logDebugInfo('createOnboardingConsent', { request });
    const requestBody = {
      ...request,
      tenantId: this.cardBaanxApiKey || 'tenant_baanx_global',
    } as CreateOnboardingConsentRequest;

    try {
      const response = await this.makeRequest(
        '/v2/consent/onboarding',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json',
            'x-secret-key': this.cardBaanxApiKey || '',
          },
        },
        false, // not authenticated
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }

        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message || 'Failed to create onboarding consent',
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              'Server error while creating onboarding consent',
          );
        }
      }

      const data = await response.json();
      this.logDebugInfo('createOnboardingConsent response', data);
      return data;
    } catch (error) {
      this.logDebugInfo('createOnboardingConsent error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to create onboarding consent',
        error as Error,
      );
    }
  };

  linkUserToConsent = async (
    consentSetId: string,
    request: LinkUserToConsentRequest,
  ): Promise<LinkUserToConsentResponse> => {
    this.logDebugInfo('linkUserToConsent', {
      consentSetId,
      request,
    });

    try {
      const response = await this.makeRequest(
        `/v2/consent/onboarding/${consentSetId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(request),
          headers: {
            'Content-Type': 'application/json',
            'x-secret-key': this.cardBaanxApiKey || '',
          },
        },
        false, // not authenticated
      );

      if (!response.ok) {
        let responseBody = null;
        try {
          responseBody = await response.json();
        } catch {
          // If we can't parse response, continue without it
        }

        if (response.status >= 400 && response.status < 500) {
          throw new CardError(
            CardErrorType.CONFLICT_ERROR,
            responseBody?.message || 'Failed to link user to consent',
          );
        }

        if (response.status >= 500) {
          throw new CardError(
            CardErrorType.SERVER_ERROR,
            responseBody?.message ||
              'Server error while linking user to consent',
          );
        }
      }

      const data = await response.json();
      this.logDebugInfo('linkUserToConsent response', data);
      return data;
    } catch (error) {
      this.logDebugInfo('linkUserToConsent error', error);

      if (error instanceof CardError) {
        throw error;
      }

      throw new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Failed to link user to consent',
        error as Error,
      );
    }
  };

  private mapAPINetworkToCaipChainId(network: CardNetwork): CaipChainId {
    if (network === 'solana') {
      return SOLANA_MAINNET.chainId;
    }

    return this.lineaChainId;
  }

  private getFirstSupportedTokenOrNull(): CardToken | null {
    const lineaSupportedTokens = this.getSupportedTokensByChainId(
      this.lineaChainId,
    );

    return lineaSupportedTokens.length > 0
      ? this.mapSupportedTokenToCardToken(lineaSupportedTokens[0])
      : null;
  }

  private findSupportedTokenByAddress(tokenAddress: string): CardToken | null {
    const match = this.getSupportedTokensByChainId(this.lineaChainId).find(
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
    const { global: foxConnectGlobalAddress, us: foxConnectUsAddress } =
      this.foxConnectAddresses;

    const approvalTopic = approvalInterface.getEventTopic('Approval');
    const ownerTopic = ethers.utils.hexZeroPad(address.toLowerCase(), 32);
    const spenders = [foxConnectGlobalAddress, foxConnectUsAddress];
    const spenderTopics = spenders.map((s) =>
      ethers.utils.hexZeroPad(s.toLowerCase(), 32),
    );
    const spendersDeployedBlock = 2715910; // Block where the spenders were deployed
    const ethersProvider = this.getEthersProvider();

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
