import { ethers } from 'ethers';
import Logger from '../../../../../util/Logger';
import {
  CardExternalWalletDetail,
  CardWalletExternalPriorityResponse,
  CardDetailsResponse,
  CardExchangeTokenRawResponse,
  CardLoginInitiateResponse,
  CardLoginResponse,
  CardAuthorizeResponse,
  DelegationSettingsResponse,
  DelegationSettingsNetwork,
  UserResponse,
  RegistrationSettingsResponse,
  CardLocation,
  CardStatus,
  type CardNetwork,
} from '../../../../../components/UI/Card/types';
import type {
  CardFeatureFlag,
  SupportedToken,
} from '../../../../../selectors/featureFlagController/card';
import {
  ARBITRARY_ALLOWANCE,
  BALANCE_SCANNER_ABI,
  BAANX_MAX_LIMIT,
  SUPPORTED_ASSET_NETWORKS,
  cardNetworkInfos,
  caipChainIdToNetwork,
  SPENDING_LIMIT_UNSUPPORTED_TOKENS,
} from '../../../../../components/UI/Card/constants';
import { isAccountEligibleForProvisioning } from '../../../../../components/UI/Card/pushProvisioning/constants';
import {
  generatePKCEPair,
  generateState,
} from '../../../../../components/UI/Card/util/pkceHelpers';
import { mapCountryToLocation } from '../../../../../components/UI/Card/util/mapCountryToLocation';
import { CardApiError, type BaanxService } from '../services/BaanxService';
import {
  CardAccountStatus,
  CardAction,
  CardAlert,
  CardAuthResult,
  CardAuthSession,
  CardAuthTokens,
  CardCredentials,
  CardDetails,
  CardFundingAsset,
  CardFundingConfig,
  CardHomeData,
  CardProviderCapabilities,
  CardSecureView,
  CardSecureViewParams,
  AuthTokenValidity,
  FundingApprovalParams,
  ICardProvider,
  OnboardingStep,
  OnboardingStepResult,
  RegistrationSettings,
  RegistrationStatus,
  WalletOperations,
  FundingAssetStatus,
  CardProviderError,
  CardProviderErrorCode,
  CashbackWalletResponse,
  CashbackWithdrawEstimationResponse,
  CashbackWithdrawParams,
  CashbackWithdrawResponse,
  emptyCardHomeData,
} from '../provider-types';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const REFRESH_EXPIRY_BUFFER_MS = 60 * 60 * 1000;

// Required by the OAuth API but not validated server-side.
const OAUTH_REDIRECT_URI = 'https://example.com';

const ONBOARDING_ENDPOINTS: Record<string, string> = {
  email_verification: '/v1/auth/register/email/send',
  phone_verification: '/v1/auth/register/phone/send',
  identity_verification: '/v1/auth/register/verification/start',
  personal_details: '/v1/auth/register/details',
  physical_address: '/v1/auth/register/address',
  consent: '/v2/consent/onboarding',
};

function getErrorContext(method: string, extra?: Record<string, unknown>) {
  return {
    tags: { feature: 'card', provider: 'baanx' },
    context: { name: 'BaanxProvider', data: { method, ...extra } },
  };
}

function mapLoginError(error: unknown, hasOtpCode: boolean): CardProviderError {
  if (error instanceof CardApiError) {
    const body =
      typeof error.responseBody === 'string' ? error.responseBody : '';

    if (body.includes('account has been disabled')) {
      return new CardProviderError(
        CardProviderErrorCode.AccountDisabled,
        'Account has been disabled',
        error.statusCode,
      );
    }
    if (error.statusCode === 400 && hasOtpCode) {
      return new CardProviderError(
        CardProviderErrorCode.InvalidOtp,
        'Invalid OTP code',
        400,
      );
    }
    if ([401, 403, 404].includes(error.statusCode)) {
      return new CardProviderError(
        CardProviderErrorCode.InvalidCredentials,
        'Invalid login details',
        error.statusCode,
      );
    }
    if (error.statusCode >= 500) {
      return new CardProviderError(
        CardProviderErrorCode.ServerError,
        'Server error',
        error.statusCode,
      );
    }
    if (error.statusCode === 408) {
      return new CardProviderError(
        CardProviderErrorCode.Timeout,
        'Login request timed out',
        408,
      );
    }
    if (error.statusCode === 0) {
      return new CardProviderError(
        CardProviderErrorCode.Network,
        'Network error during login',
        0,
      );
    }
  }
  return new CardProviderError(
    CardProviderErrorCode.Unknown,
    (error as Error).message ?? 'Login failed',
  );
}

function mapApiError(error: unknown, operation: string): CardProviderError {
  if (error instanceof CardProviderError) return error;
  if (error instanceof CardApiError) {
    if ([401, 403].includes(error.statusCode)) {
      return new CardProviderError(
        CardProviderErrorCode.InvalidCredentials,
        `Authentication failed on ${operation}`,
        error.statusCode,
      );
    }
    if (error.statusCode === 404) {
      return new CardProviderError(
        CardProviderErrorCode.NotFound,
        `Not found: ${operation}`,
        404,
      );
    }
    if (error.statusCode === 409) {
      return new CardProviderError(
        CardProviderErrorCode.Conflict,
        `Conflict on ${operation}`,
        409,
      );
    }
    if (error.statusCode >= 500) {
      return new CardProviderError(
        CardProviderErrorCode.ServerError,
        `Server error on ${operation}`,
        error.statusCode,
      );
    }
    if (error.statusCode === 408) {
      return new CardProviderError(
        CardProviderErrorCode.Timeout,
        `Request timeout on ${operation}`,
        408,
      );
    }
    if (error.statusCode === 0) {
      return new CardProviderError(
        CardProviderErrorCode.Network,
        `Network error on ${operation}`,
        0,
      );
    }
  }
  return new CardProviderError(
    CardProviderErrorCode.Unknown,
    (error as Error).message ?? `Unknown error on ${operation}`,
  );
}

function mapAllowanceToFundingStatus(
  allowanceFloat: number,
): FundingAssetStatus {
  if (allowanceFloat === 0) return FundingAssetStatus.Inactive;
  if (allowanceFloat < ARBITRARY_ALLOWANCE) return FundingAssetStatus.Limited;
  return FundingAssetStatus.Active;
}

export class BaanxProvider implements ICardProvider {
  readonly id = 'baanx' as const;

  readonly capabilities: CardProviderCapabilities = {
    authMethod: 'email_password',
    supportsOTP: true,
    supportsFundingApproval: true,
    supportsFundingLimits: true,
    fundingChains: ['eip155:59144', 'eip155:8453'],
    supportsFreeze: true,
    supportsPushProvisioning: true,
    onboarding: {
      type: 'steps',
      steps: [
        'email_verification',
        'phone_verification',
        'identity_verification',
        'personal_details',
        'physical_address',
        'consent',
      ],
      kycProvider: 'veriff',
    },
    supportsPinView: true,
    supportsCashback: true,
  };

  /**
   * Applies Baanx-specific location overrides:
   * - US users always get PIN view (regardless of base flag).
   * - US users do not have cashback (only available outside the US).
   */
  resolveCapabilities(location: string): CardProviderCapabilities {
    const isUS = location === 'us';
    return {
      ...this.capabilities,
      supportsPinView: isUS || this.capabilities.supportsPinView,
      supportsCashback: !isUS && this.capabilities.supportsCashback,
    };
  }

  private readonly service: BaanxService;
  private readonly cardFeatureFlag: CardFeatureFlag | null;

  constructor({
    service,
    cardFeatureFlag,
  }: {
    service: BaanxService;
    cardFeatureFlag?: CardFeatureFlag;
  }) {
    this.service = service;
    this.cardFeatureFlag = cardFeatureFlag ?? null;
  }

  // -- Auth --

  async initiateAuth(country: string): Promise<CardAuthSession> {
    const location = mapCountryToLocation(country);
    this.service.setLocation(location);

    const state = generateState();
    const { codeVerifier, codeChallenge } = await generatePKCEPair();

    const query = new URLSearchParams({
      client_id: this.service.apiKey,
      client_secret: this.service.apiKey,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      mode: 'api',
      response_type: 'code',
      redirect_uri: OAUTH_REDIRECT_URI,
    }).toString();

    const response = await this.service.get<CardLoginInitiateResponse>(
      `/v1/auth/oauth/authorize/initiate?${query}`,
    );

    return {
      id: response.token,
      currentStep: { type: 'email_password' },
      _metadata: {
        initiateToken: response.token,
        location,
        state,
        codeVerifier,
      },
    };
  }

  async submitCredentials(
    session: CardAuthSession,
    credentials: CardCredentials,
  ): Promise<CardAuthResult> {
    if (credentials.type === 'email_password') {
      return this.handleEmailPassword(session, credentials);
    }
    throw new Error(`Unsupported credential type: ${credentials.type}`);
  }

  async executeStepAction(session: CardAuthSession): Promise<void> {
    const userId = session._metadata.otpUserId as string | undefined;
    if (!userId) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'executeStepAction: session missing otpUserId',
      );
    }
    await this.service.post('/v1/auth/login/otp', { userId });
  }

  async refreshTokens(tokens: CardAuthTokens): Promise<CardAuthTokens> {
    if (!tokens.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.service.request<CardExchangeTokenRawResponse>(
      '/v1/auth/oauth/token',
      {
        method: 'POST',
        body: {
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
        },
        headers: { 'x-secret-key': this.service.apiKey },
      },
    );

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      accessTokenExpiresAt: Date.now() + response.expires_in * 1000,
      refreshTokenExpiresAt:
        Date.now() + response.refresh_token_expires_in * 1000,
      location: tokens.location,
    };
  }

  validateTokens(tokens: CardAuthTokens): AuthTokenValidity {
    const now = Date.now();
    const accessValid =
      tokens.accessTokenExpiresAt > now + TOKEN_EXPIRY_BUFFER_MS;

    if (accessValid) {
      return 'valid';
    }

    if (!tokens.refreshToken) {
      return 'expired';
    }

    const refreshUsable =
      !tokens.refreshTokenExpiresAt ||
      tokens.refreshTokenExpiresAt > now + REFRESH_EXPIRY_BUFFER_MS;

    return refreshUsable ? 'needs_refresh' : 'expired';
  }

  async logout(tokens: CardAuthTokens): Promise<void> {
    await this.service.post('/v1/auth/logout', {}, tokens);
  }

  // -- Card Home Data --

  async getCardHomeData(
    _address: string,
    tokens: CardAuthTokens,
  ): Promise<CardHomeData> {
    try {
      const [delegationSettings, cardDetailsResponse, user] = await Promise.all(
        [
          this.service
            .get<DelegationSettingsResponse>(
              '/v1/delegation/chain/config',
              tokens,
            )
            .catch((err) => {
              Logger.error(
                err as Error,
                getErrorContext('getCardHomeData.delegationSettings'),
              );
              return null;
            }),
          this.service
            .get<CardDetailsResponse>('/v1/card/status', tokens)
            .catch((err) => {
              Logger.error(
                err as Error,
                getErrorContext('getCardHomeData.cardDetails'),
              );
              return null;
            }),
          this.service.get<UserResponse>('/v1/user', tokens).catch((err) => {
            Logger.error(err as Error, getErrorContext('getCardHomeData.user'));
            return null;
          }),
        ],
      );

      const walletDetails = delegationSettings
        ? await this.fetchWalletDetails(tokens)
        : [];

      let fundingAssets = this.mapWalletDetailsToAssets(walletDetails);

      const assetsNeedingOriginalCap = fundingAssets.filter(
        (asset) =>
          asset.status === FundingAssetStatus.Limited &&
          asset.chainId.startsWith('eip155:') &&
          !SPENDING_LIMIT_UNSUPPORTED_TOKENS.includes(
            asset.symbol?.toUpperCase() ?? '',
          ),
      );

      if (assetsNeedingOriginalCap.length > 0) {
        const originalCaps = await Promise.all(
          assetsNeedingOriginalCap.map((asset) =>
            this.#fetchOriginalSpendingCap(asset, delegationSettings),
          ),
        );

        const capsByKey = new Map<string, string>();
        assetsNeedingOriginalCap.forEach((asset, index) => {
          const cap = originalCaps[index];
          if (cap) {
            const key = `${asset.walletAddress}-${asset.symbol}-${asset.chainId}`;
            capsByKey.set(key, cap);
          }
        });

        fundingAssets = fundingAssets.map((asset) => {
          const key = `${asset.walletAddress}-${asset.symbol}-${asset.chainId}`;
          const originalCap = capsByKey.get(key);
          return originalCap
            ? { ...asset, originalSpendingCap: originalCap }
            : asset;
        });
      }

      const primaryFundingAsset = this.pickPrimaryAsset(fundingAssets);

      const card = cardDetailsResponse
        ? this.mapCardDetails(cardDetailsResponse)
        : null;
      const account = user
        ? this.mapAccountStatus(user, cardDetailsResponse)
        : null;
      const alerts = this.buildAlerts(primaryFundingAsset, card, account);
      const actions = this.buildActions(primaryFundingAsset, card, account);

      const availableFundingAssets = this.buildSupportedTokens(
        fundingAssets,
        delegationSettings,
      );

      return {
        primaryFundingAsset,
        fundingAssets,
        availableFundingAssets,
        card,
        account,
        alerts,
        actions,
        delegationSettings,
      };
    } catch (error) {
      Logger.error(error as Error, getErrorContext('getCardHomeData'));
      return emptyCardHomeData();
    }
  }

  // -- Card Operations --

  async getCardDetails(tokens: CardAuthTokens): Promise<CardDetails> {
    try {
      const response = await this.service.get<CardDetailsResponse>(
        '/v1/card/status',
        tokens,
      );
      return this.mapCardDetails(response);
    } catch (error) {
      if (error instanceof CardApiError && error.statusCode === 404) {
        throw new CardProviderError(
          CardProviderErrorCode.NoCard,
          'User has no card',
          404,
        );
      }
      throw mapApiError(error, 'getCardDetails');
    }
  }

  async freezeCard(_cardId: string, tokens: CardAuthTokens): Promise<void> {
    await this.service.post('/v1/card/freeze', {}, tokens);
  }

  async unfreezeCard(_cardId: string, tokens: CardAuthTokens): Promise<void> {
    await this.service.post('/v1/card/unfreeze', {}, tokens);
  }

  async getCardDetailsView(
    tokens: CardAuthTokens,
    params: CardSecureViewParams,
  ): Promise<CardSecureView> {
    const response = await this.service.post<{
      imageUrl: string;
      token: string;
    }>('/v1/card/details/token', { customCss: params.customCss }, tokens);
    return { url: response.imageUrl, token: response.token };
  }

  async getCardPinView(
    tokens: CardAuthTokens,
    params: CardSecureViewParams,
  ): Promise<CardSecureView> {
    const response = await this.service.post<{
      imageUrl: string;
      token: string;
    }>('/v1/card/pin/token', { customCss: params.customCss }, tokens);
    return { url: response.imageUrl, token: response.token };
  }

  // -- Asset Management --

  async updateAssetPriority(
    asset: CardFundingAsset,
    allAssets: CardFundingAsset[],
    tokens: CardAuthTokens,
  ): Promise<void> {
    const assetsWithIds = allAssets.filter((a) => a.externalId);
    if (assetsWithIds.length === 0) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'No wallet IDs available for priority update',
      );
    }

    const sorted = [...assetsWithIds].sort((a, b) => a.priority - b.priority);

    let nextPriority = 2;
    const wallets = sorted.map((a) => ({
      id: a.externalId as number,
      priority:
        a.walletAddress === asset.walletAddress &&
        a.symbol.toLowerCase() === asset.symbol.toLowerCase() &&
        a.chainId === asset.chainId
          ? 1
          : nextPriority++,
    }));

    await this.service.put('/v1/wallet/external/priority', { wallets }, tokens);
  }

  async getFundingConfig(tokens: CardAuthTokens): Promise<CardFundingConfig> {
    const settings = await this.service.get<DelegationSettingsResponse>(
      '/v1/delegation/chain/config',
      tokens,
    );

    const supportedChains = settings.networks
      .filter((n: DelegationSettingsNetwork) =>
        SUPPORTED_ASSET_NETWORKS.includes(
          n.network?.toLowerCase() as CardNetwork,
        ),
      )
      .map((n: DelegationSettingsNetwork) => {
        const info =
          cardNetworkInfos[n.network as keyof typeof cardNetworkInfos];
        return info?.caipChainId ?? `eip155:${n.chainId}`;
      });

    return {
      maxLimit: BAANX_MAX_LIMIT,
      fundingOptions: this.buildFundingOptions(settings),
      supportedChains,
    };
  }

  // -- Funding Approval --

  async approveFunding(
    params: FundingApprovalParams,
    tokens: CardAuthTokens,
    _wallet: WalletOperations,
  ): Promise<void> {
    await this.service.post(
      '/v1/delegation/evm/post-approval',
      {
        walletAddress: params.address,
        amount: params.amount,
        currency: params.currency,
        network: params.network,
        faucet: params.faucet ?? false,
      },
      tokens,
    );
  }

  // -- Onboarding --

  async getRegistrationSettings(
    country: string,
  ): Promise<RegistrationSettings> {
    this.service.setLocation(mapCountryToLocation(country));
    const response = await this.service.get<RegistrationSettingsResponse>(
      '/v1/auth/register/settings',
    );

    return {
      countries: response.countries.map((c) => c.iso3166alpha2),
      data: response as unknown as Record<string, unknown>,
    };
  }

  async getRegistrationStatus(
    sessionId: string,
    country: string,
  ): Promise<RegistrationStatus> {
    this.service.setLocation(mapCountryToLocation(country));
    const response = await this.service.get<UserResponse>(
      `/v1/auth/register/status/${encodeURIComponent(sessionId)}`,
    );

    return {
      status: response.verificationState ?? 'UNKNOWN',
      verificationState: response.verificationState ?? undefined,
      data: response as unknown as Record<string, unknown>,
    };
  }

  async submitOnboardingStep(
    step: OnboardingStep,
  ): Promise<OnboardingStepResult> {
    this.service.setLocation(mapCountryToLocation(step.country));

    try {
      const endpoint =
        ONBOARDING_ENDPOINTS[step.type] ??
        `/v1/auth/register/${encodeURIComponent(step.type)}`;
      const response = await this.service.post<Record<string, unknown>>(
        endpoint,
        step.data,
      );
      return { success: true, data: response };
    } catch (error) {
      Logger.error(error as Error, getErrorContext('submitOnboardingStep'));
      return { success: false, error: (error as Error).message };
    }
  }

  // -- Push Provisioning --

  async createGoogleWalletProvisioningRequest(
    tokens: CardAuthTokens,
  ): Promise<{ opaquePaymentCard: string }> {
    const response = await this.service.post<{
      success: boolean;
      data?: { opaquePaymentCard?: string };
    }>('/v1/card/wallet/provision/google', {}, tokens);

    if (!response.data?.opaquePaymentCard) {
      throw new CardProviderError(
        CardProviderErrorCode.ServerError,
        'Google Wallet provisioning response missing opaquePaymentCard',
      );
    }
    return { opaquePaymentCard: response.data.opaquePaymentCard };
  }

  async createApplePayProvisioningRequest(
    params: {
      leafCertificate: string;
      intermediateCertificate: string;
      nonce: string;
      nonceSignature: string;
    },
    tokens: CardAuthTokens,
  ): Promise<{
    encryptedPassData: string;
    activationData: string;
    ephemeralPublicKey: string;
  }> {
    const response = await this.service.post<{
      success?: boolean;
      data?: {
        encryptedPassData?: string;
        activationData?: string;
        ephemeralPublicKey?: string;
      };
      encryptedPassData?: string;
      activationData?: string;
      ephemeralPublicKey?: string;
    }>('/v1/card/wallet/provision/apple', params, tokens);

    const data = response.data || response;
    if (
      !data.encryptedPassData ||
      !data.activationData ||
      !data.ephemeralPublicKey
    ) {
      throw new CardProviderError(
        CardProviderErrorCode.ServerError,
        'Apple Pay provisioning response missing required fields',
      );
    }

    return {
      encryptedPassData: data.encryptedPassData,
      activationData: data.activationData,
      ephemeralPublicKey: data.ephemeralPublicKey,
    };
  }

  // -- Cashback --

  async getCashbackWallet(
    tokens: CardAuthTokens,
  ): Promise<CashbackWalletResponse> {
    return this.service.get<CashbackWalletResponse>(
      '/v1/wallet/reward',
      tokens,
    );
  }

  async getCashbackWithdrawEstimation(
    tokens: CardAuthTokens,
  ): Promise<CashbackWithdrawEstimationResponse> {
    return this.service.get<CashbackWithdrawEstimationResponse>(
      '/v1/wallet/reward/withdraw-estimation',
      tokens,
    );
  }

  async withdrawCashback(
    params: CashbackWithdrawParams,
    tokens: CardAuthTokens,
  ): Promise<CashbackWithdrawResponse> {
    return this.service.post<CashbackWithdrawResponse>(
      '/v1/wallet/reward/withdraw',
      params,
      tokens,
    );
  }

  // -- On-Chain (unauthenticated) --

  async getOnChainAssets(address: string): Promise<CardHomeData> {
    const fallback: CardHomeData = {
      ...emptyCardHomeData(),
      actions: [{ type: 'add_funds', enabled: true }, { type: 'change_asset' }],
    };

    try {
      const lineaChainId = 'eip155:59144';
      const lineaChain = this.cardFeatureFlag?.chains?.[lineaChainId];
      if (!lineaChain?.tokens?.length) return fallback;

      const supportedTokens = lineaChain.tokens.filter(
        (t): t is SupportedToken & { address: string } =>
          !!t && typeof t.address === 'string' && t.enabled !== false,
      );
      if (supportedTokens.length === 0) return fallback;

      const foxConnect = lineaChain.foxConnectAddresses;
      const scannerAddress = lineaChain.balanceScannerAddress;
      if (!foxConnect?.global || !foxConnect?.us || !scannerAddress) {
        return fallback;
      }

      const rawAllowances = await this.#fetchOnChainAllowances(
        address,
        supportedTokens,
        foxConnect as { global: string; us: string },
        scannerAddress,
      );

      const fundingAssets = this.#mapOnChainAllowancesToAssets(
        rawAllowances,
        supportedTokens,
        lineaChainId,
        address,
      );

      const primaryFundingAsset = await this.#pickOnChainPrimaryAsset(
        address,
        fundingAssets,
        foxConnect as { global: string; us: string },
      );

      return {
        primaryFundingAsset,
        fundingAssets,
        availableFundingAssets: fundingAssets,
        card: null,
        account: null,
        alerts: [],
        actions: [
          { type: 'add_funds', enabled: true },
          { type: 'change_asset' },
        ],
        delegationSettings: null,
      };
    } catch (error) {
      Logger.error(error as Error, getErrorContext('getOnChainAssets'));
      return fallback;
    }
  }

  // -- On-Chain private helpers --

  async #fetchOnChainAllowances(
    owner: string,
    tokens: (SupportedToken & { address: string })[],
    foxConnect: { global: string; us: string },
    scannerAddress: string,
  ): Promise<
    {
      address: string;
      globalAllowance: ethers.BigNumber;
      usAllowance: ethers.BigNumber;
    }[]
  > {
    const rpcUrl = cardNetworkInfos.linea?.rpcUrl;
    if (!rpcUrl) throw new Error('Linea RPC URL not configured');

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const scanner = new ethers.Contract(
      scannerAddress,
      BALANCE_SCANNER_ABI,
      provider,
    );

    const tokenAddresses = tokens
      .map((t) => t.address)
      .filter((addr): addr is string => ethers.utils.isAddress(addr));

    if (tokenAddresses.length === 0) return [];

    const spenders: string[][] = tokenAddresses.map(() => [
      foxConnect.global,
      foxConnect.us,
    ]);

    const results: [boolean, string][][] =
      await scanner.spendersAllowancesForTokens(
        owner,
        tokenAddresses,
        spenders,
      );

    return tokenAddresses.map((addr, i) => {
      const [globalTuple, usTuple] = results[i];
      return {
        address: addr,
        globalAllowance: ethers.BigNumber.from(globalTuple[1]),
        usAllowance: ethers.BigNumber.from(usTuple[1]),
      };
    });
  }

  #mapOnChainAllowancesToAssets(
    rawAllowances: {
      address: string;
      globalAllowance: ethers.BigNumber;
      usAllowance: ethers.BigNumber;
    }[],
    supportedTokens: (SupportedToken & { address: string })[],
    chainId: string,
    ownerAddress: string,
  ): CardFundingAsset[] {
    return rawAllowances
      .map((raw) => {
        const tokenInfo = supportedTokens.find(
          (t) => t.address?.toLowerCase() === raw.address.toLowerCase(),
        );
        if (!tokenInfo) return null;

        const allowance = raw.usAllowance.isZero()
          ? raw.globalAllowance
          : raw.usAllowance;
        const allowanceFloat = parseFloat(
          ethers.utils.formatUnits(allowance, tokenInfo.decimals ?? 6),
        );

        return {
          symbol: tokenInfo.symbol ?? '',
          name: tokenInfo.name ?? '',
          address: raw.address,
          walletAddress: ownerAddress,
          decimals: tokenInfo.decimals ?? 0,
          chainId,
          spendableBalance: '0',
          spendingCap: allowance.toString(),
          priority: 0,
          status: mapAllowanceToFundingStatus(allowanceFloat),
        } as CardFundingAsset;
      })
      .filter((a): a is CardFundingAsset => a !== null && a.symbol !== '');
  }

  /**
   * Picks the primary asset for unauthenticated users.
   * For 0 non-zero allowances: returns the first supported token.
   * For 1 non-zero: returns that token.
   * For 2+: reads Approval event logs to find the most recently approved token.
   */
  async #pickOnChainPrimaryAsset(
    owner: string,
    assets: CardFundingAsset[],
    foxConnect: { global: string; us: string },
  ): Promise<CardFundingAsset | null> {
    if (assets.length === 0) return null;

    const nonZero = assets.filter(
      (a) => a.status !== FundingAssetStatus.Inactive,
    );

    if (nonZero.length === 0) return assets[0];
    if (nonZero.length === 1) return nonZero[0];

    try {
      const priorityAddress = await this.#findLastApprovedToken(
        owner,
        nonZero.map((a) => a.address),
        foxConnect,
      );
      if (priorityAddress) {
        const match = nonZero.find(
          (a) => a.address.toLowerCase() === priorityAddress.toLowerCase(),
        );
        if (match) return match;
      }
    } catch (error) {
      Logger.error(error as Error, getErrorContext('pickOnChainPrimaryAsset'));
    }

    return nonZero[0];
  }

  /**
   * Reads Approval event logs from Linea to find which token was most recently
   * approved for the FoxConnect spender contracts.
   */
  async #findLastApprovedToken(
    owner: string,
    tokenAddresses: string[],
    foxConnect: { global: string; us: string },
  ): Promise<string | null> {
    const rpcUrl = cardNetworkInfos.linea?.rpcUrl;
    if (!rpcUrl) return null;

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const iface = new ethers.utils.Interface([
      'event Approval(address indexed owner, address indexed spender, uint256 value)',
    ]);

    const approvalTopic = iface.getEventTopic('Approval');
    const ownerTopic = ethers.utils.hexZeroPad(owner.toLowerCase(), 32);
    const spenderTopics = [foxConnect.global, foxConnect.us].map((s) =>
      ethers.utils.hexZeroPad(s.toLowerCase(), 32),
    );

    const SPENDERS_DEPLOYED_BLOCK = 2715910;

    const logsPerToken = await Promise.all(
      tokenAddresses.map((tokenAddress) =>
        provider
          .getLogs({
            address: tokenAddress,
            fromBlock: SPENDERS_DEPLOYED_BLOCK,
            toBlock: 'latest',
            topics: [approvalTopic, ownerTopic, spenderTopics],
          })
          .then((logs) => logs.map((log) => ({ ...log, tokenAddress }))),
      ),
    );

    const allLogs = logsPerToken.flat();
    allLogs.sort((a, b) =>
      a.blockNumber === b.blockNumber
        ? a.logIndex - b.logIndex
        : a.blockNumber - b.blockNumber,
    );

    for (let i = allLogs.length - 1; i >= 0; i--) {
      const { args } = iface.parseLog(allLogs[i]);
      const value = args.value as ethers.BigNumber;
      if (!value.isZero()) {
        return allLogs[i].tokenAddress;
      }
    }

    return null;
  }

  /**
   * Fetches the original spending cap from on-chain Approval event logs.
   * This returns the last approval value the user set, which represents
   * their intended spending limit before any spending occurred.
   *
   * @param asset - The funding asset to fetch the original cap for
   * @param delegationSettings - Delegation settings containing contract addresses
   * @returns The original spending cap as a human-readable string, or null if unavailable
   */
  async #fetchOriginalSpendingCap(
    asset: CardFundingAsset,
    delegationSettings: DelegationSettingsResponse | null,
  ): Promise<string | null> {
    if (!asset.chainId.startsWith('eip155:')) {
      return null;
    }

    if (
      asset.symbol &&
      SPENDING_LIMIT_UNSUPPORTED_TOKENS.includes(asset.symbol.toUpperCase())
    ) {
      return null;
    }

    const cardNetwork = caipChainIdToNetwork[asset.chainId];
    if (!cardNetwork) return null;

    const rpcUrl = cardNetworkInfos[cardNetwork]?.rpcUrl;
    if (!rpcUrl) return null;

    const network = delegationSettings?.networks.find(
      (n) =>
        cardNetworkInfos[n.network as keyof typeof cardNetworkInfos]
          ?.caipChainId === asset.chainId,
    );
    if (!network?.delegationContract) return null;

    const tokenAddress = asset.stagingTokenAddress || asset.address;
    if (!tokenAddress) return null;

    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const iface = new ethers.utils.Interface([
        'event Approval(address indexed owner, address indexed spender, uint256 value)',
      ]);

      const approvalTopic = iface.getEventTopic('Approval');
      const ownerTopic = ethers.utils.hexZeroPad(
        asset.walletAddress.toLowerCase(),
        32,
      );
      const spenderTopic = ethers.utils.hexZeroPad(
        network.delegationContract.toLowerCase(),
        32,
      );

      const SPENDERS_DEPLOYED_BLOCK = 2715910;

      const logs = await provider.getLogs({
        address: tokenAddress,
        fromBlock: SPENDERS_DEPLOYED_BLOCK,
        toBlock: 'latest',
        topics: [approvalTopic, ownerTopic, spenderTopic],
      });

      if (logs.length === 0) return null;

      logs.sort((a, b) =>
        b.blockNumber === a.blockNumber
          ? b.logIndex - a.logIndex
          : b.blockNumber - a.blockNumber,
      );

      const latestLog = logs[0];
      const { args } = iface.parseLog(latestLog);
      const value = args.value as ethers.BigNumber;

      return ethers.utils.formatUnits(value, asset.decimals);
    } catch (error) {
      Logger.error(
        error as Error,
        getErrorContext('fetchOriginalSpendingCap', {
          chainId: asset.chainId,
          symbol: asset.symbol,
        }),
      );
      return null;
    }
  }

  // ---- Private helpers ----

  private async handleEmailPassword(
    session: CardAuthSession,
    credentials: Extract<CardCredentials, { type: 'email_password' }>,
  ): Promise<CardAuthResult> {
    let loginResponse: CardLoginResponse;
    try {
      loginResponse = await this.service.post<CardLoginResponse>(
        '/v1/auth/login',
        {
          email: credentials.email,
          password: credentials.password,
          ...(credentials.otpCode ? { otpCode: credentials.otpCode } : {}),
        },
      );
    } catch (error) {
      throw mapLoginError(error, !!credentials.otpCode);
    }

    if (loginResponse.isOtpRequired) {
      session._metadata.otpUserId = loginResponse.userId;
      return {
        done: false,
        nextStep: {
          type: 'otp',
          destination: loginResponse.phoneNumber ?? credentials.email,
        },
      };
    }

    if (loginResponse.phase) {
      return {
        done: false,
        onboardingRequired: {
          sessionId: loginResponse.userId,
          phase: loginResponse.phase,
        },
      };
    }

    try {
      return await this.completeAuth(session, loginResponse);
    } catch (error) {
      throw mapApiError(error, 'completeAuth');
    }
  }

  private async completeAuth(
    session: CardAuthSession,
    loginResponse: CardLoginResponse,
  ): Promise<CardAuthResult> {
    const { initiateToken, location, state, codeVerifier } = session._metadata;
    if (
      typeof initiateToken !== 'string' ||
      typeof location !== 'string' ||
      typeof state !== 'string' ||
      typeof codeVerifier !== 'string'
    ) {
      throw new Error(
        'Invalid auth session: missing initiateToken, location, state, or codeVerifier in _metadata',
      );
    }
    const metadata = {
      initiateToken,
      location: location as CardLocation,
      state,
      codeVerifier,
    };

    const authorizeResponse = await this.service.request<CardAuthorizeResponse>(
      '/v1/auth/oauth/authorize',
      {
        method: 'POST',
        body: { token: metadata.initiateToken },
        headers: { Authorization: `Bearer ${loginResponse.accessToken}` },
      },
    );

    if (authorizeResponse.state !== metadata.state) {
      throw new Error('OAuth state mismatch — possible CSRF attack');
    }

    const tokenResponse =
      await this.service.request<CardExchangeTokenRawResponse>(
        '/v1/auth/oauth/token',
        {
          method: 'POST',
          body: {
            grant_type: 'authorization_code',
            code: authorizeResponse.code,
            code_verifier: metadata.codeVerifier,
            redirect_uri: OAUTH_REDIRECT_URI,
          },
          headers: { 'x-secret-key': this.service.apiKey },
        },
      );

    const tokenSet: CardAuthTokens = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      accessTokenExpiresAt: Date.now() + tokenResponse.expires_in * 1000,
      refreshTokenExpiresAt:
        Date.now() + tokenResponse.refresh_token_expires_in * 1000,
      location: metadata.location,
    };

    return { done: true, tokenSet };
  }

  /**
   * Fetches wallet details from the API, enriches them with token metadata
   * from the feature flag, and merges priority ordering.
   *
   * The API returns flat objects (`CardWalletExternalResponse`) without token
   * details or CAIP chain IDs. This method resolves the token info by matching
   * `currency` against the feature-flag supported tokens for each network.
   */
  private async fetchWalletDetails(
    tokens: CardAuthTokens,
  ): Promise<CardExternalWalletDetail[]> {
    try {
      const [rawWallets, priorities] = await Promise.all([
        this.service.get<
          {
            address: string;
            currency: string;
            balance: string;
            allowance: string;
            network: string;
          }[]
        >('/v1/wallet/external', tokens),
        this.service
          .get<
            CardWalletExternalPriorityResponse[]
          >('/v1/wallet/external/priority', tokens)
          .catch(() => [] as CardWalletExternalPriorityResponse[]),
      ]);

      if (!rawWallets?.length) return [];

      const maxPriority = priorities.reduce(
        (max, p) => Math.max(max, p.priority),
        0,
      );

      const enriched: CardExternalWalletDetail[] = [];

      for (const wallet of rawWallets) {
        const networkKey = wallet.network?.toLowerCase() as CardNetwork;
        const networkInfo = cardNetworkInfos[networkKey];
        if (!networkInfo) continue;

        const caipChainId = networkInfo.caipChainId;
        const chainTokens =
          this.cardFeatureFlag?.chains?.[caipChainId]?.tokens ?? [];
        const matchingToken = chainTokens.find(
          (t) => t?.symbol?.toLowerCase() === wallet.currency?.toLowerCase(),
        );

        const priorityMatch = priorities.find(
          (p) =>
            p.address?.toLowerCase() === wallet.address?.toLowerCase() &&
            p.currency?.toLowerCase() === wallet.currency?.toLowerCase() &&
            p.network?.toLowerCase() === wallet.network?.toLowerCase(),
        );

        enriched.push({
          id: priorityMatch?.id ?? 0,
          walletAddress: wallet.address,
          currency: wallet.currency,
          balance: wallet.balance,
          allowance: wallet.allowance,
          priority: priorityMatch?.priority ?? maxPriority + 1,
          tokenDetails: {
            address: matchingToken?.address ?? null,
            decimals: matchingToken?.decimals ?? null,
            symbol:
              matchingToken?.symbol ?? wallet.currency?.toUpperCase() ?? null,
            name: matchingToken?.name ?? null,
          },
          caipChainId,
          network: networkKey,
        });
      }

      return enriched.sort((a, b) => a.priority - b.priority);
    } catch (error) {
      Logger.error(error as Error, getErrorContext('fetchWalletDetails'));
      return [];
    }
  }

  private mapWalletDetailsToAssets(
    details: CardExternalWalletDetail[],
  ): CardFundingAsset[] {
    return details
      .map((detail) => {
        const allowanceFloat = parseFloat(detail.allowance || '0');
        const balanceFloat = parseFloat(detail.balance || '0');
        const availableBalance = Math.min(balanceFloat, allowanceFloat);

        return {
          symbol:
            detail.tokenDetails?.symbol ?? detail.currency?.toUpperCase() ?? '',
          name: detail.tokenDetails?.name ?? '',
          address: detail.tokenDetails?.address ?? '',
          walletAddress: detail.walletAddress ?? '',
          decimals: detail.tokenDetails?.decimals ?? 0,
          chainId: detail.caipChainId,
          spendableBalance: availableBalance.toString(),
          spendingCap: detail.allowance ?? '0',
          priority: detail.priority ?? 0,
          status: mapAllowanceToFundingStatus(allowanceFloat),
          stagingTokenAddress: detail.stagingTokenAddress ?? undefined,
          externalId: detail.id || undefined,
        };
      })
      .filter((a) => a.symbol !== '');
  }

  private pickPrimaryAsset(
    assets: CardFundingAsset[],
  ): CardFundingAsset | null {
    if (assets.length === 0) return null;
    if (assets.length === 1) return assets[0];

    const userPriority = assets[0];
    const userPriorityBalance = parseFloat(userPriority.spendableBalance);
    if (!isNaN(userPriorityBalance) && userPriorityBalance > 0) {
      return userPriority;
    }

    const fallback = assets.find((a) => {
      const balance = parseFloat(a.spendableBalance);
      return !isNaN(balance) && balance > 0;
    });

    return fallback ?? userPriority;
  }

  private mapCardDetails(response: CardDetailsResponse): CardDetails {
    return {
      id: response.id,
      status: response.status,
      type: response.type,
      lastFour: response.panLast4,
      holderName: response.holderName,
      isFreezable: response.isFreezable,
    };
  }

  private mapAccountStatus(
    user: UserResponse,
    card: CardDetailsResponse | null,
  ): CardAccountStatus {
    return {
      verificationStatus: user.verificationState ?? null,
      provisioningEligible:
        !!card &&
        card.status === CardStatus.ACTIVE &&
        isAccountEligibleForProvisioning(user.createdAt),
      holderName: user.firstName
        ? `${user.firstName} ${user.lastName ?? ''}`.trim()
        : null,
      shippingAddress: user.addressLine1
        ? {
            line1: user.addressLine1,
            line2: user.addressLine2 ?? undefined,
            city: user.city ?? '',
            state: user.usState ?? undefined,
            postalCode: user.zip ?? '',
            country: user.countryOfResidence ?? '',
          }
        : null,
    };
  }

  private buildAlerts(
    asset: CardFundingAsset | null,
    card: CardDetails | null,
    account: CardAccountStatus | null,
  ): CardAlert[] {
    const alerts: CardAlert[] = [];

    if (
      account?.verificationStatus === 'PENDING' ||
      account?.verificationStatus === 'UNVERIFIED'
    ) {
      alerts.push({ type: 'kyc_pending', dismissable: false });
    }

    if (account?.verificationStatus === 'VERIFIED' && !card && asset !== null) {
      alerts.push({ type: 'card_provisioning', dismissable: false });
    }

    if (card && card.status === CardStatus.FROZEN) {
      return alerts;
    }

    const isSpendingLimitSupported =
      asset?.symbol &&
      !SPENDING_LIMIT_UNSUPPORTED_TOKENS.includes(asset.symbol.toUpperCase());

    if (
      asset?.status === FundingAssetStatus.Limited &&
      asset.chainId.startsWith('eip155:') &&
      asset.originalSpendingCap &&
      isSpendingLimitSupported
    ) {
      const originalCap = parseFloat(asset.originalSpendingCap);
      const remaining = parseFloat(asset.spendingCap);
      const consumed = originalCap - remaining;
      const consumedRatio = originalCap > 0 ? consumed / originalCap : 0;

      if (consumedRatio >= 0.8) {
        alerts.push({
          type: 'close_to_spending_limit',
          dismissable: true,
          action: { type: 'navigate', route: 'SpendingLimit' },
        });
      }
    }

    return alerts;
  }

  private buildActions(
    asset: CardFundingAsset | null,
    card: CardDetails | null,
    account: CardAccountStatus | null,
  ): CardAction[] {
    if (!card) {
      if (account?.verificationStatus === 'VERIFIED' && !asset) {
        return [{ type: 'enable_card' }];
      }
      return [];
    }

    if (
      account?.verificationStatus === 'VERIFIED' &&
      (!asset || asset.status === FundingAssetStatus.Inactive)
    ) {
      return [{ type: 'enable_card' }];
    }

    if (card.status === CardStatus.ACTIVE && asset) {
      return [{ type: 'add_funds', enabled: true }, { type: 'change_asset' }];
    }

    return [];
  }

  /**
   * Merges user's delegated assets with all tokens from delegation settings.
   * Tokens already in `assets` (matched by token contract address + chainId) are kept.
   * Additional tokens from settings are added as inactive with zero balance.
   */
  private buildSupportedTokens(
    fundingAssets: CardFundingAsset[],
    delegationSettings: DelegationSettingsResponse | null,
  ): CardFundingAsset[] {
    const result = [...fundingAssets];

    if (!delegationSettings?.networks) return result;

    for (const network of delegationSettings.networks) {
      const networkName = network.network?.toLowerCase() as string;
      if (
        !networkName ||
        !SUPPORTED_ASSET_NETWORKS.includes(networkName as never)
      ) {
        continue;
      }

      const info =
        cardNetworkInfos[networkName as keyof typeof cardNetworkInfos];
      const chainId = info?.caipChainId ?? `eip155:${network.chainId}`;
      const isNonProduction = network.environment !== 'production';

      // Enrich existing assets with delegationContract from their matching network
      for (const existing of result) {
        if (existing.chainId === chainId && !existing.delegationContract) {
          existing.delegationContract = network.delegationContract;
        }
      }

      for (const tokenConfig of Object.values(network.tokens ?? {})) {
        if (!tokenConfig.address) continue;

        const alreadyExists = result.some(
          (a) =>
            a.address?.toLowerCase() === tokenConfig.address.toLowerCase() &&
            a.chainId === chainId,
        );
        if (alreadyExists) continue;

        const chainTokens =
          this.cardFeatureFlag?.chains?.[chainId]?.tokens ?? [];
        const sdkToken = chainTokens.find(
          (t) => t?.symbol?.toLowerCase() === tokenConfig.symbol?.toLowerCase(),
        );

        result.push({
          symbol: sdkToken?.symbol ?? tokenConfig.symbol,
          name: sdkToken?.name ?? tokenConfig.symbol,
          address:
            isNonProduction && sdkToken?.address
              ? sdkToken.address
              : tokenConfig.address,
          walletAddress: '',
          decimals: tokenConfig.decimals,
          chainId,
          spendableBalance: '0',
          spendingCap: '0',
          priority: Number.MAX_SAFE_INTEGER,
          status: FundingAssetStatus.Inactive,
          stagingTokenAddress: isNonProduction
            ? tokenConfig.address
            : undefined,
          delegationContract: network.delegationContract,
        });
      }
    }

    return result.sort((a, b) => {
      const aHasPriority = a.priority > 0;
      const bHasPriority = b.priority > 0;
      if (aHasPriority && bHasPriority) return a.priority - b.priority;
      if (aHasPriority) return -1;
      if (bHasPriority) return 1;

      const statusOrder = {
        [FundingAssetStatus.Active]: 0,
        [FundingAssetStatus.Limited]: 1,
        [FundingAssetStatus.Inactive]: 2,
      };
      return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
    });
  }

  private buildFundingOptions(
    settings: DelegationSettingsResponse,
  ): { symbol: string; asset: CardFundingAsset | null }[] {
    const options: { symbol: string; asset: CardFundingAsset | null }[] = [];
    const seen = new Set<string>();

    for (const network of settings.networks) {
      const networkName = network.network?.toLowerCase();
      if (
        !networkName ||
        !SUPPORTED_ASSET_NETWORKS.includes(networkName as CardNetwork)
      ) {
        continue;
      }

      const info =
        cardNetworkInfos[networkName as keyof typeof cardNetworkInfos];
      const chainId = info?.caipChainId ?? `eip155:${network.chainId}`;
      const isNonProduction = network.environment !== 'production';

      for (const tokenConfig of Object.values(network.tokens ?? {})) {
        if (!tokenConfig.address) continue;

        const dedupeKey = `${tokenConfig.address.toLowerCase()}:${chainId}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const symbol = tokenConfig.symbol;
        options.push({
          symbol,
          asset: {
            symbol,
            name: symbol,
            address: tokenConfig.address,
            walletAddress: '',
            decimals: tokenConfig.decimals,
            chainId,
            spendableBalance: '0',
            spendingCap: '0',
            priority: 0,
            status: FundingAssetStatus.Inactive,
            stagingTokenAddress: isNonProduction
              ? tokenConfig.address
              : undefined,
          },
        });
      }
    }

    return options;
  }
}
