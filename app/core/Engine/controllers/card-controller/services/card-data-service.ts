import { ethers } from 'ethers';
import Logger from '../../../../../util/Logger';
import { getDecimalChainId } from '../../../../../util/networks';
import { LINEA_DEFAULT_RPC_URL } from '../../../../../constants/urls';
import { BALANCE_SCANNER_ABI } from '../../../../../components/UI/Card/constants';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from '../../../../../components/UI/Card/util/mapBaanxApiUrl';
import { getCardBaanxToken } from '../../../../../components/UI/Card/util/cardTokenVault';
import type { CaipAccountId } from '@metamask/utils';
import type {
  CardFeatureFlag,
  SupportedToken,
  CardToken,
  CardDetailsResponse,
  CardExchangeTokenResponse,
  CardExchangeTokenRawResponse,
  CardLoginResponse,
  CardLoginInitiateResponse,
  CardAuthorizeResponse,
  CardExternalWalletDetailsResponse,
  CardExternalWalletDetail,
  GetPriorityTokenParams,
  GetSupportedTokensAllowancesParams,
  GetCardDetailsParams,
  GetExternalWalletDetailsParams,
  AuthenticateParams,
  InitiateLoginParams,
  ExchangeTokenParams,
  AuthorizeParams,
  CheckCardholderParams,
  GetGeoLocationParams,
  RefreshTokenParams,
} from '../types';

// Default timeout for all API requests (10 seconds)
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

/**
 * Card data service that handles all API calls and on-chain operations
 * This service is used by CardController to perform data operations
 */
export class CardDataService {
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

  // Getters for feature flags and supported tokens
  get isBaanxLoginEnabled(): boolean {
    return this.cardFeatureFlag?.isBaanxLoginEnabled ?? false;
  }

  get isCardEnabled(): boolean {
    return (
      this.cardFeatureFlag?.chains?.[`eip155:${this.chainId}`]?.enabled || false
    );
  }

  get supportedTokens(): SupportedToken[] {
    if (!this.isCardEnabled) {
      return [];
    }

    const tokens =
      this.cardFeatureFlag?.chains?.[`eip155:${this.chainId}`]?.tokens;

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
      this.cardFeatureFlag?.chains?.[`eip155:${this.chainId}`]
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
    return new ethers.providers.JsonRpcProvider(LINEA_DEFAULT_RPC_URL);
  }

  private get balanceScannerInstance() {
    const balanceScannerAddress =
      this.cardFeatureFlag?.chains?.[`eip155:${this.chainId}`]
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
    const onRampApi = this.cardFeatureFlag?.constants?.onRampApiUrl;

    if (!onRampApi) {
      throw new Error('On Ramp API URL is not defined for the current chain');
    }

    return onRampApi;
  }

  private get accountsApiUrl() {
    const accountsApi = this.cardFeatureFlag?.constants?.accountsApiUrl;

    if (!accountsApi) {
      throw new Error('Accounts API URL is not defined for the current chain');
    }

    return accountsApi;
  }

  private logDebugInfo(fnName: string, data: unknown) {
    if (this.enableLogs) {
      Logger.log(
        `CardDataService Debug Log - ${fnName}`,
        JSON.stringify(data, null, 2),
      );
    }
  }

  private getBaanxApiBaseUrl() {
    // Always using URL from env var if set
    if (process.env.BAANX_API_URL) return process.env.BAANX_API_URL;
    // Otherwise using default per-env URL
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
      throw new Error('Card API key is not configured');
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
        throw new Error('Request timed out. Please check your connection.');
      }

      // Network or other fetch errors
      if (error instanceof Error) {
        throw new Error('Network error. Please check your connection.');
      }

      throw new Error('An unexpected error occurred.');
    }
  }

  // Cardholder operations
  async checkCardholder(params: CheckCardholderParams): Promise<string[]> {
    const { accounts } = params;

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
  }

  private async performCardholderRequest(
    accountIds: CaipAccountId[],
  ): Promise<string[]> {
    try {
      const url = this.buildCardholderApiUrl(accountIds);
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();
      this.logDebugInfo('performCardholderRequest', data);
      return data.is || [];
    } catch (error) {
      Logger.log(
        error as Error,
        'CardDataService: Failed to check if address is a card holder',
      );
      return [];
    }
  }

  private buildCardholderApiUrl(accountIds: CaipAccountId[]): URL {
    const url = new URL('v1/metadata', this.accountsApiUrl);
    url.searchParams.set('accountIds', accountIds.join(',').toLowerCase());
    url.searchParams.set('label', 'card_user');
    return url;
  }

  private async processBatchedCardholderRequests(
    accounts: CaipAccountId[],
    batchSize: number,
    maxBatches: number,
  ): Promise<string[]> {
    const batches = this.createAccountBatches(accounts, batchSize, maxBatches);
    const batchPromises = batches.map((batch) =>
      this.performCardholderRequest(batch),
    );

    const results = await Promise.all(batchPromises);
    const allCardholderAccounts = results.flatMap((result) => result);
    this.logDebugInfo(
      'processBatchedCardholderRequests',
      allCardholderAccounts,
    );

    return allCardholderAccounts;
  }

  private createAccountBatches(
    accounts: CaipAccountId[],
    batchSize: number,
    maxBatches: number,
  ): CaipAccountId[][] {
    const batches: CaipAccountId[][] = [];
    let remainingAccounts = accounts;

    while (remainingAccounts.length > 0 && batches.length < maxBatches) {
      const batch = remainingAccounts.slice(0, batchSize);
      remainingAccounts = remainingAccounts.slice(batchSize);
      batches.push(batch);
    }

    return batches;
  }

  // Geolocation operations
  async getGeoLocation(_params: GetGeoLocationParams): Promise<string> {
    try {
      const url = new URL('geolocation', this.rampApiUrl);
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error('Failed to fetch geolocation');
      }

      return await response.text();
    } catch (error) {
      Logger.log(error as Error, 'CardDataService: Failed to get geolocation');
      return '';
    }
  }

  // Token allowances operations
  async getSupportedTokensAllowances(
    params: GetSupportedTokensAllowancesParams,
  ): Promise<
    {
      address: string;
      usAllowance: string;
      globalAllowance: string;
    }[]
  > {
    const { address } = params;

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
        address: tokenAddress || '',
        usAllowance: usAllowance.toString(),
        globalAllowance: globalAllowance.toString(),
      };
    });
  }

  // Priority token operations
  async getPriorityToken(
    params: GetPriorityTokenParams,
  ): Promise<CardToken | null> {
    const { address } = params;

    if (!this.isCardEnabled) {
      throw new Error('Card feature is not enabled for this chain');
    }

    // For API data source, we would need to implement API call
    // For now, implementing on-chain logic
    const nonZeroBalanceTokens = await this.getNonZeroBalanceTokens(address);

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
  }

  private async getNonZeroBalanceTokens(_address: string): Promise<string[]> {
    // This would need to be implemented based on your existing logic
    // For now, returning empty array as placeholder
    return [];
  }

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

  // Authentication operations
  async initiateLogin(
    params: InitiateLoginParams,
  ): Promise<CardLoginInitiateResponse> {
    if (!this.cardBaanxApiKey) {
      throw new Error('Card API key is not configured');
    }

    const { state, codeChallenge, location } = params;
    const queryParamsString = new URLSearchParams();
    queryParamsString.set('client_id', this.cardBaanxApiKey);
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
      let responseBody = null;
      try {
        responseBody = await response.text();
      } catch {
        // If we can't parse response, continue without it
      }

      Logger.log(
        `CardDataService: Failed to initiate authentication. Status: ${response.status}, Response: ${responseBody}`,
      );
      throw new Error('Failed to initiate authentication. Please try again.');
    }

    const data = await response.json();
    return data as CardLoginInitiateResponse;
  }

  async authenticate(params: AuthenticateParams): Promise<CardLoginResponse> {
    const { email, password, location } = params;

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
      let responseBody = null;
      try {
        responseBody = await response.json();
      } catch {
        // If we can't parse response, continue without it
      }

      if (response.status === 422) {
        Logger.log(
          `CardDataService: Invalid email or password during login. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw new Error(
          'Invalid email or password, check your credentials and try again.',
        );
      }

      if ([401, 403, 404].includes(response.status)) {
        Logger.log(
          `CardDataService: Invalid credentials during login. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw new Error('Invalid login details');
      }

      if (response.status >= 500) {
        Logger.log(
          `CardDataService: Server error during login. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw new Error('Server error. Please try again later.');
      }

      Logger.log(
        `CardDataService: Unknown error during login. Status: ${response.status}`,
        JSON.stringify(responseBody, null, 2),
      );
      throw new Error('Login failed. Please try again.');
    }

    const data = await response.json();
    return data as CardLoginResponse;
  }

  async authorize(params: AuthorizeParams): Promise<CardAuthorizeResponse> {
    const { initiateAccessToken, loginAccessToken, location } = params;
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
      let responseBody = null;
      try {
        responseBody = await response.text();
      } catch {
        // If we can't parse response, continue without it
      }

      if ([401, 403].includes(response.status)) {
        Logger.log(
          `CardDataService: Authorization failed - invalid credentials. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw new Error('Authorization failed. Please try logging in again.');
      }

      Logger.log(
        `CardDataService: Authorization failed. Status: ${response.status}`,
        JSON.stringify(responseBody, null, 2),
      );
      throw new Error('Authorization failed. Please try again.');
    }

    const data = await response.json();
    return data as CardAuthorizeResponse;
  }

  async exchangeToken(
    params: ExchangeTokenParams,
  ): Promise<CardExchangeTokenResponse> {
    let requestBody = null;

    if (params.grantType === 'authorization_code') {
      requestBody = {
        code: params.code,
        code_verifier: params.codeVerifier,
        grant_type: params.grantType,
        redirect_uri: 'https://example.com',
      };
    } else {
      requestBody = {
        grant_type: params.grantType,
        refresh_token: params.code,
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
      params.location === 'us',
    );

    if (!response.ok) {
      let responseBody = null;
      try {
        responseBody = await response.text();
      } catch {
        // If we can't parse response, continue without it
      }

      if ([401, 403].includes(response.status)) {
        Logger.log(
          `CardDataService: Token exchange failed - invalid credentials. Status: ${response.status}`,
          JSON.stringify(responseBody, null, 2),
        );
        throw new Error('Token exchange failed. Please try logging in again.');
      }

      Logger.log(
        `CardDataService: Token exchange failed. Status: ${response.status}`,
        JSON.stringify(responseBody, null, 2),
      );
      throw new Error('Token exchange failed. Please try again.');
    }

    const data = (await response.json()) as CardExchangeTokenRawResponse;

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
      refreshTokenExpiresIn: data.refresh_token_expires_in,
    } as CardExchangeTokenResponse;
  }

  async refreshToken(
    params: RefreshTokenParams,
  ): Promise<CardExchangeTokenResponse> {
    const { refreshToken, location } = params;
    return await this.exchangeToken({
      code: refreshToken,
      grantType: 'refresh_token',
      location,
    });
  }

  // Card details operations
  async getCardDetails(
    _params: GetCardDetailsParams,
  ): Promise<CardDetailsResponse> {
    const response = await this.makeRequest(
      '/v1/card/status',
      { method: 'GET' },
      true,
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('User has no card. Request a card first.');
      }

      const errorResponse = await response.json();
      Logger.log(errorResponse, 'Failed to get card details.');
      throw new Error('Failed to get card details. Please try again.');
    }

    return (await response.json()) as CardDetailsResponse;
  }

  async getExternalWalletDetails(
    _params: GetExternalWalletDetailsParams,
  ): Promise<CardExternalWalletDetailsResponse> {
    Logger.log('CardDataService: getExternalWalletDetails');
    const promises = [
      this.makeRequest('/v1/wallet/external', { method: 'GET' }, true),
      this.makeRequest('/v1/wallet/external/priority', { method: 'GET' }, true),
    ];

    const responses = await Promise.all(promises);

    if (!responses[0].ok || !responses[1].ok) {
      const errorResponse = await responses[0].json();
      Logger.log(errorResponse, 'Failed to get card external wallet details.');
      throw new Error(
        'Failed to get card external wallet details. Please try again.',
      );
    }

    const externalWalletDetails = await responses[0].json();
    const priorityWalletDetails = await responses[1].json();

    const combinedDetails = externalWalletDetails.map(
      (wallet: CardExternalWalletDetail) => {
        const priorityWallet = priorityWalletDetails.find(
          (p: CardExternalWalletDetail) =>
            p?.address?.toLowerCase() === wallet?.address?.toLowerCase(),
        );
        return {
          ...wallet,
          walletAddress: wallet.address,
          priority: priorityWallet?.priority ?? 0,
          id: priorityWallet?.id ?? 0,
        };
      },
    );

    return combinedDetails as CardExternalWalletDetailsResponse;
  }
}
