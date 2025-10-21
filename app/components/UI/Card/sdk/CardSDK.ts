import { ethers } from 'ethers';
import {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card';
import { getDecimalChainId } from '../../../../util/networks';
import { LINEA_DEFAULT_RPC_URL } from '../../../../constants/urls';
import { BALANCE_SCANNER_ABI } from '../constants';
import Logger from '../../../../util/Logger';
import {
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
  CardType,
  CardWalletExternalPriorityResponse,
  CardWalletExternalResponse,
} from '../types';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from '../util/mapBaanxApiUrl';
import { getCardBaanxToken } from '../util/cardTokenVault';
import { SOLANA_MAINNET } from '../../Ramp/Deposit/constants/networks';
import { CaipChainId } from '@metamask/utils';

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
    this.lineaChainId = `eip155:${getDecimalChainId(LINEA_CHAIN_ID)}`;
    this.userCardLocation = userCardLocation ?? 'international';
  }

  get isBaanxLoginEnabled(): boolean {
    return this.cardFeatureFlag?.isBaanxLoginEnabled ?? false;
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

  private get ethersProvider() {
    // Default RPC URL for LINEA mainnet
    return new ethers.providers.JsonRpcProvider(LINEA_DEFAULT_RPC_URL);
  }

  private get balanceScannerInstance() {
    const balanceScannerAddress =
      this.cardFeatureFlag.chains?.[this.lineaChainId]?.balanceScannerAddress;

    if (!balanceScannerAddress) {
      throw new Error(
        'Balance scanner address is not defined for the current chain',
      );
    }

    return new ethers.Contract(
      balanceScannerAddress,
      BALANCE_SCANNER_ABI,
      this.ethersProvider,
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
    ).map((token) => token.address);

    if (supportedTokensAddresses.length === 0) {
      return [];
    }

    const { global: foxConnectGlobalAddress, us: foxConnectUsAddress } =
      this.foxConnectAddresses;

    const spenders: string[][] = supportedTokensAddresses.map(() => [
      foxConnectGlobalAddress,
      foxConnectUsAddress,
    ]);

    const spendersAllowancesForTokens: [boolean, string][][] =
      await this.balanceScannerInstance.spendersAllowancesForTokens(
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
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<Response> {
    const apiKey = this.cardBaanxApiKey;

    if (!apiKey) {
      throw new CardError(
        CardErrorType.API_KEY_MISSING,
        'Card API key is not configured',
      );
    }

    const isUSEnv = this.userCardLocation === 'us';
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
  }): Promise<CardLoginResponse> => {
    const { email, password } = body;

    const response = await this.makeRequest(
      '/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
        }),
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

      if (response.status === 422) {
        const error = new CardError(
          CardErrorType.VALIDATION_ERROR,
          'Invalid email or password, check your credentials and try again.',
        );
        Logger.log(
          error,
          `CardSDK: Invalid email or password during login. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw error;
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

  authorize = async (body: {
    initiateAccessToken: string;
    loginAccessToken: string;
  }): Promise<CardAuthorizeResponse> => {
    const { initiateAccessToken, loginAccessToken } = body;
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

  getCardDetails = async (): Promise<CardDetailsResponse> => {
    const response = await this.makeRequest(
      '/v1/card/status',
      { method: 'GET' },
      true,
    );

    if (!response.ok) {
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

  getCardExternalWalletDetails =
    async (): Promise<CardExternalWalletDetailsResponse> => {
      const promises = [
        this.makeRequest('/v1/wallet/external', { method: 'GET' }, true),
        this.makeRequest(
          '/v1/wallet/external/priority',
          { method: 'GET' },
          true,
        ),
      ];

      const responses = await Promise.all(promises);

      if (!responses[0].ok || !responses[1].ok) {
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

      const combinedDetails = externalWalletDetails.map(
        (wallet: CardWalletExternalResponse) => {
          const priorityWallet = priorityWalletDetails.find(
            (p: CardWalletExternalPriorityResponse) =>
              p?.currency === wallet?.currency &&
              p?.network?.toLowerCase() === wallet?.network?.toLowerCase(),
          );
          const supportedTokens = this.getSupportedTokensByChainId(
            this.mapAPINetworkToCaipChainId(wallet.network),
          );
          const tokenDetails = this.mapSupportedTokenToCardToken(
            supportedTokens.find(
              (token) =>
                token.symbol?.toLowerCase() === wallet.currency?.toLowerCase(),
            ) ?? supportedTokens[0],
          );

          return {
            id: priorityWallet?.id ?? 0,
            walletAddress: wallet.address,
            currency: wallet.currency,
            balance: wallet.balance,
            allowance: wallet.allowance,
            priority: priorityWallet?.priority ?? 0,
            chainId: this.mapAPINetworkToAssetChainId(wallet.network),
            tokenDetails,
          } as CardExternalWalletDetail;
        },
      );

      // Sort - lower number = higher priority
      return combinedDetails.sort((a, b) => a.priority - b.priority);
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
        // If we can't parse response, continue without it
      }

      throw new CardError(
        CardErrorType.SERVER_ERROR,
        'Failed to provision card. Please try again.',
      );
    }

    return (await response.json()) as { success: boolean };
  };

  private mapAPINetworkToCaipChainId(network: 'linea' | 'solana'): CaipChainId {
    switch (network) {
      case 'solana':
        return SOLANA_MAINNET.chainId;
      default:
        return this.lineaChainId;
    }
  }

  private mapAPINetworkToAssetChainId(network: 'linea' | 'solana'): string {
    switch (network) {
      case 'solana':
        return SOLANA_MAINNET.chainId;
      default:
        return LINEA_CHAIN_ID; // Asset only supports HEX chainId on EVM assets.
    }
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

    const logsPerToken = await Promise.all(
      nonZeroBalanceTokensAddresses.map((tokenAddress) =>
        this.ethersProvider
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
