import Logger from '../../../../../util/Logger';
import type { CardFeatureFlag } from '../../../../../selectors/featureFlagController/card';
import { CardApiError } from '../services/BaanxService';
import type { ImmersveService } from '../services/ImmersveService';
import type { ImmersveProviderConfig } from '../services/immersve-config';
import {
  AuthTokenValidity,
  CardAuthResult,
  CardAuthSession,
  CardAuthTokens,
  CardContactDetails,
  CardCreateResult,
  CardCredentials,
  CardDetails,
  CardFundingSourceResult,
  CardHomeData,
  CardProviderCapabilities,
  CardProviderError,
  CardProviderErrorCode,
  CardSpendingPrerequisitesParams,
  CardSpendingPrerequisitesResult,
  emptyCardHomeData,
  ICardProvider,
} from '../provider-types';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const REFRESH_EXPIRY_BUFFER_MS = 60 * 60 * 1000;

const DEFAULT_NETWORK = 'base-sepolia';
const IMMERSVE_LOCATION = 'international';

const IMMERSVE_KYC_TYPE = 'immersve-conducted';
const IMMERSVE_KYC_HIDDEN_STEPS = ['region', 'contact-channels'];
const IMMERSVE_SPENDABLE_CURRENCY = 'USD';
const IMMERSVE_SPENDABLE_AMOUNT = 999999999;

function getErrorContext(method: string, extra?: Record<string, unknown>) {
  return {
    tags: { feature: 'card', provider: 'immersve' },
    context: { name: 'ImmersveProvider', data: { method, ...extra } },
  };
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

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

interface ImmersveLoginInitResponse {
  id: string;
  signingChallenge: {
    message: string;
    description?: string;
    createdAt?: string;
    expiresAt?: string;
  };
}

interface ImmersveLoginCompleteResponse {
  accessToken: string;
  refreshToken?: string;
  cardholderAccountId: string;
}

interface ImmersveTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

interface ImmersveFundingSourceResponse {
  id: string;
  balance?: string;
  balanceCurrency?: string;
  network?: string;
}

export class ImmersveProvider implements ICardProvider {
  readonly id = 'immersve' as const;

  readonly capabilities: CardProviderCapabilities = {
    authMethod: 'siwe',
    supportsOTP: false,
    supportsFundingApproval: true,
    supportsFundingLimits: true,
    fundingChains: ['eip155:8453', 'eip155:84532'],
    supportsFreeze: true,
    supportsPushProvisioning: false,
    onboarding: { type: 'webview', url: '' },
    supportsPinView: false,
    supportsCashback: false,
    supportsCredit: false,
  };

  private readonly service: ImmersveService;
  private readonly config: ImmersveProviderConfig;
  private readonly getCardFeatureFlag: () => CardFeatureFlag | null;

  constructor({
    service,
    config,
    getCardFeatureFlag,
  }: {
    service: ImmersveService;
    config: ImmersveProviderConfig;
    getCardFeatureFlag?: () => CardFeatureFlag | null | undefined;
  }) {
    this.service = service;
    this.config = config;
    this.getCardFeatureFlag = () => getCardFeatureFlag?.() ?? null;
  }

  private get programConfig() {
    return this.getCardFeatureFlag()?.immersve ?? {};
  }

  private get network(): string {
    return this.programConfig.network ?? DEFAULT_NETWORK;
  }

  private get clientApplicationId(): string {
    return (
      this.programConfig.clientApplicationId || this.config.clientApplicationId
    );
  }

  private requireProgramValue(
    key: 'cardProgramId' | 'fundingChannelId',
  ): string {
    const value = this.programConfig[key];
    if (!value) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        `Immersve ${key} is not configured`,
      );
    }
    return value;
  }

  async initiateAuth(
    country: string,
    options?: { address?: string },
  ): Promise<CardAuthSession> {
    const address = options?.address;
    if (!address) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Immersve initiateAuth requires an account address',
      );
    }

    try {
      const response = await this.service.post<ImmersveLoginInitResponse>(
        '/auth/login-init',
        {
          loginMethod: 'siwe',
          network: this.network,
          clientApplicationId: this.clientApplicationId,
          scopes: ['cardholder-partner'],
          address,
          url: this.config.appUrl,
          autoSignup: true,
        },
      );

      return {
        id: response.id,
        currentStep: {
          type: 'siwe',
          message: response.signingChallenge.message,
        },
        _metadata: {
          loginRequestId: response.id,
          address,
          country,
        },
      };
    } catch (error) {
      throw mapApiError(error, 'initiateAuth');
    }
  }

  async submitCredentials(
    session: CardAuthSession,
    credentials: CardCredentials,
  ): Promise<CardAuthResult> {
    if (credentials.type !== 'siwe') {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        `Unsupported credential type: ${credentials.type}`,
      );
    }

    let response: ImmersveLoginCompleteResponse;
    try {
      response = await this.service.post<ImmersveLoginCompleteResponse>(
        '/auth/login-complete',
        {
          loginRequestId: session.id,
          signature: credentials.signature,
        },
      );
    } catch (error) {
      throw mapApiError(error, 'submitCredentials');
    }

    const tokenSet: CardAuthTokens = {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      accessTokenExpiresAt: decodeJwtExpiryMs(response.accessToken) ?? 0,
      refreshTokenExpiresAt: response.refreshToken
        ? (decodeJwtExpiryMs(response.refreshToken) ?? undefined)
        : undefined,
      location: IMMERSVE_LOCATION,
      cardholderAccountId: response.cardholderAccountId,
      accountAddress: session._metadata.address as string | undefined,
    };

    return { done: true, tokenSet };
  }

  async refreshTokens(tokens: CardAuthTokens): Promise<CardAuthTokens> {
    if (!tokens.refreshToken) {
      throw new CardProviderError(
        CardProviderErrorCode.InvalidCredentials,
        'No refresh token available',
        401,
      );
    }

    let response: ImmersveTokenResponse;
    try {
      response = await this.service.post<ImmersveTokenResponse>(
        '/auth/token',
        {
          refreshToken: tokens.refreshToken,
          clientApplicationId: this.clientApplicationId,
        },
        undefined,
        { origin: this.config.appUrl },
      );
    } catch (error) {
      if (
        error instanceof CardApiError &&
        [400, 401, 403].includes(error.statusCode)
      ) {
        throw new CardProviderError(
          CardProviderErrorCode.InvalidCredentials,
          'Refresh token rejected',
          error.statusCode,
        );
      }
      throw mapApiError(error, 'refreshTokens');
    }

    const refreshToken = response.refreshToken ?? tokens.refreshToken;
    return {
      accessToken: response.accessToken,
      refreshToken,
      accessTokenExpiresAt: decodeJwtExpiryMs(response.accessToken) ?? 0,
      refreshTokenExpiresAt: refreshToken
        ? (decodeJwtExpiryMs(refreshToken) ?? undefined)
        : undefined,
      location: tokens.location,
      cardholderAccountId: tokens.cardholderAccountId,
      accountAddress: tokens.accountAddress,
      keyringId: tokens.keyringId,
    };
  }

  validateTokens(tokens: CardAuthTokens): AuthTokenValidity {
    const now = Date.now();
    const accessExpiry = decodeJwtExpiryMs(tokens.accessToken);

    if (accessExpiry !== null && accessExpiry > now + TOKEN_EXPIRY_BUFFER_MS) {
      return 'valid';
    }

    if (!tokens.refreshToken) {
      return 'expired';
    }

    const refreshExpiry = decodeJwtExpiryMs(tokens.refreshToken);
    const refreshUsable =
      refreshExpiry === null || refreshExpiry > now + REFRESH_EXPIRY_BUFFER_MS;

    return refreshUsable ? 'needs_refresh' : 'expired';
  }

  async logout(tokens: CardAuthTokens): Promise<void> {
    try {
      await this.service.post('/auth/logout', {}, tokens);
    } catch (error) {
      Logger.error(error as Error, getErrorContext('logout'));
    }
  }

  async createFundingSource(
    tokens: CardAuthTokens,
  ): Promise<CardFundingSourceResult> {
    const accountId = tokens.cardholderAccountId;
    const fundingAddress = tokens.accountAddress;
    if (!accountId || !fundingAddress) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'createFundingSource: missing cardholder account id or address',
      );
    }

    try {
      const fundingChannelId = this.requireProgramValue('fundingChannelId');
      const response = await this.service.post<ImmersveFundingSourceResponse>(
        '/api/funding-sources',
        {
          accountId,
          fundingChannelId,
          fundingAddress,
        },
        tokens,
      );
      return {
        id: response.id,
        network: response.network,
        balance: response.balance,
        balanceCurrency: response.balanceCurrency,
      };
    } catch (error) {
      throw mapApiError(error, 'createFundingSource');
    }
  }

  async patchContactDetails(
    details: CardContactDetails,
    tokens: CardAuthTokens,
  ): Promise<void> {
    const accountId = tokens.cardholderAccountId;
    if (!accountId) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'patchContactDetails: missing cardholder account id',
      );
    }

    const body: {
      email?: { emailAddress: string };
      phone?: { phoneNumber: string };
    } = {};
    if (details.email) body.email = { emailAddress: details.email };
    if (details.phone) body.phone = { phoneNumber: details.phone };

    try {
      await this.service.patch(
        `/api/accounts/${accountId}/contact-details`,
        body,
        tokens,
      );
    } catch (error) {
      throw mapApiError(error, 'patchContactDetails');
    }
  }

  async getSpendingPrerequisites(
    fundingSourceId: string,
    params: CardSpendingPrerequisitesParams,
    tokens: CardAuthTokens,
  ): Promise<CardSpendingPrerequisitesResult> {
    try {
      return await this.service.post<CardSpendingPrerequisitesResult>(
        '/api/spending-prerequisites',
        {
          cardProgramId: this.requireProgramValue('cardProgramId'),
          fundingSourceId,
          spendableAmount: IMMERSVE_SPENDABLE_AMOUNT,
          spendableCurrency: IMMERSVE_SPENDABLE_CURRENCY,
          kycType: IMMERSVE_KYC_TYPE,
          kycRedirectUrl: params.kycRedirectUrl,
          kycRegion: params.kycRegion,
          kycHiddenSteps: IMMERSVE_KYC_HIDDEN_STEPS,
        },
        tokens,
      );
    } catch (error) {
      throw mapApiError(error, 'getSpendingPrerequisites');
    }
  }

  async createCard(
    fundingSourceId: string,
    tokens: CardAuthTokens,
  ): Promise<CardCreateResult> {
    try {
      return await this.service.post<CardCreateResult>(
        '/api/cards',
        {
          cardProgramId: this.requireProgramValue('cardProgramId'),
          fundingSourceId,
        },
        tokens,
      );
    } catch (error) {
      throw mapApiError(error, 'createCard');
    }
  }

  async getCardHomeData(
    _address: string,
    _tokens: CardAuthTokens,
  ): Promise<CardHomeData> {
    return emptyCardHomeData();
  }

  async getCardDetails(_tokens: CardAuthTokens): Promise<CardDetails> {
    throw new CardProviderError(
      CardProviderErrorCode.Unknown,
      'Immersve getCardDetails not implemented yet',
    );
  }

  async freezeCard(_cardId: string, _tokens: CardAuthTokens): Promise<void> {
    throw new CardProviderError(
      CardProviderErrorCode.Unknown,
      'Immersve freezeCard not implemented yet',
    );
  }

  async unfreezeCard(_cardId: string, _tokens: CardAuthTokens): Promise<void> {
    throw new CardProviderError(
      CardProviderErrorCode.Unknown,
      'Immersve unfreezeCard not implemented yet',
    );
  }
}
