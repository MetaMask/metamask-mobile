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
  CardWalletExternalPriorityResponse,
  CardWalletExternalResponse,
  ChainConfigResponse,
  ChainConfigNetwork,
  CachedChainConfig,
  CachedNetworkConfig,
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
  private cachedChainConfig: CachedChainConfig | null = null;
  private cachedNetworkConfigs: Record<string, CachedNetworkConfig> | null =
    null;
  private cachedTokenAddresses: Record<
    string,
    { address: string; timestamp: number; expiresAt: number }
  > | null = null;
  private cachedSpenderAddresses: Record<
    string,
    { address: string; timestamp: number; expiresAt: number }
  > | null = null;

  /**
   * Cache utility for token and spender addresses
   */
  private getCachedAddress = (
    cache: Record<
      string,
      { address: string; timestamp: number; expiresAt: number }
    > | null,
    key: string,
    logContext: { method: string; key: string; [key: string]: unknown },
  ): string | null => {
    if (cache?.[key] && Date.now() < cache[key].expiresAt) {
      this.logDebugInfo(logContext.method, {
        source: 'cache',
        ...logContext,
        cachedAt: new Date(cache[key].timestamp).toISOString(),
      });
      return cache[key].address;
    }
    return null;
  };

  private setCachedAddress = (
    cache: Record<
      string,
      { address: string; timestamp: number; expiresAt: number }
    > | null,
    key: string,
    address: string,
    durationMs: number,
    logContext: { method: string; key: string; [key: string]: unknown },
  ): Record<
    string,
    { address: string; timestamp: number; expiresAt: number }
  > => {
    const newCache = cache || {};
    newCache[key] = {
      address,
      timestamp: Date.now(),
      expiresAt: Date.now() + durationMs,
    };

    this.logDebugInfo(logContext.method, {
      source: 'api',
      ...logContext,
      cached: true,
    });

    return newCache;
  };

  /**
   * Cache utility for network configurations
   */
  private getCachedNetworkConfig = (
    cache: Record<string, CachedNetworkConfig> | null,
    key: string,
    logContext: { method: string; key: string; [key: string]: unknown },
  ): ChainConfigNetwork | null => {
    if (cache?.[key] && Date.now() < cache[key].expiresAt) {
      this.logDebugInfo(logContext.method, {
        source: 'cache',
        ...logContext,
        cachedAt: new Date(cache[key].timestamp).toISOString(),
      });
      return cache[key].config;
    }
    return null;
  };

  private setCachedNetworkConfig = (
    cache: Record<string, CachedNetworkConfig> | null,
    key: string,
    config: ChainConfigNetwork,
    durationMs: number,
    logContext: { method: string; key: string; [key: string]: unknown },
  ): Record<string, CachedNetworkConfig> => {
    const newCache = cache || {};
    newCache[key] = {
      config,
      timestamp: Date.now(),
      expiresAt: Date.now() + durationMs,
    };

    this.logDebugInfo(logContext.method, {
      source: 'api',
      ...logContext,
      cached: true,
    });

    return newCache;
  };

  constructor({
    cardFeatureFlag,
    userCardLocation,
    enableLogs = false,
    currentChainId,
  }: {
    cardFeatureFlag: CardFeatureFlag;
    userCardLocation?: CardLocation;
    enableLogs?: boolean;
    currentChainId?: CaipChainId;
  }) {
    this.cardFeatureFlag = cardFeatureFlag;
    this.enableLogs = enableLogs;
    this.cardBaanxApiBaseUrl = this.getBaanxApiBaseUrl();
    this.cardBaanxApiKey = process.env.MM_CARD_BAANX_API_CLIENT_KEY;
    this.lineaChainId =
      currentChainId || `eip155:${getDecimalChainId(LINEA_CHAIN_ID)}`;
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

  /**
   * Fetches supported tokens from the Baanx API /v1/delegation/chain/config endpoint
   * This is the source of truth for supported tokens
   */
  async getSupportedTokensFromChainConfig(): Promise<SupportedToken[]> {
    try {
      const chainConfig = await this.getChainConfig();

      // Find the network that matches our current chain ID
      const currentChainId = this.getCurrentChainId();
      const decimalChainId = currentChainId.replace('eip155:', '');

      const network = chainConfig.networks.find(
        (net) => net.chainId === decimalChainId,
      );

      if (!network?.tokens) {
        // Fallback to feature flag tokens when chain config doesn't have the network
        const fallbackTokens = this.getSupportedTokensByChainId(
          this.getCurrentChainId(),
        );
        return fallbackTokens;
      }

      // Convert the tokens to SupportedToken format
      const supportedTokens: SupportedToken[] = Object.entries(
        network.tokens,
      ).map(([, tokenData]) => ({
        address: tokenData.address,
        symbol: tokenData.symbol.toUpperCase(),
        name: tokenData.symbol.toUpperCase(),
        decimals: tokenData.decimals,
        enabled: true, // All tokens from chain config are enabled
      }));

      return supportedTokens;
    } catch (error) {
      console.error('Failed to fetch tokens from chain config:', error);

      // Fallback to feature flag tokens
      const fallbackTokens = this.getSupportedTokensByChainId(
        this.getCurrentChainId(),
      );
      return fallbackTokens;
    }
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
    // Use the current chain ID instead of hardcoded lineaChainId
    const currentChainId = this.getCurrentChainId();
    const balanceScannerAddress =
      this.cardFeatureFlag.chains?.[currentChainId]?.balanceScannerAddress;

    this.logDebugInfo('balanceScannerInstance', {
      currentChainId,
      availableChains: Object.keys(this.cardFeatureFlag.chains || {}),
      balanceScannerAddress,
      chainConfig: this.cardFeatureFlag.chains?.[currentChainId],
    });

    if (!balanceScannerAddress) {
      throw new Error(
        `Balance scanner address is not defined for chain ${currentChainId}. Available chains: ${Object.keys(
          this.cardFeatureFlag.chains || {},
        ).join(', ')}`,
      );
    }

    return new ethers.Contract(
      balanceScannerAddress,
      BALANCE_SCANNER_ABI,
      this.ethersProvider,
    );
  }

  private getCurrentChainId(): CaipChainId {
    // Use the chain ID passed to the constructor (current network)
    // This will be the actual network the user is connected to
    this.logDebugInfo('getCurrentChainId', {
      currentChainId: this.lineaChainId,
      balanceScannerAddress:
        this.cardFeatureFlag.chains?.[this.lineaChainId]?.balanceScannerAddress,
    });
    return this.lineaChainId;
  }

  private getCurrentNetwork(): 'linea' | 'solana' {
    const chainId = this.getCurrentChainId();

    if (chainId.startsWith('solana:')) {
      return 'solana';
    }

    return 'linea';
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

  getAuthenticatedTokensAllowances = async (
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

    const supportedTokensAddresses: string[] = [];
    let globalSpenderAddress: string;
    let usSpenderAddress: string;

    try {
      const currentNetwork = this.getCurrentNetwork();
      const networkConfig = await this.getNetworkConfig(currentNetwork);

      const tokenEntries = Object.entries(networkConfig.tokens);
      for (const [, tokenData] of tokenEntries) {
        if (tokenData?.address) {
          supportedTokensAddresses.push(tokenData.address);
        }
      }

      globalSpenderAddress = networkConfig.delegationContract;
      usSpenderAddress = networkConfig.delegationContract;

      this.logDebugInfo('getAuthenticatedTokensAllowances', {
        source: 'chainConfig',
        tokenAddresses: supportedTokensAddresses,
        globalSpenderAddress,
        usSpenderAddress,
      });
    } catch (error) {
      const supportedTokens = this.getSupportedTokensByChainId(
        this.lineaChainId,
      );
      for (const token of supportedTokens) {
        supportedTokensAddresses.push(token.address || '');
      }

      const { global: foxConnectGlobalAddress, us: foxConnectUsAddress } =
        this.foxConnectAddresses;
      globalSpenderAddress = foxConnectGlobalAddress;
      usSpenderAddress = foxConnectUsAddress;

      this.logDebugInfo('getAuthenticatedTokensAllowances', {
        fallback: 'feature flag addresses',
        supportedTokensAddresses,
        globalSpenderAddress,
        usSpenderAddress,
      });
    }

    if (supportedTokensAddresses.length === 0) {
      return [];
    }

    const spenders: string[][] = supportedTokensAddresses.map(() => [
      globalSpenderAddress,
      usSpenderAddress,
    ]);

    const spendersAllowancesForTokens: [boolean, string][][] =
      await this.balanceScannerInstance.spendersAllowancesForTokens(
        address,
        supportedTokensAddresses,
        spenders,
      );
    this.logDebugInfo(
      'getAuthenticatedTokensAllowances',
      spendersAllowancesForTokens,
    );

    return supportedTokensAddresses.map((tokenAddress, index) => {
      const [globalAllowanceTuple, usAllowanceTuple] =
        spendersAllowancesForTokens[index];

      // Debug logging
      this.logDebugInfo('getSupportedTokensAllowances', {
        tokenAddress,
        globalAllowanceTuple,
        usAllowanceTuple,
        index,
      });

      // Handle empty or invalid allowance data
      let globalAllowanceValue = globalAllowanceTuple[1] || '0x0';
      let usAllowanceValue = usAllowanceTuple[1] || '0x0';

      // Fix invalid hex strings before creating BigNumber
      if (globalAllowanceValue === '0x' || globalAllowanceValue === '') {
        this.logDebugInfo('getSupportedTokensAllowances', {
          warning: 'Invalid global allowance value, using 0x0',
          value: globalAllowanceValue,
          tokenAddress,
        });
        globalAllowanceValue = '0x0';
      }

      if (usAllowanceValue === '0x' || usAllowanceValue === '') {
        this.logDebugInfo('getSupportedTokensAllowances', {
          warning: 'Invalid us allowance value, using 0x0',
          value: usAllowanceValue,
          tokenAddress,
        });
        usAllowanceValue = '0x0';
      }

      const globalAllowance = ethers.BigNumber.from(globalAllowanceValue);
      const usAllowance = ethers.BigNumber.from(usAllowanceValue);

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
      return this.getFirstSupportedTokenFromChainConfig();
    }

    if (nonZeroBalanceTokens.length === 1) {
      this.logDebugInfo('getPriorityToken (Simple Case 2)', {
        address,
        nonZeroBalanceTokens,
      });
      return this.findSupportedTokenByAddressFromChainConfig(
        nonZeroBalanceTokens[0],
      );
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
    if (process.env.BAANX_API_URL) {
      return process.env.BAANX_API_URL;
    }
    // otherwise using default per-env url
    const defaultUrl = getDefaultBaanxApiBaseUrlForMetaMaskEnv(
      process.env.METAMASK_ENVIRONMENT,
    );
    return defaultUrl;
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

    return;
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
        this.makeRequest(`/v1/wallet/external`, { method: 'GET' }, true),
        this.makeRequest(
          `/v1/wallet/external/priority`,
          { method: 'GET' },
          true,
        ),
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
          // If we can't parse response, continue without it
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

  updateWalletPriority = async (
    wallets: { id: number; priority: number }[],
  ): Promise<void> => {
    if (!this.isCardEnabled) {
      throw new Error('Card feature is not enabled for this chain');
    }

    this.logDebugInfo('updateWalletPriority', { wallets });

    const requestBody = { wallets };
    Logger.log('CardSDK: Updating wallet priority with body:', requestBody);

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

    Logger.log('CardSDK: Priority update response status:', response.status);

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

    const responseData = await response.json();
    Logger.log('CardSDK: Priority update successful response:', responseData);
    this.logDebugInfo(
      'updateWalletPriority',
      'Successfully updated wallet priority',
    );
  };

  /**
   * Get platform spender address for delegation
   */
  getPlatformSpenderAddress = async (
    network: 'linea' | 'solana',
  ): Promise<string> => {
    const logContext = {
      method: 'getPlatformSpenderAddress',
      key: network,
      network,
    };

    // Check cache first
    const cachedAddress = this.getCachedAddress(
      this.cachedSpenderAddresses,
      network,
      logContext,
    );
    if (cachedAddress) {
      return cachedAddress;
    }

    try {
      // Use chain config API to get the delegation contract address
      const spenderAddress = await this.getDelegationContractAddress(network);

      // Cache the spender address for 1 hour
      this.cachedSpenderAddresses = this.setCachedAddress(
        this.cachedSpenderAddresses,
        network,
        spenderAddress,
        60 * 60 * 1000, // 1 hour
        { ...logContext, source: 'chainConfig' },
      );

      return spenderAddress;
    } catch (error) {
      Logger.log(
        error,
        'CardSDK: Failed to get platform spender address from chain config',
      );

      // Fallback to hardcoded addresses if chain config fails
      try {
        const { global: foxConnectGlobalAddress } = this.foxConnectAddresses;
        const spenderAddress = foxConnectGlobalAddress;

        if (!spenderAddress) {
          throw new Error('FoxConnect global address not available');
        }

        // Cache the fallback address for 1 hour
        this.cachedSpenderAddresses = this.setCachedAddress(
          this.cachedSpenderAddresses,
          network,
          spenderAddress,
          60 * 60 * 1000, // 1 hour
          { ...logContext, source: 'foxConnectAddresses_fallback' },
        );

        return spenderAddress;
      } catch (fallbackError) {
        Logger.log(
          fallbackError,
          'CardSDK: Failed to get platform spender address from fallback',
        );
        throw new CardError(
          CardErrorType.SERVER_ERROR,
          'Failed to get platform spender address. Please try again.',
        );
      }
    }
  };

  /**
   * Generate a delegation token for spending limit increase
   * This is Step 1 of the delegation process
   */
  generateDelegationToken = async (
    network: 'linea' | 'solana',
    address: string,
  ): Promise<{
    token: string;
    expiresAt: string;
    nonce: string;
  }> => {
    const response = await this.makeRequest(
      `/v1/delegation/token?network=${network}&address=${address}`,
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
    network: 'linea' | 'solana';
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

    // Validate transaction hash format (must be valid EVM transaction hash)
    const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
    if (!txHashRegex.test(params.txHash)) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Invalid transaction hash format',
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
   * Get blockchain configuration for delegation
   * This fetches chain IDs, token contract addresses, and delegation contract addresses
   */
  getChainConfig = async (
    network?: 'linea' | 'solana',
  ): Promise<ChainConfigResponse> => {
    // Check if we have a valid cached config
    if (
      this.cachedChainConfig &&
      Date.now() < this.cachedChainConfig.expiresAt
    ) {
      this.logDebugInfo('getChainConfig', {
        source: 'cache',
        network,
        cachedAt: new Date(this.cachedChainConfig.timestamp).toISOString(),
      });
      return this.cachedChainConfig.config;
    }

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
          'Failed to get chain configuration. Please try again.',
        );
        Logger.log(
          error,
          `CardSDK: Failed to get chain configuration. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw error;
      }

      const configData = await response.json();
      this.logDebugInfo('getChainConfig', {
        source: 'api',
        network,
        configData,
      });

      // Validate the configuration before caching
      this.validateChainConfig(configData);

      // Cache the config for 1 hour
      this.cachedChainConfig = {
        config: configData,
        timestamp: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
      };

      return configData;
    } catch (error) {
      Logger.log(error, 'CardSDK: Failed to get chain configuration from API');
      throw new CardError(
        CardErrorType.SERVER_ERROR,
        'Failed to get chain configuration. Please try again.',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };

  /**
   * Get network configuration for a specific network
   */
  getNetworkConfig = async (
    network: 'linea' | 'solana',
  ): Promise<ChainConfigNetwork> => {
    const cacheKey = `networkConfig_${network}`;
    const logContext = { method: 'getNetworkConfig', key: cacheKey, network };

    // Check cache first
    const cachedConfig = this.getCachedNetworkConfig(
      this.cachedNetworkConfigs,
      cacheKey,
      logContext,
    );
    if (cachedConfig) {
      return cachedConfig;
    }

    const config = await this.getChainConfig(network);
    const networkConfig = config.networks.find((n) => n.network === network);

    if (!networkConfig) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        `Network configuration not found for ${network}`,
      );
    }

    // Cache the network config for 5 minutes
    this.cachedNetworkConfigs = this.setCachedNetworkConfig(
      this.cachedNetworkConfigs,
      cacheKey,
      networkConfig,
      5 * 60 * 1000, // 5 minutes
      logContext,
    );

    return networkConfig;
  };

  /**
   * Get token address for a specific network and currency
   */
  getTokenAddress = async (
    network: 'linea' | 'solana',
    currency: string,
  ): Promise<string> => {
    const cacheKey = `${network}_${currency}`;
    const logContext = {
      method: 'getTokenAddress',
      key: cacheKey,
      network,
      currency,
    };

    // Check cache first
    const cachedAddress = this.getCachedAddress(
      this.cachedTokenAddresses,
      cacheKey,
      logContext,
    );
    if (cachedAddress) {
      return cachedAddress;
    }

    const networkConfig = await this.getNetworkConfig(network);
    const tokenAddress = networkConfig.tokens[currency]?.address;

    if (!tokenAddress) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        `Token address not found for ${currency} on ${network}`,
      );
    }

    // Cache the token address for 1 hour
    this.cachedTokenAddresses = this.setCachedAddress(
      this.cachedTokenAddresses,
      cacheKey,
      tokenAddress,
      60 * 60 * 1000, // 1 hour
      logContext,
    );

    return tokenAddress;
  };

  /**
   * Get delegation contract address for a specific network
   */
  getDelegationContractAddress = async (
    network: 'linea' | 'solana',
  ): Promise<string> => {
    const networkConfig = await this.getNetworkConfig(network);

    if (!networkConfig.delegationContract) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        `Delegation contract address not found for ${network}`,
      );
    }

    return networkConfig.delegationContract;
  };

  encodeApproveTransaction = (spender: string, value: string): string => {
    const approvalInterface = new ethers.utils.Interface([
      'function approve(address spender, uint256 value)',
    ]);
    return approvalInterface.encodeFunctionData('approve', [spender, value]);
  };

  /**
   * Clear cached chain configuration
   */
  clearChainConfigCache = (): void => {
    this.cachedChainConfig = null;
    this.cachedNetworkConfigs = null;
    this.cachedTokenAddresses = null;
    this.cachedSpenderAddresses = null;
    this.logDebugInfo('clearChainConfigCache', {
      message:
        'All caches cleared (chain config, network configs, token addresses, spender addresses)',
    });
  };

  /**
   * Validate chain configuration response
   */
  private validateChainConfig = (config: ChainConfigResponse): void => {
    if (!config.networks || !Array.isArray(config.networks)) {
      throw new CardError(
        CardErrorType.VALIDATION_ERROR,
        'Invalid chain configuration: networks array is missing or invalid',
      );
    }

    const supportedNetworks = ['linea', 'solana'];

    for (const network of config.networks) {
      if (!supportedNetworks.includes(network.network)) {
        continue; // Skip unsupported networks
      }

      // Validate required fields
      if (!network.chainId || !network.delegationContract) {
        throw new CardError(
          CardErrorType.VALIDATION_ERROR,
          `Invalid chain configuration for ${network.network}: missing chainId or delegationContract`,
        );
      }

      // Validate token addresses
      if (!network.tokens) {
        throw new CardError(
          CardErrorType.VALIDATION_ERROR,
          `Invalid chain configuration for ${network.network}: tokens object is missing`,
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
            `Invalid chain configuration for ${network.network}: ${tokenSymbol} token is missing or invalid`,
          );
        }

        // Validate address format
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!addressRegex.test(token.address)) {
          throw new CardError(
            CardErrorType.VALIDATION_ERROR,
            `Invalid chain configuration for ${network.network}: ${tokenSymbol} address format is invalid`,
          );
        }
      }

      // Validate delegation contract address format
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!addressRegex.test(network.delegationContract)) {
        throw new CardError(
          CardErrorType.VALIDATION_ERROR,
          `Invalid chain configuration for ${network.network}: delegation contract address format is invalid`,
        );
      }
    }
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

  private async getFirstSupportedTokenFromChainConfig(): Promise<CardToken | null> {
    try {
      const currentNetwork = this.getCurrentNetwork();
      const networkConfig = await this.getNetworkConfig(currentNetwork);

      // Get the first available token from chain config
      const tokenKeys = Object.keys(networkConfig.tokens);
      if (tokenKeys.length > 0) {
        const firstTokenKey = tokenKeys[0];
        const firstToken = networkConfig.tokens[firstTokenKey];
        return {
          address: firstToken.address,
          decimals: firstToken.decimals,
          symbol: firstToken.symbol,
          name: firstToken.symbol, // Use symbol as name if name not available
        };
      }

      this.logDebugInfo('getFirstSupportedTokenFromChainConfig', {
        message: 'No tokens found in chain config',
      });
      return null;
    } catch (error) {
      this.logDebugInfo('getFirstSupportedTokenFromChainConfig', {
        error: error instanceof Error ? error.message : String(error),
        fallback: 'using feature flag',
      });
      // Fallback to feature flag method
      return this.getFirstSupportedTokenOrNull();
    }
  }

  private findSupportedTokenByAddress(tokenAddress: string): CardToken | null {
    const match = this.getSupportedTokensByChainId(this.lineaChainId).find(
      (supportedToken) =>
        supportedToken.address?.toLowerCase() === tokenAddress.toLowerCase(),
    );

    return match ? this.mapSupportedTokenToCardToken(match) : null;
  }

  private async findSupportedTokenByAddressFromChainConfig(
    tokenAddress: string,
  ): Promise<CardToken | null> {
    try {
      const currentNetwork = this.getCurrentNetwork();
      const networkConfig = await this.getNetworkConfig(currentNetwork);

      const tokenEntries = Object.entries(networkConfig.tokens);
      for (const [, tokenData] of tokenEntries) {
        if (
          tokenData &&
          tokenData.address.toLowerCase() === tokenAddress.toLowerCase()
        ) {
          return {
            address: tokenData.address,
            decimals: tokenData.decimals,
            symbol: tokenData.symbol,
            name: tokenData.symbol,
          };
        }
      }

      this.logDebugInfo('findSupportedTokenByAddressFromChainConfig', {
        tokenAddress,
        message: 'Token address not found in chain config',
      });
      return null;
    } catch (error) {
      this.logDebugInfo('findSupportedTokenByAddressFromChainConfig', {
        error: error instanceof Error ? error.message : String(error),
        fallback: 'using feature flag',
      });
      // Fallback to feature flag method
      return this.findSupportedTokenByAddress(tokenAddress);
    }
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
      return this.getFirstSupportedTokenFromChainConfig();
    }

    const lastNonZeroApprovalToken =
      this.findLastNonZeroApprovalToken(approvalLogs);
    return lastNonZeroApprovalToken
      ? this.findSupportedTokenByAddressFromChainConfig(
          lastNonZeroApprovalToken,
        )
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
    if (!token) {
      Logger.log('CardSDK: mapSupportedTokenToCardToken - token is undefined');
      return {
        address: null,
        decimals: null,
        symbol: null,
        name: null,
      };
    }

    // Validate that the token has a valid address before processing
    if (!token.address || token.address === '0x' || token.address.length < 42) {
      Logger.log(
        'CardSDK: mapSupportedTokenToCardToken - invalid token address:',
        token.address,
      );
      return {
        address: null,
        decimals: token.decimals || null,
        symbol: token.symbol || null,
        name: token.name || null,
      };
    }

    return {
      address: token.address,
      decimals: token.decimals || null,
      symbol: token.symbol || null,
      name: token.name || null,
    };
  }
}
