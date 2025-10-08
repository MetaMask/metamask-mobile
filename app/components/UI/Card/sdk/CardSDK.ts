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
  CardExchangeTokenRawResponse,
  CardExchangeTokenResponse,
  CardLoginInitiateResponse,
  CardLoginResponse,
  CardToken,
} from '../types';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from '../util/mapBaanxApiUrl';
import { getCardBaanxToken } from '../util/cardTokenVault';

// Default timeout for all API requests (10 seconds)
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

// The CardSDK class provides methods to interact with the Card feature
// and check if an address is a card holder, get supported tokens, and more.
// This implements a mimic of the Ramps SDK, but for the Card feature.
// Ideally it should be separated into its own package in the future.
export class CardSDK {
  private cardFeatureFlag: CardFeatureFlag;
  private chainId: string | number;
  private enableLogs: boolean;
  private cardBaanxApiBaseUrl: string;
  private cardBaanxApiKey: string | undefined;

  constructor({
    cardFeatureFlag,
    enableLogs = false,
  }: {
    cardFeatureFlag: CardFeatureFlag;
    enableLogs?: boolean;
  }) {
    this.cardFeatureFlag = cardFeatureFlag;
    this.chainId = getDecimalChainId(LINEA_CHAIN_ID);
    this.enableLogs = enableLogs;
    this.cardBaanxApiBaseUrl = this.getBaanxApiBaseUrl();
    this.cardBaanxApiKey = process.env.MM_CARD_BAANX_API_CLIENT_KEY;
  }

  get isBaanxLoginEnabled(): boolean {
    return this.cardFeatureFlag?.isBaanxLoginEnabled ?? false;
  }

  get isCardEnabled(): boolean {
    return (
      this.cardFeatureFlag.chains?.[`eip155:${this.chainId}`]?.enabled || false
    );
  }

  get supportedTokens(): SupportedToken[] {
    if (!this.isCardEnabled) {
      return [];
    }

    const tokens =
      this.cardFeatureFlag.chains?.[`eip155:${this.chainId}`]?.tokens;

    if (!tokens) {
      return [];
    }

    return tokens.filter(
      (token): token is SupportedToken =>
        token &&
        typeof token.address === 'string' &&
        ethers.utils.isAddress(token.address) &&
        token.enabled !== false,
    );
  }

  private get foxConnectAddresses() {
    const foxConnect =
      this.cardFeatureFlag.chains?.[`eip155:${this.chainId}`]
        ?.foxConnectAddresses;

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
      this.cardFeatureFlag.chains?.[`eip155:${this.chainId}`]
        ?.balanceScannerAddress;

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

  private get rampApiUrl() {
    const onRampApi = this.cardFeatureFlag.constants?.onRampApiUrl;

    if (!onRampApi) {
      throw new Error('On Ramp API URL is not defined for the current chain');
    }

    return onRampApi;
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
      Logger.error(
        error as Error,
        'Failed to check if address is a card holder',
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
      const url = new URL('geolocation', this.rampApiUrl);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch geolocation');
      }

      return await response.text();
    } catch (error) {
      Logger.error(error as Error, 'Failed to get geolocation');
      return '';
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

    const supportedTokensAddresses = this.supportedTokens.map(
      (token) => token.address,
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
    isUSEnv: boolean = false,
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<Response> {
    const apiKey = this.cardBaanxApiKey;

    if (!apiKey) {
      throw new Error('Card Baanx API key is not defined');
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'x-us-env': isUSEnv ? 'true' : 'false',
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
      console.warn('Failed to retrieve bearer token:', error);
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
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }

      throw error;
    }
  }

  initiateCardProviderAuthentication = async (queryParams: {
    state: string;
    codeChallenge: string;
    location: 'us' | 'international';
  }): Promise<CardLoginInitiateResponse> => {
    if (!this.cardBaanxApiKey) {
      throw new Error('Card Baanx API key is not defined');
    }

    const { state, codeChallenge, location } = queryParams;
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
      location === 'us',
    );

    if (!response.ok) {
      throw new Error('Failed to initiate card provider authentication');
    }

    const data = await response.json();
    return data as CardLoginInitiateResponse;
  };

  login = async (body: {
    email: string;
    password: string;
    location: 'us' | 'international';
  }): Promise<CardLoginResponse> => {
    const { email, password, location } = body;
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
      location === 'us',
    );

    if (!response.ok) {
      throw new Error('Failed to login');
    }

    const data = await response.json();
    return data as CardLoginResponse;
  };

  authorize = async (body: {
    initiateAccessToken: string;
    loginAccessToken: string;
    location: 'us' | 'international';
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
      location === 'us',
    );

    if (!response.ok) {
      throw new Error('Failed to authorize');
    }

    const data = await response.json();
    return data as CardAuthorizeResponse;
  };

  exchangeToken = async (body: {
    code?: string;
    codeVerifier?: string;
    grantType: 'authorization_code' | 'refresh_token';
    location: 'us' | 'international';
  }): Promise<CardExchangeTokenResponse> => {
    const response = await this.makeRequest(
      '/v1/auth/oauth/token',
      {
        method: 'POST',
        body: JSON.stringify({
          code: body.code,
          code_verifier: body.codeVerifier,
          grant_type: body.grantType,
          redirect_uri: 'https://example.com',
        }),
        headers: {
          'x-secret-key': this.cardBaanxApiKey || '',
        },
      },
      false,
      body.location === 'us',
    );

    if (!response.ok) {
      throw new Error('Failed to exchange token');
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

  refreshLocalToken = async (
    refreshToken: string,
    location: 'us' | 'international',
  ): Promise<CardExchangeTokenResponse> => {
    const tokenResponse = await this.exchangeToken({
      code: refreshToken,
      grantType: 'refresh_token',
      location,
    });

    return tokenResponse;
  };

  private getFirstSupportedTokenOrNull(): CardToken | null {
    return this.supportedTokens.length > 0
      ? this.mapSupportedTokenToCardToken(this.supportedTokens[0])
      : null;
  }

  private findSupportedTokenByAddress(tokenAddress: string): CardToken | null {
    const match = this.supportedTokens.find(
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
