import type { CaipChainId } from '@metamask/utils';
import Logger from '../../../../../util/Logger';
import type { CardFeatureFlag } from '../../../../../selectors/featureFlagController/card';
import {
  immersveNetworkToFundingToken,
  type ImmersveFundingTokenInfo,
} from '../../../../../components/UI/Card/util/immersveFunding';
import { CardApiError } from '../services/BaanxService';
import type { ImmersveService } from '../services/ImmersveService';
import type { ImmersveProviderConfig } from '../services/immersve-config';
import {
  AuthTokenValidity,
  CardAction,
  CardAuthResult,
  CardAuthSession,
  CardAuthTokens,
  CardContactDetails,
  CardCreateResult,
  CardCredentials,
  CardDetails,
  CardFundingAsset,
  CardFundingSourceResult,
  CardHomeData,
  CardProviderCapabilities,
  CardProviderError,
  CardProviderErrorCode,
  CardSensitiveDetails,
  CardSpendingPrerequisitesParams,
  CardSpendingPrerequisitesResult,
  CardStatus,
  CardType,
  emptyCardHomeData,
  FundingAssetStatus,
  ICardProvider,
  isCardAuthTokenError,
} from '../provider-types';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const REFRESH_EXPIRY_BUFFER_MS = 60 * 60 * 1000;

const DEFAULT_NETWORK = 'base-sepolia';
const IMMERSVE_LOCATION = 'international';

const IMMERSVE_KYC_TYPE = 'immersve-conducted';
const IMMERSVE_KYC_HIDDEN_STEPS = ['region', 'contact-channels'];
const IMMERSVE_SPENDABLE_CURRENCY = 'USD';
const IMMERSVE_SPENDABLE_AMOUNT = 999999999;

const USD_STABLECOIN_SYMBOLS = new Set(['USDC', 'USDT']);

function isUsdStablecoin(symbol: string): boolean {
  return USD_STABLECOIN_SYMBOLS.has(symbol.toUpperCase());
}

function getErrorContext(method: string, extra?: Record<string, unknown>) {
  return {
    tags: { feature: 'card', provider: 'immersve' },
    context: { name: 'ImmersveProvider', data: { method, ...extra } },
  };
}

function mapApiError(error: unknown, operation: string): CardProviderError {
  if (error instanceof CardProviderError) return error;
  if (error instanceof CardApiError) {
    if (error.statusCode === 401) {
      return new CardProviderError(
        CardProviderErrorCode.InvalidCredentials,
        `Authentication failed on ${operation}`,
        error.statusCode,
      );
    }

    if (error.statusCode === 403) {
      return new CardProviderError(
        CardProviderErrorCode.Forbidden,
        `Forbidden on ${operation}`,
        403,
        error.errorCode,
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

interface ImmersveFundingSourceListItem {
  id: string;
  balance?: string;
  balanceCurrency?: string;
  network?: string;
  fundingChannelId?: string;
}

interface ImmersveFundingSourcesResponse {
  items?: ImmersveFundingSourceListItem[];
}

type ImmersveCardApiStatus = 'active' | 'cancelled' | 'created' | 'shipped';

interface ImmersveCardListItem {
  id: string;
  accountId: string;
  type: string;
  createdAt: string;
  modifiedAt: string;
  expiresAt: string;
  isBlocked: boolean;
  status: ImmersveCardApiStatus;
  fundingSourceIds: string[];
  panLast4?: string;
  network?: string;
}

interface ImmersveCardListResponse {
  items?: ImmersveCardListItem[];
  pageInfo?: { nextCursor?: string };
}

interface ImmersveCardDetail extends ImmersveCardListItem {
  panFirst6?: string;
  currency?: string;
  expiry?: string;
  cardholderName?: string;
  unfreezeAllowed?: boolean;
}

interface ImmersveFundingSourceDetail {
  id: string;
  accountId: string;
  balance?: string;
  balanceCurrency?: string;
  fundingChannelId?: string;
  externalId?: string;
  purpose?: string;
  network?: string;
}

interface ImmersvePanTokenResponse {
  tokenId: string;
  callbackUrl: string;
}

export class ImmersveProvider implements ICardProvider {
  readonly id = 'immersve' as const;

  readonly capabilities: CardProviderCapabilities = {
    authMethod: 'siwe',
    supportsOTP: false,
    supportsFundingApproval: true,
    supportsFundingLimits: false,
    fundingChains: ['eip155:8453', 'eip155:84532'],
    supportsFreeze: true,
    supportsPushProvisioning: false,
    onboarding: { type: 'webview', url: '' },
    supportsPinView: false,
    supportsCashback: false,
    supportsCredit: false,
    supportsSensitiveDetailsView: true,
    supportsTravel: false,
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

  async getFundingSources(
    tokens: CardAuthTokens,
  ): Promise<CardFundingSourceResult[]> {
    const accountId = tokens.cardholderAccountId;
    if (!accountId) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'getFundingSources: missing cardholder account id',
      );
    }

    try {
      const { items } = await this.service.get<ImmersveFundingSourcesResponse>(
        `/api/accounts/${accountId}/funding-sources`,
        tokens,
      );
      return (items ?? []).map((item) => ({
        id: item.id,
        network: item.network,
        balance: item.balance,
        balanceCurrency: item.balanceCurrency,
        fundingChannelId: item.fundingChannelId,
      }));
    } catch (error) {
      throw mapApiError(error, 'getFundingSources');
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

  private async resolveCurrentCard(
    tokens: CardAuthTokens,
  ): Promise<ImmersveCardListItem | null> {
    const accountId = tokens.cardholderAccountId;
    if (!accountId) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'resolveCurrentCard: missing cardholder account id',
      );
    }

    const { items } = await this.service.get<ImmersveCardListResponse>(
      `/api/accounts/${accountId}/cards?excludeExpired=true`,
      tokens,
    );

    return this.pickCurrentCard(items ?? []);
  }

  private pickCurrentCard(
    items: ImmersveCardListItem[],
  ): ImmersveCardListItem | null {
    const candidates = items.filter((card) => card.status !== 'cancelled');
    if (candidates.length === 0) return null;

    const statusRank = (card: ImmersveCardListItem): number =>
      card.status === 'active' ? 0 : 1;

    return [...candidates].sort((a, b) => {
      const rankDiff = statusRank(a) - statusRank(b);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
  }

  private provisioningHomeData(): CardHomeData {
    return {
      ...emptyCardHomeData(),
      alerts: [{ type: 'card_provisioning', dismissable: false }],
    };
  }

  async getCardHomeData(
    _address: string,
    tokens: CardAuthTokens,
  ): Promise<CardHomeData> {
    try {
      const card = await this.resolveCurrentCard(tokens);

      if (!card) {
        return this.provisioningHomeData();
      }

      if (card.status === 'created') {
        return this.provisioningHomeData();
      }

      const detail = await this.service.get<ImmersveCardDetail>(
        `/api/cards/${card.id}`,
        tokens,
      );
      const cardDetails = this.mapImmersveCard(detail);
      const fundingAssets = await this.fetchFundingAssets(
        detail.fundingSourceIds ?? [],
        tokens,
      );
      const primaryFundingAsset = fundingAssets[0] ?? null;
      const actions: CardAction[] =
        cardDetails.status === CardStatus.ACTIVE && primaryFundingAsset
          ? [{ type: 'add_funds', enabled: true }]
          : [];

      return {
        ...emptyCardHomeData(),
        card: cardDetails,
        primaryFundingAsset,
        fundingAssets,
        availableFundingAssets: fundingAssets,
        actions,
      };
    } catch (error) {
      if (isCardAuthTokenError(error)) {
        throw error;
      }
      Logger.error(error as Error, getErrorContext('getCardHomeData'));
      return emptyCardHomeData();
    }
  }

  async getCardDetails(tokens: CardAuthTokens): Promise<CardDetails> {
    const card = await this.resolveCurrentCard(tokens);
    if (!card) {
      throw new CardProviderError(
        CardProviderErrorCode.NoCard,
        'User has no card',
        404,
      );
    }

    try {
      const detail = await this.service.get<ImmersveCardDetail>(
        `/api/cards/${card.id}`,
        tokens,
      );
      return this.mapImmersveCard(detail);
    } catch (error) {
      throw mapApiError(error, 'getCardDetails');
    }
  }

  async freezeCard(cardId: string, tokens: CardAuthTokens): Promise<void> {
    try {
      await this.service.post(`/api/cards/${cardId}/freeze`, {}, tokens);
    } catch (error) {
      throw mapApiError(error, 'freezeCard');
    }
  }

  async unfreezeCard(cardId: string, tokens: CardAuthTokens): Promise<void> {
    try {
      await this.service.post(`/api/cards/${cardId}/unfreeze`, {}, tokens);
    } catch (error) {
      throw mapApiError(error, 'unfreezeCard');
    }
  }

  async getCardSensitiveDetails(
    tokens: CardAuthTokens,
  ): Promise<CardSensitiveDetails> {
    const card = await this.resolveCurrentCard(tokens);
    if (!card) {
      throw new CardProviderError(
        CardProviderErrorCode.NoCard,
        'User has no card',
        404,
      );
    }

    try {
      const { callbackUrl } = await this.service.post<ImmersvePanTokenResponse>(
        `/api/cards/${card.id}/pan-token`,
        {},
        tokens,
      );
      return await this.service.get<CardSensitiveDetails>(callbackUrl);
    } catch (error) {
      throw mapApiError(error, 'getCardSensitiveDetails');
    }
  }

  private mapImmersveCard(detail: ImmersveCardDetail): CardDetails {
    const status = this.mapImmersveCardStatus(detail);
    return {
      id: detail.id,
      status,
      type: detail.type === 'virtual' ? CardType.VIRTUAL : CardType.PHYSICAL,
      lastFour: detail.panLast4 ?? '',
      holderName: detail.cardholderName,
      isFreezable: status === CardStatus.ACTIVE || status === CardStatus.FROZEN,
    };
  }

  private mapImmersveCardStatus(detail: ImmersveCardDetail): CardStatus {
    if (detail.status === 'cancelled') {
      return CardStatus.BLOCKED;
    }
    if (detail.isBlocked) {
      return detail.unfreezeAllowed ? CardStatus.FROZEN : CardStatus.BLOCKED;
    }
    return CardStatus.ACTIVE;
  }

  private async fetchFundingAssets(
    fundingSourceIds: string[],
    tokens: CardAuthTokens,
  ): Promise<CardFundingAsset[]> {
    if (fundingSourceIds.length === 0) return [];

    const details = await Promise.all(
      fundingSourceIds.map((id) =>
        this.service
          .get<ImmersveFundingSourceDetail>(`/api/funding-source/${id}`, tokens)
          .catch((error) => {
            if (isCardAuthTokenError(error)) throw error;
            Logger.error(
              error as Error,
              getErrorContext('fetchFundingAssets', { fundingSourceId: id }),
            );
            return null;
          }),
      ),
    );

    const assets = details.map((detail) =>
      detail ? this.mapFundingSource(detail, tokens) : null,
    );

    return assets.filter((asset): asset is CardFundingAsset => asset !== null);
  }

  private mapFundingSource(
    fundingSource: ImmersveFundingSourceDetail,
    tokens: CardAuthTokens,
  ): CardFundingAsset | null {
    let tokenInfo: ImmersveFundingTokenInfo;
    try {
      tokenInfo = immersveNetworkToFundingToken(fundingSource.network);
    } catch (error) {
      Logger.error(
        error as Error,
        getErrorContext('mapFundingSource', { network: fundingSource.network }),
      );
      return null;
    }

    const symbol = fundingSource.balanceCurrency ?? 'USDC';
    // Immersve always reports a funding-source balance of 0, so we leave the
    // balance empty and let the client resolve the real on-chain balance from
    // the asset controllers (useAssetBalances) for the wallet address.
    const walletAddress =
      tokens.accountAddress ?? fundingSource.externalId ?? '';

    return {
      symbol,
      name: symbol,
      address: tokenInfo.tokenAddress,
      walletAddress,
      decimals: tokenInfo.decimals,
      chainId: tokenInfo.caipChainId as CaipChainId,
      spendableBalance: '',
      spendingCap: '',
      priority: 0,
      status: FundingAssetStatus.Active,
      assumeUsdParity: isUsdStablecoin(symbol),
    };
  }
}
