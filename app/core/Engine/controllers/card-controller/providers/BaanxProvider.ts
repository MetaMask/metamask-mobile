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
  UserResponse,
  RegistrationSettingsResponse,
  CardLocation,
  CardStatus,
  CardType,
  type CardNetwork,
} from '../../../../../components/UI/Card/types';
import type { CardFeatureFlag } from '../../../../../selectors/featureFlagController/card';
import {
  ARBITRARY_ALLOWANCE,
  SUPPORTED_ASSET_NETWORKS,
  cardNetworkInfos,
  caipChainIdToNetwork,
  SPENDING_LIMIT_UNSUPPORTED_TOKENS,
} from '../../../../../components/UI/Card/constants';
import { buildBaanxCardholderName } from './utils/cardholderName';
import {
  generatePKCEPair,
  generateState,
} from '../../../../../components/UI/Card/util/pkceHelpers';
import { mapCountryToLocation } from '../../../../../components/UI/Card/util/mapCountryToLocation';
import { networkToCaipChainId } from '../../../../../components/UI/Card/util/redeemDestination';
import type { BaanxService } from '../services/BaanxService';
import {
  CardApiError,
  toCardProviderError,
} from '../services/cardHttpObservability';
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
  CardHomeData,
  CardProviderCapabilities,
  ApplePayProvisioningParams,
  CardWalletProvisioningInfo,
  CardSecureView,
  CardSecureViewParams,
  AuthTokenValidity,
  FundingApprovalParams,
  ICardProvider,
  OnboardingStep,
  OnboardingStepResult,
  RegistrationSettings,
  RegistrationStatus,
  FundingAssetStatus,
  CardProviderError,
  CardProviderErrorCode,
  CashbackWalletResponse,
  CashbackWithdrawEstimationResponse,
  CashbackWithdrawParams,
  CashbackWithdrawResponse,
  CreditWalletResponse,
  CreditWithdrawEstimationResponse,
  CreditWithdrawParams,
  CreditWithdrawResponse,
  type DelegationChallengeResponse,
  type CompleteMoneyAccountLinkParams,
  type MoneyAccountLinkPreparation,
  type PrepareMoneyAccountLinkParams,
  emptyCardHomeData,
  isCardAuthTokenError,
  logUnreportedCardError,
  CardProviderIds,
  CardTransactionStatus,
  CardTransactionType,
  CardMerchantCategory,
  type CardTransaction,
  type CardTransactionFundingSource,
  type CardTransactionListParams,
  type CardTransactionPage,
} from '../provider-types';
import { decodeCardCursor, encodeCardCursor } from '../utils/transactionCursor';
import { resolveMoneyAccountCardToken } from '../utils/moneyAccountCardToken';
import {
  MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
  MONEY_ACCOUNT_DELEGATION_NETWORK,
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
} from '../../../../../components/UI/Card/util/vedaToken';
import AppConstants from '../../../../AppConstants';

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

// -- Transactions (GET /v1/card/transactions) --

/**
 * Cursor payload for Baanx page-based pagination. `pg` is the next 0-indexed
 * page to fetch; `i` contains page 0's row ids, used to detect the API's
 * out-of-range behavior (it silently returns page 0 again instead of an empty
 * page).
 */
interface BaanxCursorPayload {
  pg: number;
  /** IDs from page 0, used to detect the API wrapping back to page 0. */
  i?: string[];
}

interface BaanxFundingSourceRaw {
  id?: string;
  address?: string;
  network?: string;
  txHash?: string;
  currency?: string;
  amount?: string;
  fees?: string;
  swapFee?: string;
}

interface BaanxTransactionRaw {
  id: string;
  cardId?: string;
  panLast4?: string;
  transactionId?: string;
  dateTime: string;
  sign: 'DEBIT' | 'CREDIT';
  merchantNameLocation?: string;
  merchantType?: string;
  merchantId?: string;
  mcc?: number;
  mccCategory?: string;
  transactionCurrency: string;
  amountInTransactionCurrency: string;
  feesInTransactionCurrency?: string;
  originalCurrency?: string;
  amountInOriginalCurrency?: string;
  feesInOriginalCurrency?: string;
  billingConversionRate?: string;
  status: 'CONFIRMED' | 'PENDING' | 'DECLINED' | 'REVERTED';
  declineReason?: string;
  fundingSources?: BaanxFundingSourceRaw[];
}

const BAANX_STATUS_MAP: Record<
  BaanxTransactionRaw['status'],
  CardTransactionStatus
> = {
  PENDING: CardTransactionStatus.Pending,
  CONFIRMED: CardTransactionStatus.Completed,
  DECLINED: CardTransactionStatus.Failed,
  REVERTED: CardTransactionStatus.Reversed,
};

const BAANX_MCC_CATEGORY_MAP: Record<string, CardMerchantCategory> = {
  SUBSCRIPTIONS: CardMerchantCategory.Subscriptions,
  FOOD: CardMerchantCategory.Food,
  TRAVEL: CardMerchantCategory.Travel,
  ENTERTAINMENT: CardMerchantCategory.Entertainment,
  HEALTH: CardMerchantCategory.Health,
  ATM: CardMerchantCategory.Atm,
  UTILITIES: CardMerchantCategory.Utilities,
  MISC: CardMerchantCategory.Misc,
};

/** Baanx date filters take ISO date-only strings (YYYY-MM-DD). */
function toDateOnly(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

function isBaanxCursorPayload(value: unknown): value is BaanxCursorPayload {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const payload = value as Partial<BaanxCursorPayload>;
  if (!Number.isSafeInteger(payload.pg) || (payload.pg ?? 0) <= 0) {
    return false;
  }
  return (
    Array.isArray(payload.i) &&
    payload.i.length > 0 &&
    payload.i.every((id) => typeof id === 'string' && id.length > 0)
  );
}

/**
 * Detects Baanx returning page 0 for an out-of-range page request.
 *
 * If new transactions arrive between requests, a wrapped page contains those
 * unseen rows followed by a prefix of the original page 0. A real next page
 * instead contains a suffix of the original page 0 followed by older unseen
 * rows. Comparing this ordering avoids treating a shifted real page as the end.
 */
function isWrappedTransactionPage(
  items: BaanxTransactionRaw[],
  pageZeroIds: string[],
): boolean {
  const pageZeroIdSet = new Set(pageZeroIds);
  const firstKnownIndex = items.findIndex((item) => pageZeroIdSet.has(item.id));
  if (firstKnownIndex === -1) {
    return false;
  }

  const knownSuffix = items.slice(firstKnownIndex);
  if (knownSuffix.some((item) => !pageZeroIdSet.has(item.id))) {
    return false;
  }

  return knownSuffix.every((item, index) => item.id === pageZeroIds[index]);
}

// Earliest block where the FoxConnect spender contracts were deployed on Linea.
// Used as fromBlock for Approval event log queries to avoid scanning from genesis.
const SPENDERS_DEPLOYED_BLOCK = 2715910;

const APPROVAL_IFACE = new ethers.utils.Interface([
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]);

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

function mapAllowanceToFundingStatus(
  allowanceFloat: number,
): FundingAssetStatus {
  if (allowanceFloat === 0) return FundingAssetStatus.Inactive;
  if (allowanceFloat < ARBITRARY_ALLOWANCE) return FundingAssetStatus.Limited;
  return FundingAssetStatus.Active;
}

function baanxProvisioningCountryCode(
  location: string,
  countryOfResidence: string | null | undefined,
): string | undefined {
  if (location === 'us') {
    return 'US';
  }
  const residence = countryOfResidence?.trim();
  if (!residence) {
    return undefined;
  }
  return residence.toUpperCase();
}

export class BaanxProvider implements ICardProvider {
  readonly id = CardProviderIds.Baanx;

  readonly capabilities: CardProviderCapabilities = {
    authMethod: 'email_password',
    supportsOTP: true,
    supportsFundingApproval: true,
    supportsFundingLimits: true,
    fundingChains: ['eip155:59144', 'eip155:8453'],
    supportsFreeze: true,
    pushProvisioning: { applePay: true, googlePay: true },
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
    supportsPinSet: false,
    supportsCashback: true,
    supportsCredit: true,
    supportsSensitiveDetailsView: false,
    supportsTravel: true,
    supportsTransactionHistory: true,
    supportsContactDetails: false,
    supportsMoneyAccountLinking: true,
    usesMoneyAccountDelegationSettings: true,
    reportsVerificationStatus: true,
  };
  private readonly service: BaanxService;
  private readonly getCardFeatureFlag: () => CardFeatureFlag | null;

  constructor({
    service,
    cardFeatureFlag,
    getCardFeatureFlag,
  }: {
    service: BaanxService;
    cardFeatureFlag?: CardFeatureFlag;
    getCardFeatureFlag?: () => CardFeatureFlag | null | undefined;
  }) {
    this.service = service;
    this.getCardFeatureFlag = () =>
      getCardFeatureFlag?.() ?? cardFeatureFlag ?? null;
  }

  private get cardFeatureFlag(): CardFeatureFlag | null {
    return this.getCardFeatureFlag();
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
    if (credentials.type === 'email_code') {
      return this.handleEmailCode(session, credentials);
    }
    throw new Error(`Unsupported credential type: ${credentials.type}`);
  }

  async requestEmailLoginCode(email: string): Promise<void> {
    try {
      await this.service.post('/v1/auth/login/email-code/request', { email });
    } catch (error) {
      throw toCardProviderError(error, 'requestEmailLoginCode');
    }
  }

  async executeStepAction(session: CardAuthSession): Promise<void> {
    if (session._metadata.otpMode === 'TOTP') {
      return;
    }
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
      throw new CardProviderError(
        CardProviderErrorCode.InvalidCredentials,
        'No refresh token available',
        401,
      );
    }

    let response: CardExchangeTokenRawResponse;
    try {
      response = await this.service.request<CardExchangeTokenRawResponse>(
        '/v1/auth/oauth/token',
        {
          method: 'POST',
          body: {
            grant_type: 'refresh_token',
            refresh_token: tokens.refreshToken,
          },
          headers: { 'x-secret-key': this.service.apiKey },
          unreportedStatuses: [400, 403],
        },
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
          undefined,
          { requestId: error.requestId, reported: error.reported },
        );
      }
      throw toCardProviderError(error, 'refreshTokens');
    }

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      accessTokenExpiresAt: Date.now() + response.expires_in * 1000,
      refreshTokenExpiresAt:
        Date.now() + response.refresh_token_expires_in * 1000,
      location: tokens.location,
      providerUserId: tokens.providerUserId,
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

  /**
   * Full authenticated Baanx profile (`GET /v1/user`), including contact fields
   * used for UK migration SignUp prefill.
   */
  async getUserDetails(tokens: CardAuthTokens): Promise<UserResponse> {
    try {
      return await this.service.get<UserResponse>('/v1/user', tokens);
    } catch (error) {
      throw toCardProviderError(error, 'getUserDetails');
    }
  }

  /**
   * Signals Exodus that this Baanx user started Immersve onboarding and wants
   * their Exodus account closed (`POST /v1/user/closure`). A 400 means the
   * closure was already requested and is treated as success.
   */
  async requestAccountClosure(tokens: CardAuthTokens): Promise<void> {
    try {
      const userId =
        tokens.providerUserId ?? (await this.getUserDetails(tokens)).id;
      await this.service.request('/v1/user/closure', {
        method: 'POST',
        body: { userId },
        tokenSet: tokens,
        unreportedStatuses: [400],
      });
    } catch (error) {
      if (error instanceof CardApiError && error.statusCode === 400) {
        return;
      }
      throw toCardProviderError(error, 'requestAccountClosure');
    }
  }

  // -- Card Home Data --

  async getCardHomeData(
    _address: string,
    tokens: CardAuthTokens,
  ): Promise<CardHomeData> {
    const swallowUnlessAuthError =
      (logContext: string) =>
      (err: unknown): null => {
        if (isCardAuthTokenError(err)) {
          throw toCardProviderError(err, logContext);
        }
        // getUserDetails maps CardApiError → CardProviderError before this
        // catch runs, so check statusCode on both shapes.
        if (
          (err instanceof CardApiError || err instanceof CardProviderError) &&
          err.statusCode === 429
        ) {
          throw toCardProviderError(err, logContext);
        }
        logUnreportedCardError(err, getErrorContext(logContext));
        return null;
      };

    try {
      const [delegationSettings, cardDetailsResponse, user] = await Promise.all(
        [
          this.service
            .get<DelegationSettingsResponse>(
              '/v1/delegation/chain/config',
              tokens,
            )
            .catch(
              swallowUnlessAuthError('getCardHomeData.delegationSettings'),
            ),
          this.service
            .get<CardDetailsResponse>('/v1/card/status', tokens)
            .catch(swallowUnlessAuthError('getCardHomeData.cardDetails')),
          this.getUserDetails(tokens).catch(
            swallowUnlessAuthError('getCardHomeData.user'),
          ),
        ],
      );

      const { details: walletDetails, priorities: externalWalletPriority } =
        delegationSettings
          ? await this.fetchWalletDetails(tokens)
          : { details: [], priorities: [] };

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
        ? this.mapCardDetails(
            cardDetailsResponse,
            tokens.location as CardLocation,
          )
        : null;
      const account = user ? this.mapAccountStatus(user) : null;
      const walletProvisioning = this.mapWalletProvisioning(
        user,
        card,
        tokens.location,
      );
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
        walletProvisioning,
        alerts,
        actions,
        delegationSettings,
        externalWalletPriority,
      };
    } catch (error) {
      if (isCardAuthTokenError(error)) {
        throw error;
      }
      if (
        (error instanceof CardApiError || error instanceof CardProviderError) &&
        error.statusCode === 429
      ) {
        throw error instanceof CardApiError
          ? toCardProviderError(error, 'getCardHomeData')
          : error;
      }
      logUnreportedCardError(error, getErrorContext('getCardHomeData'));
      return emptyCardHomeData();
    }
  }

  // -- Card Operations --

  async getCardDetails(tokens: CardAuthTokens): Promise<CardDetails> {
    try {
      const response = await this.service.request<CardDetailsResponse>(
        '/v1/card/status',
        { tokenSet: tokens, unreportedStatuses: [404] },
      );
      return this.mapCardDetails(response, tokens.location as CardLocation);
    } catch (error) {
      if (error instanceof CardApiError && error.statusCode === 404) {
        throw new CardProviderError(
          CardProviderErrorCode.NoCard,
          'User has no card',
          404,
        );
      }
      throw toCardProviderError(error, 'getCardDetails');
    }
  }

  /**
   * Lists card transactions (newest first) from `GET /v1/card/transactions`.
   *
   * Baanx paginates with a 0-indexed `page` query param and a server-fixed
   * page size, wrapped here into an opaque cursor. Requesting a page past the
   * end returns page 0 again rather than an empty list, so the cursor also
   * carries page 0's ordered row ids. Their position on later pages
   * distinguishes a wrapped page 0 from a real page shifted by newly-arrived
   * transactions.
   *
   * The server page size is unknown, so page length says nothing about whether
   * more pages remain: the end of the list is only reached once a page comes
   * back empty or wrapped. That costs one extra request per list.
   *
   * `params.limit` is accepted for interface compatibility but ignored: the
   * page size is fixed server-side.
   */
  async listTransactions(
    params: CardTransactionListParams,
    tokens: CardAuthTokens,
  ): Promise<CardTransactionPage> {
    try {
      const decodedCursor = params.cursor
        ? decodeCardCursor<unknown>(params.cursor, this.id)
        : null;
      if (params.cursor && !isBaanxCursorPayload(decodedCursor)) {
        throw new CardProviderError(
          CardProviderErrorCode.Unknown,
          'Invalid transaction pagination cursor',
        );
      }
      const cursorPayload = isBaanxCursorPayload(decodedCursor)
        ? decodedCursor
        : null;
      const page = cursorPayload?.pg ?? 0;
      const pageZeroIds = cursorPayload?.i ?? [];

      const query = new URLSearchParams();
      query.set('page', String(page));
      // The API rejects a lone dateFrom/dateTo; only send them as a pair.
      if (params.fromDate != null && params.toDate != null) {
        query.set('dateFrom', toDateOnly(params.fromDate));
        query.set('dateTo', toDateOnly(params.toDate));
      }

      const raw = await this.service.get<BaanxTransactionRaw[]>(
        `/v1/card/transactions?${query.toString()}`,
        tokens,
      );
      const items = Array.isArray(raw) ? raw : [];

      if (items.length === 0) {
        return { items: [] };
      }

      // Out-of-range page wrapped back to page 0: treat as end of list.
      if (
        page > 0 &&
        pageZeroIds.length > 0 &&
        isWrappedTransactionPage(items, pageZeroIds)
      ) {
        return { items: [] };
      }

      const mapped = items.map((tx) => this.mapBaanxTransaction(tx));
      const nextCursor = encodeCardCursor(this.id, {
        pg: page + 1,
        i: page === 0 ? items.map((item) => item.id) : pageZeroIds,
      } satisfies BaanxCursorPayload);

      return { items: mapped, nextCursor };
    } catch (error) {
      throw toCardProviderError(error, 'listTransactions');
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

  async fetchDelegationChallenge(
    params: { network: string; address: string; faucet?: boolean },
    tokens: CardAuthTokens,
  ): Promise<DelegationChallengeResponse> {
    const query = new URLSearchParams({
      network: params.network,
      address: params.address,
      ...(params.faucet ? { faucet: 'true' } : {}),
    }).toString();

    const response = await this.service.get<{
      token: string;
      expiresAt: string;
      nonce: string;
    }>(`/v1/delegation/token?${query}`, tokens);

    return {
      delegationToken: response.token,
      nonce: response.nonce,
      expiresAt: response.expiresAt,
    };
  }

  generateCardDelegationSignatureMessage(params: {
    network: string;
    address: string;
    nonce: string;
    caipChainId?: string;
  }): string {
    const { network, address, nonce, caipChainId } = params;
    const now = new Date();
    const domain = AppConstants.MM_UNIVERSAL_LINK_HOST;
    const uri = `https://${domain}`;

    if (network === 'solana') {
      return `${domain} wants you to sign in with your Solana account:\n${address}\n\nProve address ownership\n\nURI: ${uri}\nVersion: 1\nChain ID: 1\nNonce: ${nonce}\nIssued At: ${now.toISOString()}`;
    }

    const expirationTime = new Date(now.getTime() + 2 * 60 * 1000);
    const chainId = caipChainId?.split(':')[1] ?? '59144';
    return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nProve address ownership\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${now.toISOString()}\nExpiration Time: ${expirationTime.toISOString()}`;
  }

  // -- Funding Approval --

  async approveFunding(
    params: FundingApprovalParams,
    tokens: CardAuthTokens,
  ): Promise<void> {
    if (
      params.txHash === undefined ||
      params.sigHash === undefined ||
      params.sigMessage === undefined ||
      params.token === undefined
    ) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'approveFunding requires txHash, sigHash, sigMessage, and delegation token',
      );
    }

    const isSolana = params.network === 'solana';
    const endpoint = isSolana
      ? '/v1/delegation/solana/post-approval'
      : '/v1/delegation/evm/post-approval';

    await this.service.post(
      endpoint,
      {
        address: params.address,
        network: params.network,
        currency: params.currency.toLowerCase(),
        amount: params.amount,
        txHash: params.txHash,
        sigHash: params.sigHash,
        sigMessage: params.sigMessage,
        token: params.token,
      },
      tokens,
    );
  }

  async prepareMoneyAccountLink(
    params: PrepareMoneyAccountLinkParams,
    tokens: CardAuthTokens,
  ): Promise<MoneyAccountLinkPreparation> {
    const cardToken = resolveMoneyAccountCardToken(params.delegationSettings);
    if (!cardToken) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Money Account Card spending token unavailable',
      );
    }

    const tokenAddress = cardToken.stagingTokenAddress ?? cardToken.address;
    if (!tokenAddress) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Money Account Card spending token address missing',
      );
    }
    if (!cardToken.delegationContract) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Money Account Card delegation contract missing',
      );
    }

    const { delegationToken, nonce } = await this.fetchDelegationChallenge(
      {
        network: MONEY_ACCOUNT_DELEGATION_NETWORK,
        address: params.moneyAccountAddress,
      },
      tokens,
    );
    const caipChainId =
      cardToken.caipChainId ?? MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID;
    const signatureMessage = this.generateCardDelegationSignatureMessage({
      network: MONEY_ACCOUNT_DELEGATION_NETWORK,
      address: params.moneyAccountAddress,
      nonce,
      caipChainId,
    });

    return {
      tokenAddress,
      spender: cardToken.delegationContract,
      decimals: cardToken.decimals ?? 6,
      caipChainId,
      context: {
        signatureMessage,
        delegationToken,
        network: MONEY_ACCOUNT_DELEGATION_NETWORK,
        currency: MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
      },
    };
  }

  async completeMoneyAccountLink(
    params: CompleteMoneyAccountLinkParams,
    tokens: CardAuthTokens,
  ): Promise<void> {
    const { signatureMessage, delegationToken, network, currency } =
      params.context;
    if (!params.sigHash || !signatureMessage || !delegationToken) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Money account link completion is missing the delegation signature',
      );
    }

    await this.approveFunding(
      {
        address: params.moneyAccountAddress,
        network: network ?? MONEY_ACCOUNT_DELEGATION_NETWORK,
        currency: currency ?? MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
        amount: params.amountHuman,
        txHash: params.txHash,
        sigHash: params.sigHash,
        sigMessage: signatureMessage,
        token: delegationToken,
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
      logUnreportedCardError(error, getErrorContext('submitOnboardingStep'));
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
    params: ApplePayProvisioningParams,
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
    }>(
      '/v1/card/wallet/provision/apple',
      this.toBaanxApplePayWire(params),
      tokens,
    );

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
    try {
      return await this.service.get<CashbackWalletResponse>(
        '/v1/wallet/reward',
        tokens,
      );
    } catch (error) {
      throw toCardProviderError(error, 'getCashbackWallet');
    }
  }

  async getCashbackWithdrawEstimation(
    tokens: CardAuthTokens,
  ): Promise<CashbackWithdrawEstimationResponse> {
    try {
      return await this.service.get<CashbackWithdrawEstimationResponse>(
        '/v1/wallet/reward/withdraw-estimation',
        tokens,
      );
    } catch (error) {
      throw toCardProviderError(error, 'getCashbackWithdrawEstimation');
    }
  }

  async withdrawCashback(
    params: CashbackWithdrawParams,
    tokens: CardAuthTokens,
  ): Promise<CashbackWithdrawResponse> {
    try {
      return await this.service.post<CashbackWithdrawResponse>(
        '/v1/wallet/reward/withdraw',
        params,
        tokens,
      );
    } catch (error) {
      throw toCardProviderError(error, 'withdrawCashback');
    }
  }

  // -- Credit --

  async getCreditWallet(tokens: CardAuthTokens): Promise<CreditWalletResponse> {
    try {
      return await this.service.get<CreditWalletResponse>(
        '/v1/wallet/credit',
        tokens,
      );
    } catch (error) {
      throw toCardProviderError(error, 'getCreditWallet');
    }
  }

  async getCreditWithdrawEstimation(
    tokens: CardAuthTokens,
  ): Promise<CreditWithdrawEstimationResponse> {
    try {
      return await this.service.get<CreditWithdrawEstimationResponse>(
        '/v1/wallet/credit/withdraw-estimation',
        tokens,
      );
    } catch (error) {
      throw toCardProviderError(error, 'getCreditWithdrawEstimation');
    }
  }

  async withdrawCredit(
    params: CreditWithdrawParams,
    tokens: CardAuthTokens,
  ): Promise<CreditWithdrawResponse> {
    try {
      return await this.service.post<CreditWithdrawResponse>(
        '/v1/wallet/credit/withdraw',
        params,
        tokens,
      );
    } catch (error) {
      throw toCardProviderError(error, 'withdrawCredit');
    }
  }

  /**
   * Fetches ERC-20 Approval event logs for `owner` across multiple token
   * contracts, filtered to `spenderTopics`, and returns them sorted
   * oldest-first (ascending block/logIndex).
   *
   * @param spenderTopics - a single hex-padded spender topic string, or an
   * array of them (OR-filter across spenders).
   */
  async #getApprovalLogs(
    provider: ethers.providers.StaticJsonRpcProvider,
    owner: string,
    tokenAddresses: string[],
    spenderTopics: string | string[],
  ): Promise<(ethers.providers.Log & { tokenAddress: string })[]> {
    const approvalTopic = APPROVAL_IFACE.getEventTopic('Approval');
    const ownerTopic = ethers.utils.hexZeroPad(owner.toLowerCase(), 32);

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
    return allLogs;
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
      // Extract numeric chainId from CAIP format (e.g. "eip155:59144" → 59144).
      // Using StaticJsonRpcProvider with pre-specified network avoids the automatic
      // eth_chainId + net_version detection calls that JsonRpcProvider fires on construction.
      const numericChainId = parseInt(asset.chainId.split(':')[1], 10);
      if (isNaN(numericChainId)) return null;
      const provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl, {
        chainId: numericChainId,
        name: cardNetwork,
      });

      const spenderTopic = ethers.utils.hexZeroPad(
        network.delegationContract.toLowerCase(),
        32,
      );

      const logs = await this.#getApprovalLogs(
        provider,
        asset.walletAddress,
        [tokenAddress],
        spenderTopic,
      );

      if (logs.length === 0) return null;

      const latestLog = logs[logs.length - 1];
      const { args } = APPROVAL_IFACE.parseLog(latestLog);
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
        {
          // 403/404 are invalid credentials. 400 is an invalid OTP only when
          // a code was submitted; other 400s stay reportable.
          unreportedStatuses: credentials.otpCode
            ? [400, 403, 404]
            : [403, 404],
        },
      );
    } catch (error) {
      throw mapLoginError(error, !!credentials.otpCode);
    }

    if (loginResponse.isOtpRequired) {
      session._metadata.otpUserId = loginResponse.userId;
      delete session._metadata.otpMode;
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
      throw toCardProviderError(error, 'completeAuth');
    }
  }

  private async handleEmailCode(
    session: CardAuthSession,
    credentials: Extract<CardCredentials, { type: 'email_code' }>,
  ): Promise<CardAuthResult> {
    let loginResponse: CardLoginResponse & {
      otpMode?: 'SMS' | 'TOTP' | null;
    };
    try {
      loginResponse = await this.service.post('/v1/auth/login/email-code', {
        email: credentials.email,
        code: credentials.code,
        ...(credentials.otpCode ? { otpCode: credentials.otpCode } : {}),
      });
    } catch (error) {
      throw mapLoginError(error, !!credentials.otpCode);
    }

    if (loginResponse.isOtpRequired) {
      const mode = loginResponse.otpMode === 'TOTP' ? 'TOTP' : 'SMS';
      session._metadata.otpUserId = loginResponse.userId;
      session._metadata.otpMode = mode;
      return {
        done: false,
        nextStep: {
          type: 'otp',
          destination: loginResponse.phoneNumber ?? credentials.email,
          mode,
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

    if (!loginResponse.accessToken) {
      throw new CardProviderError(
        CardProviderErrorCode.Unknown,
        'Email-code login response missing access token',
      );
    }

    try {
      return await this.completeAuth(session, loginResponse);
    } catch (error) {
      throw toCardProviderError(error, 'completeAuth');
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
      providerUserId: loginResponse.userId,
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
  private async fetchWalletDetails(tokens: CardAuthTokens): Promise<{
    details: CardExternalWalletDetail[];
    priorities: CardWalletExternalPriorityResponse[];
  }> {
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
          .catch((err) => {
            if (isCardAuthTokenError(err)) throw err;
            return [] as CardWalletExternalPriorityResponse[];
          }),
      ]);

      if (!rawWallets?.length) return { details: [], priorities };

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

      return {
        details: enriched.sort((a, b) => a.priority - b.priority),
        priorities,
      };
    } catch (error) {
      if (isCardAuthTokenError(error)) {
        throw toCardProviderError(error, 'fetchWalletDetails');
      }
      logUnreportedCardError(error, getErrorContext('fetchWalletDetails'));
      return { details: [], priorities: [] };
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

  private mapCardDetails(
    response: CardDetailsResponse,
    location: CardLocation,
  ): CardDetails {
    return {
      id: response.id,
      status: response.status,
      type: response.type,
      lastFour: response.panLast4,
      holderName: response.holderName,
      isFreezable: response.isFreezable,
      hasPin: location === 'us' || response.type !== CardType.VIRTUAL,
    };
  }

  private mapBaanxTransaction(raw: BaanxTransactionRaw): CardTransaction {
    const isDebit = raw.sign === 'DEBIT';
    const category = raw.mccCategory
      ? BAANX_MCC_CATEGORY_MAP[raw.mccCategory.toUpperCase()]
      : undefined;
    const merchantType = raw.merchantType ?? '';
    const isAtm =
      category === CardMerchantCategory.Atm ||
      merchantType.toUpperCase().includes('ATM');

    let type: CardTransactionType;
    if (!isDebit) {
      type = CardTransactionType.Refund;
    } else if (isAtm) {
      type = CardTransactionType.Withdrawal;
    } else {
      type = CardTransactionType.Purchase;
    }

    const { name, city } = this.parseMerchantNameLocation(
      raw.merchantNameLocation,
    );

    const fundingSources: CardTransactionFundingSource[] = (
      raw.fundingSources ?? []
    ).map((fs) => ({
      txHash: fs.txHash,
      walletAddress: fs.address,
      network: fs.network,
      chainId: networkToCaipChainId(fs.network),
      amount: fs.amount,
      currency: fs.currency,
      fees: fs.fees,
      swapFee: fs.swapFee,
    }));

    const declineMessage = raw.declineReason?.trim();

    return {
      id: raw.id,
      providerId: this.id,
      timestamp: new Date(raw.dateTime).getTime(),
      // Unknown future statuses must never be represented as successful.
      status: BAANX_STATUS_MAP[raw.status] ?? CardTransactionStatus.Pending,
      type,
      isDebit,
      billingAmount: {
        value: raw.amountInTransactionCurrency,
        currency: raw.transactionCurrency,
      },
      originalAmount:
        raw.originalCurrency &&
        raw.amountInOriginalCurrency &&
        raw.originalCurrency !== raw.transactionCurrency
          ? {
              value: raw.amountInOriginalCurrency,
              currency: raw.originalCurrency,
            }
          : undefined,
      feeAmount:
        raw.feesInTransactionCurrency && raw.feesInTransactionCurrency !== '0'
          ? {
              value: raw.feesInTransactionCurrency,
              currency: raw.transactionCurrency,
            }
          : undefined,
      conversionRate: raw.billingConversionRate,
      merchant: name
        ? {
            name,
            city,
            id: raw.merchantId,
            mcc: raw.mcc != null ? String(raw.mcc) : undefined,
            category,
          }
        : undefined,
      description: raw.merchantNameLocation,
      reference: raw.transactionId,
      cardLastFour: raw.panLast4,
      declineReason: declineMessage ? { message: declineMessage } : undefined,
      fundingSources,
    };
  }

  /**
   * Baanx concatenates merchant name and location into one field, e.g.
   * "WWW.ALIEXPRESS.COM, LONDON". The city is the segment after the last
   * comma; merchant names may themselves contain commas.
   */
  private parseMerchantNameLocation(combined?: string): {
    name?: string;
    city?: string;
  } {
    if (!combined?.trim()) {
      return {};
    }
    const lastComma = combined.lastIndexOf(',');
    if (lastComma === -1) {
      return { name: combined.trim() };
    }
    return {
      name: combined.slice(0, lastComma).trim(),
      city: combined.slice(lastComma + 1).trim() || undefined,
    };
  }

  private mapWalletProvisioning(
    user: UserResponse | null,
    card: CardDetails | null,
    location: string,
  ): CardWalletProvisioningInfo | null {
    if (!user || !card) {
      return null;
    }

    const countryCode = baanxProvisioningCountryCode(
      location,
      user.countryOfResidence,
    );
    const cardProcessor =
      typeof user.cardProvider === 'string' && user.cardProvider.length > 0
        ? user.cardProvider
        : undefined;

    return {
      eligible: card.status === CardStatus.ACTIVE,
      cardholderName: buildBaanxCardholderName(user),
      lastFour: card.lastFour,
      network: 'MASTERCARD',
      ...(countryCode ? { countryCode } : {}),
      ...(cardProcessor ? { cardProcessor } : {}),
    };
  }

  private toBaanxApplePayWire(params: ApplePayProvisioningParams): {
    leafCertificate: string;
    intermediateCertificate: string;
    nonce: string;
    nonceSignature: string;
  } {
    if (params.certificates.length < 2) {
      throw new CardProviderError(
        CardProviderErrorCode.InvalidRequest,
        'Apple Pay certificate chain must include a leaf and intermediate',
      );
    }

    const toHex = (value: string) =>
      Buffer.from(value, 'base64').toString('hex');

    return {
      leafCertificate: toHex(params.certificates[0]),
      intermediateCertificate: toHex(params.certificates[1]),
      nonce: toHex(params.nonce),
      nonceSignature: toHex(params.nonceSignature),
    };
  }

  private mapAccountStatus(user: UserResponse): CardAccountStatus {
    return {
      verificationStatus: user.verificationState ?? null,
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
      countryOfResidence: user.countryOfResidence
        ? user.countryOfResidence.toUpperCase()
        : null,
      usState: user.usState ? user.usState.toUpperCase() : null,
      createdAt: user.createdAt ?? null,
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

    if (card.status !== CardStatus.BLOCKED && asset) {
      return [{ type: 'add_funds', enabled: true }];
    }

    return [];
  }

  /**
   * Enriches funding assets with `delegationContract` from matching networks.
   * Inactive placeholders are synthesized by `selectCardAvailableTokens` so
   * they reflect the current wallet without requiring a refetch.
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

      for (const existing of result) {
        if (existing.chainId === chainId && !existing.delegationContract) {
          existing.delegationContract = network.delegationContract;
        }
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
