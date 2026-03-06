import Logger from '../../../../../util/Logger';
import {
  CardExternalWalletDetail,
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
} from '../../../../../components/UI/Card/types';
import {
  ARBITRARY_ALLOWANCE,
  BAANX_MAX_LIMIT,
  cardNetworkInfos,
} from '../../../../../components/UI/Card/constants';
import {
  generatePKCEPair,
  generateState,
} from '../../../../../components/UI/Card/util/pkceHelpers';
import type { BaanxService } from '../services/BaanxService';
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
  emptyCardHomeData,
} from '../provider-types';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const REFRESH_EXPIRY_BUFFER_MS = 60 * 60 * 1000;

const CHAIN_TO_NETWORK: Record<string, string> = {
  'eip155:59144': 'linea',
  'eip155:8453': 'base',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'solana',
};

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

function mapAllowanceToFundingStatus(
  allowanceFloat: number,
): FundingAssetStatus {
  if (allowanceFloat === 0) return FundingAssetStatus.Inactive;
  if (allowanceFloat < ARBITRARY_ALLOWANCE) return FundingAssetStatus.Limited;
  return FundingAssetStatus.Active;
}

function countryToLocation(country: string): CardLocation {
  return country === 'US' ? 'us' : 'international';
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
    const location = countryToLocation(country);
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
      redirect_uri: 'https://example.com',
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

    if (tokens.refreshTokenExpiresAt) {
      if (tokens.refreshTokenExpiresAt < now + REFRESH_EXPIRY_BUFFER_MS) {
        return 'expired';
      }
    }

    if (tokens.accessTokenExpiresAt < now + TOKEN_EXPIRY_BUFFER_MS) {
      return tokens.refreshToken ? 'needs_refresh' : 'expired';
    }

    return 'valid';
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
            .catch(() => null),
          this.service.get<UserResponse>('/v1/user', tokens).catch(() => null),
        ],
      );

      const walletDetails = delegationSettings
        ? await this.fetchWalletDetails(delegationSettings.networks, tokens)
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
    const response = await this.service.get<CardDetailsResponse>(
      '/v1/card/status',
      tokens,
    );
    return this.mapCardDetails(response);
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
    const priorities = allAssets.map((a, idx) => ({
      address: a.address,
      currency: a.symbol,
      network: CHAIN_TO_NETWORK[a.chainId] ?? 'unknown',
      priority:
        a.symbol === asset.symbol && a.chainId === asset.chainId ? 1 : idx + 2,
    }));

    await this.service.put('/v1/wallet/external/priority', priorities, tokens);
  }

  async getFundingConfig(tokens: CardAuthTokens): Promise<CardFundingConfig> {
    const settings = await this.service.get<DelegationSettingsResponse>(
      '/v1/delegation/chain/config',
      tokens,
    );

    const supportedChains = settings.networks.map(
      (n: DelegationSettingsNetwork) => {
        const info =
          cardNetworkInfos[n.network as keyof typeof cardNetworkInfos];
        return info?.caipChainId ?? `eip155:${n.chainId}`;
      },
    );

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
    this.service.setLocation(countryToLocation(country));
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
    this.service.setLocation(countryToLocation(country));
    const response = await this.service.get<UserResponse>(
      `/v1/auth/register/status/${sessionId}`,
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
    this.service.setLocation(countryToLocation(step.country));

    try {
      const endpoint =
        ONBOARDING_ENDPOINTS[step.type] ?? `/v1/auth/register/${step.type}`;
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
    const loginResponse = await this.service.post<CardLoginResponse>(
      '/v1/auth/login',
      {
        email: credentials.email,
        password: credentials.password,
        ...(credentials.otpCode ? { otpCode: credentials.otpCode } : {}),
      },
    );

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

    return this.completeAuth(session, loginResponse);
  }

  private async completeAuth(
    session: CardAuthSession,
    loginResponse: CardLoginResponse,
  ): Promise<CardAuthResult> {
    const metadata = session._metadata as {
      initiateToken: string;
      location: CardLocation;
      state: string;
      codeVerifier: string;
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
            redirect_uri: 'https://example.com',
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
    networks: DelegationSettingsNetwork[],
    tokens: CardAuthTokens,
  ): Promise<CardExternalWalletDetail[]> {
    try {
      const results = await this.service.get<CardExternalWalletDetail[]>(
        '/v1/wallet/external',
        tokens,
      );
      return results ?? [];
    } catch (error) {
      Logger.error(
        error as Error,
        getErrorContext('fetchWalletDetails', {
          networkCount: networks.length,
        }),
      );
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
          status: mapAllowanceToFundingStatus(allowanceFloat),
        };
      })
      .filter((a) => a.symbol !== '');
  }

  private pickPrimaryAsset(
    assets: CardFundingAsset[],
  ): CardFundingAsset | null {
    if (assets.length === 0) return null;
    if (assets.length === 1) return assets[0];

    const withBalance = assets.find((a) => {
      const balance = parseFloat(a.balance);
      return !isNaN(balance) && balance > 0;
    });

    return withBalance ?? assets[0];
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
    const targets = ['mUSD', 'USDC'];
    return targets.map((symbol) => {
      const network = settings.networks.find((n: DelegationSettingsNetwork) => {
        const tokens = n.tokens ?? {};
        return Object.keys(tokens).some(
          (key) => key.toUpperCase() === symbol.toUpperCase(),
        );
      });

      if (!network) return { symbol, asset: null };

      const info =
        cardNetworkInfos[network.network as keyof typeof cardNetworkInfos];
      return {
        symbol,
        asset: {
          symbol,
          name: symbol,
          address: '',
          decimals: 6,
          chainId: info?.caipChainId ?? `eip155:${network.chainId}`,
          balance: '0',
          status: FundingAssetStatus.Inactive,
        },
      };
    });
  }
}
