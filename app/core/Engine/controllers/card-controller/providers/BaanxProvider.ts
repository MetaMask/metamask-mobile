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
import {
  ARBITRARY_ALLOWANCE,
  BAANX_MAX_LIMIT,
  SUPPORTED_ASSET_NETWORKS,
  caipChainIdToNetwork,
  cardNetworkInfos,
} from '../../../../../components/UI/Card/constants';
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
  };

  private readonly service: BaanxService;

  constructor({ service }: { service: BaanxService }) {
    this.service = service;
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

  async sendOtp(session: CardAuthSession): Promise<void> {
    const userId = session._metadata.otpUserId as string | undefined;
    if (!userId) {
      throw new Error(
        'No userId in session — initiateAuth or login must be called first',
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

      const assets = this.mapWalletDetailsToAssets(walletDetails);
      const primaryAsset = this.pickPrimaryAsset(assets);
      const card = cardDetailsResponse
        ? this.mapCardDetails(cardDetailsResponse)
        : null;
      const account = user
        ? this.mapAccountStatus(user, cardDetailsResponse)
        : null;
      const alerts = this.buildAlerts(primaryAsset, card, account);
      const actions = this.buildActions(primaryAsset, card, account);

      return { primaryAsset, assets, card, account, alerts, actions };
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

  async getCardSecureView(
    tokens: CardAuthTokens,
    params: CardSecureViewParams,
  ): Promise<CardSecureView> {
    const response = await this.service.post<{ url: string; token: string }>(
      '/v1/card/details/token',
      { customCss: params.customCss },
      tokens,
    );
    return { url: response.url, token: response.token };
  }

  // -- Asset Management --

  async updateAssetPriority(
    asset: CardFundingAsset,
    allAssets: CardFundingAsset[],
    tokens: CardAuthTokens,
  ): Promise<void> {
    let nextPriority = 2;
    const priorities = allAssets.map((a) => ({
      address: a.address,
      currency: a.symbol,
      network: caipChainIdToNetwork[a.chainId] ?? 'unknown',
      priority:
        a.symbol === asset.symbol &&
        a.chainId === asset.chainId &&
        a.address === asset.address
          ? 1
          : nextPriority++,
    }));

    await this.service.put('/v1/wallet/external/priority', priorities, tokens);
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

  // -- On-Chain (unauthenticated) --

  async getOnChainAssets(_address: string): Promise<CardHomeData> {
    return {
      ...emptyCardHomeData(),
      actions: [{ type: 'add_funds', enabled: true }],
    };
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

  private async fetchWalletDetails(
    tokens: CardAuthTokens,
  ): Promise<CardExternalWalletDetail[]> {
    try {
      const [wallets, priorities] = await Promise.all([
        this.service.get<CardExternalWalletDetail[]>(
          '/v1/wallet/external',
          tokens,
        ),
        this.service
          .get<
            CardWalletExternalPriorityResponse[]
          >('/v1/wallet/external/priority', tokens)
          .catch(() => [] as CardWalletExternalPriorityResponse[]),
      ]);

      if (!wallets?.length) return [];

      const maxPriority = priorities.reduce(
        (max, p) => Math.max(max, p.priority),
        0,
      );

      const withPriority = wallets.map((wallet) => {
        const match = priorities.find(
          (p) =>
            p.address?.toLowerCase() === wallet.walletAddress?.toLowerCase() &&
            p.currency === wallet.currency &&
            p.network?.toLowerCase() === wallet.network?.toLowerCase(),
        );
        return {
          ...wallet,
          priority: match?.priority ?? maxPriority + 1,
        };
      });

      return withPriority.sort((a, b) => a.priority - b.priority);
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
          symbol: detail.tokenDetails.symbol ?? '',
          name: detail.tokenDetails.name ?? '',
          address: detail.tokenDetails.address ?? '',
          decimals: detail.tokenDetails.decimals ?? 0,
          chainId: detail.caipChainId,
          balance: availableBalance.toString(),
          allowance: detail.allowance ?? '0',
          priority: detail.priority ?? 0,
          status: mapAllowanceToFundingStatus(allowanceFloat),
          stagingTokenAddress: detail.stagingTokenAddress ?? undefined,
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
    const userPriorityBalance = parseFloat(userPriority.balance);
    if (!isNaN(userPriorityBalance) && userPriorityBalance > 0) {
      return userPriority;
    }

    const fallback = assets.find((a) => {
      const balance = parseFloat(a.balance);
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
      provisioningEligible: !!card && card.status === CardStatus.ACTIVE,
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

    if (account?.verificationStatus === 'PENDING') {
      alerts.push({ type: 'kyc_pending', dismissable: false });
    }

    if (card && card.status === CardStatus.FROZEN) {
      return alerts;
    }

    if (asset?.status === FundingAssetStatus.Limited) {
      alerts.push({
        type: 'close_to_spending_limit',
        dismissable: true,
        action: { type: 'navigate', route: 'SpendingLimit' },
      });
    }

    return alerts;
  }

  private buildActions(
    asset: CardFundingAsset | null,
    card: CardDetails | null,
    account: CardAccountStatus | null,
  ): CardAction[] {
    if (!card) return [];

    if (
      account?.verificationStatus === 'VERIFIED' &&
      asset?.status === FundingAssetStatus.Inactive
    ) {
      return [{ type: 'enable_card' }];
    }

    if (card.status === CardStatus.ACTIVE && asset) {
      return [{ type: 'add_funds', enabled: true }, { type: 'change_asset' }];
    }

    return [];
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
            decimals: tokenConfig.decimals,
            chainId,
            balance: '0',
            allowance: '0',
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
