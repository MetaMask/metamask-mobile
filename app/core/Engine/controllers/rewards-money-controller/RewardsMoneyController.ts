import { BaseController, type StateMetadata } from '@metamask/base-controller';
import { wrapWithCache } from '../rewards-controller/RewardsController';
import Logger from '../../../../util/Logger';
import type { RewardsMoneyControllerMessenger } from '../../messengers/rewards-money-controller-messenger';
import {
  defaultRewardsMoneyControllerState,
  getRewardsMoneyControllerDefaultState,
} from './defaultState';
import {
  CLAIM_BY_ID_CACHE_MAX_ENTRIES,
  REWARDS_MONEY_CONTROLLER_NAME,
  type ClaimDto,
  type ClaimHistoryPageDto,
  type CommissionsPageDto,
  type EarningOriginType,
  type EarningsLedgerPageDto,
  type EarningsSummaryDto,
  type GetClaimByIdDto,
  type GetClaimHistoryDto,
  type GetCommissionsDto,
  type GetEarningsLedgerDto,
  type EarningsSummaryQuery,
  type GetEarningsSummaryDto,
  type GetReferralCodesDto,
  type GetReferralFunnelDto,
  type GetReferralMeDto,
  type OwnReferralCodesDto,
  type PerpsRebateTrade,
  type RebateQuoteBody,
  type RebateQuoteResponse,
  type SwapsRebateBridgeQuote,
  type ReferralFunnelDto,
  type ReferralMeDto,
  type ReferrerOriginType,
  type RegisterRefereeDto,
  type RewardsMoneyControllerState,
} from './types';

export type { RewardsMoneyControllerMessenger };

const controllerName = REWARDS_MONEY_CONTROLLER_NAME;

/** Identity-style reads: role, codes, claim detail — not per-trade. */
export const REFERRAL_ME_CACHE_THRESHOLD_MS = 300_000;
export const REFERRAL_CODES_CACHE_THRESHOLD_MS = 300_000;
export const CLAIM_BY_ID_CACHE_THRESHOLD_MS = 300_000;

/** Money / funnel cadence — moves with enrollments and fills. */
export const REFERRAL_FUNNEL_CACHE_THRESHOLD_MS = 60_000;
export const EARNINGS_SUMMARY_CACHE_THRESHOLD_MS = 60_000;
export const EARNINGS_LEDGER_CACHE_THRESHOLD_MS = 60_000;
export const CLAIM_HISTORY_CACHE_THRESHOLD_MS = 60_000;
export const COMMISSIONS_CACHE_THRESHOLD_MS = 60_000;

const metadata: StateMetadata<RewardsMoneyControllerState> = {
  referralMe: {
    includeInStateLogs: false,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  referralCodes: {
    includeInStateLogs: false,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  referralFunnel: {
    includeInStateLogs: false,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  earningsSummary: {
    includeInStateLogs: false,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  earningsLedgerFirstPage: {
    includeInStateLogs: false,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  claimHistoryFirstPage: {
    includeInStateLogs: false,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  commissionsFirstPage: {
    includeInStateLogs: false,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  claimById: {
    includeInStateLogs: false,
    persist: true,
    includeInDebugSnapshot: false,
    usedInUi: true,
  },
  rewardsMoneyEnvUrl: {
    includeInStateLogs: true,
    persist: true,
    includeInDebugSnapshot: true,
    usedInUi: false,
  },
};

export {
  defaultRewardsMoneyControllerState,
  getRewardsMoneyControllerDefaultState,
};

function compareOriginTypes(
  a: EarningOriginType,
  b: EarningOriginType,
): number {
  return a.localeCompare(b);
}

export function originTypeScopeKey(originTypes?: EarningOriginType[]): string {
  if (!originTypes || originTypes.length === 0) {
    return 'all';
  }
  return [...originTypes].sort(compareOriginTypes).join(',');
}

/**
 * Cache key for an earnings summary.
 *
 * The default call — no window, claimability included — stays on the origin-type
 * key the heroes already read. A windowed lifetime is a different figure and
 * omits `claimable`, so it must not land in that bucket.
 */
export function summaryScopeKey(
  originTypes?: EarningOriginType[],
  query?: EarningsSummaryQuery,
): string {
  const base = originTypeScopeKey(originTypes);
  const from = query?.from;
  const to = query?.to;
  const hasWindow = Boolean(from || to);
  const includeClaimable = query?.includeClaimable !== false;
  if (!hasWindow && includeClaimable) {
    return base;
  }
  const windowPart = hasWindow ? `${from ?? ''}..${to ?? ''}` : 'all-time';
  return `${base}|window:${windowPart}|claimable:${includeClaimable ? '1' : '0'}`;
}

/**
 * Cache key for ledger first pages. `include_claims` is not in the server
 * cursor, so with/without claims must not share a bucket.
 */
export function ledgerScopeKey(
  originTypes?: EarningOriginType[],
  includeClaims: boolean = true,
): string {
  return `${originTypeScopeKey(originTypes)}|claims:${includeClaims ? '1' : '0'}`;
}

/**
 * Cache key for commissions first pages. `from_day` changes the window the
 * page covers, so two windows must not share a bucket.
 */
export function commissionsScopeKey(
  originType?: ReferrerOriginType,
  fromDay?: string,
): string {
  return `${originType ?? 'all'}|from:${fromDay ?? 'default'}`;
}

/** Composite cache key: Hydra profileId, optionally plus a scope suffix. */
export function profileCacheKey(profileId: string, scope?: string): string {
  return scope ? `${profileId}:${scope}` : profileId;
}

/**
 * The money service's checks on a perps quote `trade`, copied so a trade it
 * would refuse is never sent: a Hyperliquid perp name (`BTC`, `xyz:TSLA`),
 * and a non-negative decimal USD amount. `side` is already narrowed to
 * `BUY` | `SELL` by its type.
 */
const PERPS_REBATE_TRADE_COIN = /^(?:[a-z0-9]{1,16}:)?[A-Za-z0-9]{1,32}$/;
const PERPS_REBATE_TRADE_NOTIONAL_USD = /^\d{1,15}(\.\d{1,18})?$/;

/**
 * Whether the money service would accept this perps quote `trade`. The
 * server refuses the whole quote with a `400` otherwise, even though it drops
 * the trade.
 *
 * @param trade - The trade a caller passed.
 * @returns True when every field passes the server's checks.
 */
function isSendablePerpsRebateTrade(trade: PerpsRebateTrade): boolean {
  return (
    PERPS_REBATE_TRADE_COIN.test(trade.coin) &&
    PERPS_REBATE_TRADE_NOTIONAL_USD.test(trade.notionalUsd)
  );
}

const MESSENGER_EXPOSED_METHODS = [
  'getReferralMe',
  'getReferralFunnel',
  'getReferralCodes',
  'validateReferralCode',
  'registerReferee',
  'getEarningsSummary',
  'getEarningsLedger',
  'getClaimHistory',
  'getCommissions',
  'getClaimById',
  'getSwapsRebateQuote',
  'getPerpsRebateQuote',
  'isRewardsMoneyFeatureEnabled',
  'getRewardsMoneyEnvUrl',
  'canChangeRewardsMoneyEnvUrl',
  'getDefaultRewardsMoneyEnvUrl',
  'setRewardsMoneyEnvUrl',
] as const;

/**
 * Controller for the Rewards Money consumer surface: bootstrap referral reads,
 * scoped earnings summary, unified ledger history (`include_claims` by default),
 * and claim detail / in-flight claim-history reads.
 */
export class RewardsMoneyController extends BaseController<
  typeof controllerName,
  RewardsMoneyControllerState,
  RewardsMoneyControllerMessenger
> {
  readonly #isDisabled: () => boolean;
  readonly #referralMeRequestGeneration = new Map<string, number>();

  constructor({
    messenger,
    state,
    isDisabled,
  }: {
    messenger: RewardsMoneyControllerMessenger;
    state?: Partial<RewardsMoneyControllerState>;
    isDisabled?: () => boolean;
  }) {
    super({
      name: controllerName,
      metadata,
      messenger,
      state: {
        ...defaultRewardsMoneyControllerState,
        ...state,
      },
    });

    this.#isDisabled = isDisabled ?? (() => false);

    this.messenger.registerMethodActionHandlers(
      this,
      MESSENGER_EXPOSED_METHODS,
    );
  }

  /**
   * Hydra profile id for the primary session — same identity the bearer token
   * authenticates as. Throws when no session profile is available.
   */
  async #getProfileId(): Promise<string> {
    const profile = await this.messenger.call(
      'AuthenticationController:getSessionProfile',
    );
    if (!profile?.profileId) {
      throw new Error('No Hydra profile available for Rewards Money');
    }
    return profile.profileId;
  }

  isRewardsMoneyFeatureEnabled(): boolean {
    return !this.#isDisabled();
  }

  getRewardsMoneyEnvUrl(): string {
    return this.messenger.call('RewardsMoneyDataService:getRewardsMoneyEnvUrl');
  }

  canChangeRewardsMoneyEnvUrl(): boolean {
    return this.messenger.call(
      'RewardsMoneyDataService:canChangeRewardsMoneyEnvUrl',
    );
  }

  getDefaultRewardsMoneyEnvUrl(): string {
    return this.messenger.call(
      'RewardsMoneyDataService:getDefaultRewardsMoneyEnvUrl',
    );
  }

  async setRewardsMoneyEnvUrl(url: string): Promise<void> {
    if (!this.canChangeRewardsMoneyEnvUrl()) {
      return;
    }
    // Flush profile caches so pages are not served from the previous API host.
    // Env URL itself is device/build config and is written below.
    const { rewardsMoneyEnvUrl: _ignored, ...emptyCaches } =
      getRewardsMoneyControllerDefaultState();
    this.update((draft) => {
      Object.assign(draft, emptyCaches);
      draft.rewardsMoneyEnvUrl = url;
    });
    this.messenger.call('RewardsMoneyDataService:setRewardsMoneyEnvUrl', url);
  }

  async getReferralMe(params: GetReferralMeDto = {}): Promise<ReferralMeDto> {
    if (this.#isDisabled()) {
      throw new Error('Rewards Money is disabled');
    }

    const profileId = await this.#getProfileId();
    let requestGeneration = 0;
    const fetchFresh = () => {
      requestGeneration = this.#startReferralMeRequest(profileId);
      return this.messenger.call('RewardsMoneyDataService:getReferralMe');
    };

    if (params.forceFresh) {
      const fresh = await fetchFresh();
      this.#writeReferralMeIfLatest(profileId, fresh, requestGeneration);
      return fresh;
    }

    return wrapWithCache<ReferralMeDto>({
      key: profileId,
      ttl: REFERRAL_ME_CACHE_THRESHOLD_MS,
      readCache: (key) => this.state.referralMe[key],
      fetchFresh,
      writeCache: (key, payload) =>
        this.#writeReferralMeIfLatest(key, payload, requestGeneration),
    });
  }

  async getReferralFunnel(
    params: GetReferralFunnelDto = {},
  ): Promise<ReferralFunnelDto> {
    if (this.#isDisabled()) {
      return { enrolled: 0, earning_generating: 0 };
    }

    const profileId = await this.#getProfileId();
    const fetchFresh = () =>
      this.messenger.call('RewardsMoneyDataService:getReferralFunnel');

    if (params.forceFresh) {
      const fresh = await fetchFresh();
      this.#writeReferralFunnel(profileId, fresh);
      return fresh;
    }

    return wrapWithCache<ReferralFunnelDto>({
      key: profileId,
      ttl: REFERRAL_FUNNEL_CACHE_THRESHOLD_MS,
      readCache: (key) => this.state.referralFunnel[key],
      fetchFresh,
      writeCache: (key, payload) => this.#writeReferralFunnel(key, payload),
    });
  }

  async getReferralCodes(
    params: GetReferralCodesDto = {},
  ): Promise<OwnReferralCodesDto> {
    if (this.#isDisabled()) {
      return { codes: [] };
    }

    const profileId = await this.#getProfileId();
    const fetchFresh = () =>
      this.messenger.call('RewardsMoneyDataService:getReferralCodes');

    if (params.forceFresh) {
      const fresh = await fetchFresh();
      this.#writeReferralCodes(profileId, fresh);
      return fresh;
    }

    return wrapWithCache<OwnReferralCodesDto>({
      key: profileId,
      ttl: REFERRAL_CODES_CACHE_THRESHOLD_MS,
      readCache: (key) => this.state.referralCodes[key],
      fetchFresh,
      writeCache: (key, payload) => this.#writeReferralCodes(key, payload),
    });
  }

  async validateReferralCode(code: string): Promise<{ success: boolean }> {
    if (this.#isDisabled()) {
      throw new Error('Rewards Money is disabled');
    }

    return this.messenger.call(
      'RewardsMoneyDataService:validateReferralCode',
      code,
    );
  }

  /**
   * Rebate a swaps confirmation screen should show. The bridge quote decides
   * fee-token eligibility. Not cached: the rate has to disappear the moment
   * an operator ends the window, and a different quote can name a different
   * fee token.
   *
   * Pass the `quote` of the bridge `QuoteResponse`, not the response. Only
   * its `feeData.metabridge` is sent.
   *
   * A refusal rejects with `RewardsMoneyRebateQuoteError`, a `401` with
   * `RewardsMoneyAuthorizationError`. A timeout or a network failure rejects
   * with a plain `Error`. A `401` is not retried.
   *
   * The confirm button may wait for this first request, for at most 2 to 3
   * seconds. If the quote has not arrived by then, or the request fails,
   * unblock the confirm button and let the user continue with no rebate tag.
   * One quiet retry may run while the screen stays open. Wait
   * `retryAfterSeconds` when the error has one, then add a small random
   * delay: a `503` sends a fixed `Retry-After: 2`, and without that jitter
   * every client retries in the same second. When the header is missing,
   * `retryAfterSeconds` is `undefined` and the caller chooses the wait. Stop
   * after that second attempt, or when the user leaves the screen. A success
   * on the retry shows the rebate tag. The retry does not hold the confirm
   * button. A `429` (`RATE_LIMITED`) shares the profile read budget, 60
   * requests per 30 seconds, with the Earnings reads, so this screen sends
   * the first quote plus that one retry. A `503` (`UNAVAILABLE`) means the
   * server is unavailable, whether the body reason is `SERVER_BUSY` or
   * `JWKS_UNAVAILABLE`.
   *
   * @param quote - The bridge quote the confirmation screen holds.
   * @returns The rebate to show; `eligible: false` means no rebate row.
   */
  getSwapsRebateQuote(
    quote: SwapsRebateBridgeQuote,
  ): Promise<RebateQuoteResponse> {
    return this.#getRebateQuote({
      product: 'swaps',
      quote: { feeData: { metabridge: quote.feeData.metabridge } },
    });
  }

  /**
   * Rebate a perps confirmation screen should show. `trade` is optional and
   * the server drops it today; the answer does not depend on it. A trade the
   * server would refuse (see {@link PerpsRebateTrade}) is left out rather
   * than sent, so it cannot turn the quote into a `400`.
   *
   * A refusal rejects with `RewardsMoneyRebateQuoteError`, a `401` with
   * `RewardsMoneyAuthorizationError`. A timeout or a network failure rejects
   * with a plain `Error`. A `401` is not retried.
   *
   * The confirm button may wait for this first request, for at most 2 to 3
   * seconds. If the quote has not arrived by then, or the request fails,
   * unblock the confirm button and let the user continue with no rebate tag.
   * One quiet retry may run while the screen stays open. Wait
   * `retryAfterSeconds` when the error has one, then add a small random
   * delay: a `503` sends a fixed `Retry-After: 2`, and without that jitter
   * every client retries in the same second. When the header is missing,
   * `retryAfterSeconds` is `undefined` and the caller chooses the wait. Stop
   * after that second attempt, or when the user leaves the screen. A success
   * on the retry shows the rebate tag. The retry does not hold the confirm
   * button. A `429` (`RATE_LIMITED`) shares the profile read budget, 60
   * requests per 30 seconds, with the Earnings reads, so this screen sends
   * the first quote plus that one retry. A `503` (`UNAVAILABLE`) means the
   * server is unavailable, whether the body reason is `SERVER_BUSY` or
   * `JWKS_UNAVAILABLE`.
   *
   * @param trade - What the user is about to trade, when known.
   * @returns The rebate to show; `eligible: false` means no rebate row.
   */
  getPerpsRebateQuote(trade?: PerpsRebateTrade): Promise<RebateQuoteResponse> {
    if (trade === undefined || !isSendablePerpsRebateTrade(trade)) {
      return this.#getRebateQuote({ product: 'perps' });
    }
    return this.#getRebateQuote({
      product: 'perps',
      trade: {
        coin: trade.coin,
        side: trade.side,
        notionalUsd: trade.notionalUsd,
      },
    });
  }

  async #getRebateQuote(body: RebateQuoteBody): Promise<RebateQuoteResponse> {
    if (this.#isDisabled()) {
      throw new Error('Rewards Money is disabled');
    }

    return this.messenger.call('RewardsMoneyDataService:getRebateQuote', body);
  }

  /**
   * Enrols the session profile under a referrer's code. Nothing is cached: the
   * referral role that changes as a result is read back through
   * `getReferralMe({ forceFresh: true })`.
   */
  async registerReferee(params: RegisterRefereeDto): Promise<void> {
    if (this.#isDisabled()) {
      throw new Error('Rewards Money is disabled');
    }

    await this.messenger.call(
      'RewardsMoneyDataService:registerReferee',
      params,
    );
  }

  async getEarningsSummary(
    params: GetEarningsSummaryDto = {},
  ): Promise<EarningsSummaryDto> {
    if (this.#isDisabled()) {
      throw new Error('Rewards Money is disabled');
    }

    const { originTypes, forceFresh, from, to, includeClaimable } = params;
    const query = { from, to, includeClaimable };
    const profileId = await this.#getProfileId();
    const key = profileCacheKey(profileId, summaryScopeKey(originTypes, query));
    const fetchFresh = () =>
      this.messenger.call(
        'RewardsMoneyDataService:getEarningsSummary',
        originTypes,
        query,
      );

    if (forceFresh) {
      const fresh = await fetchFresh();
      this.#writeEarningsSummary(key, fresh);
      return fresh;
    }

    return wrapWithCache<EarningsSummaryDto>({
      key,
      ttl: EARNINGS_SUMMARY_CACHE_THRESHOLD_MS,
      readCache: (cacheKey) => this.state.earningsSummary[cacheKey],
      fetchFresh,
      writeCache: (cacheKey, payload) =>
        this.#writeEarningsSummary(cacheKey, payload),
    });
  }

  async getEarningsLedger(
    params: GetEarningsLedgerDto = {},
  ): Promise<EarningsLedgerPageDto> {
    if (this.#isDisabled()) {
      return { results: [], has_more: false, cursor: null, window: null };
    }

    const { originTypes, cursor, forceFresh } = params;
    const includeClaims = params.includeClaims ?? true;

    if (cursor) {
      return this.messenger.call(
        'RewardsMoneyDataService:getEarningsLedger',
        originTypes,
        cursor,
        undefined,
        includeClaims,
      );
    }

    const profileId = await this.#getProfileId();
    const key = profileCacheKey(
      profileId,
      ledgerScopeKey(originTypes, includeClaims),
    );
    const fetchFresh = () =>
      this.messenger.call(
        'RewardsMoneyDataService:getEarningsLedger',
        originTypes,
        null,
        undefined,
        includeClaims,
      );

    if (forceFresh) {
      const fresh = await fetchFresh();
      this.#writeEarningsLedgerFirstPage(key, fresh);
      return fresh;
    }

    return wrapWithCache<EarningsLedgerPageDto>({
      key,
      ttl: EARNINGS_LEDGER_CACHE_THRESHOLD_MS,
      readCache: (cacheKey) => this.state.earningsLedgerFirstPage[cacheKey],
      fetchFresh,
      writeCache: (cacheKey, payload) =>
        this.#writeEarningsLedgerFirstPage(cacheKey, payload),
    });
  }

  async getClaimHistory(
    params: GetClaimHistoryDto = {},
  ): Promise<ClaimHistoryPageDto> {
    if (this.#isDisabled()) {
      return { results: [], has_more: false, cursor: null };
    }

    const { cursor, forceFresh } = params;

    if (cursor) {
      return this.messenger.call(
        'RewardsMoneyDataService:getClaimHistory',
        cursor,
      );
    }

    const profileId = await this.#getProfileId();
    const fetchFresh = () =>
      this.messenger.call('RewardsMoneyDataService:getClaimHistory', null);

    if (forceFresh) {
      const fresh = await fetchFresh();
      this.#writeClaimHistoryFirstPage(profileId, fresh);
      return fresh;
    }

    return wrapWithCache<ClaimHistoryPageDto>({
      key: profileId,
      ttl: CLAIM_HISTORY_CACHE_THRESHOLD_MS,
      readCache: (key) => this.state.claimHistoryFirstPage[key],
      fetchFresh,
      writeCache: (key, payload) =>
        this.#writeClaimHistoryFirstPage(key, payload),
    });
  }

  async getCommissions(
    params: GetCommissionsDto = {},
  ): Promise<CommissionsPageDto> {
    if (this.#isDisabled()) {
      return {
        results: [],
        mechanisms: {
          REFERRAL_REV_SHARE: { claim_open: false, reason: null },
          SOCIAL_FOLLOW_TRADE: { claim_open: false, reason: null },
        },
        has_more: false,
        cursor: null,
      };
    }

    const { originType, cursor, fromDay, forceFresh } = params;

    if (cursor) {
      return this.messenger.call(
        'RewardsMoneyDataService:getCommissions',
        originType,
        cursor,
        undefined,
        fromDay,
      );
    }

    const profileId = await this.#getProfileId();
    const key = profileCacheKey(
      profileId,
      commissionsScopeKey(originType, fromDay),
    );
    const fetchFresh = () =>
      this.messenger.call(
        'RewardsMoneyDataService:getCommissions',
        originType,
        null,
        undefined,
        fromDay,
      );

    if (forceFresh) {
      const fresh = await fetchFresh();
      this.#writeCommissionsFirstPage(key, fresh);
      return fresh;
    }

    return wrapWithCache<CommissionsPageDto>({
      key,
      ttl: COMMISSIONS_CACHE_THRESHOLD_MS,
      readCache: (cacheKey) => this.state.commissionsFirstPage[cacheKey],
      fetchFresh,
      writeCache: (cacheKey, payload) =>
        this.#writeCommissionsFirstPage(cacheKey, payload),
    });
  }

  async getClaimById(params: GetClaimByIdDto): Promise<ClaimDto> {
    if (this.#isDisabled()) {
      throw new Error('Rewards Money is disabled');
    }

    const { claimId, forceFresh } = params;
    const profileId = await this.#getProfileId();
    const key = profileCacheKey(profileId, claimId);
    const fetchFresh = () =>
      this.messenger.call('RewardsMoneyDataService:getClaimById', claimId);

    if (forceFresh) {
      const fresh = await fetchFresh();
      this.#writeClaimById(key, fresh);
      return fresh;
    }

    return wrapWithCache<ClaimDto>({
      key,
      ttl: CLAIM_BY_ID_CACHE_THRESHOLD_MS,
      readCache: (cacheKey) => this.state.claimById[cacheKey],
      fetchFresh,
      writeCache: (cacheKey, payload) =>
        this.#writeClaimById(cacheKey, payload),
    });
  }

  #writeReferralMe(profileId: string, payload: ReferralMeDto): void {
    try {
      this.update((draft) => {
        draft.referralMe[profileId] = { payload, lastFetched: Date.now() };
      });
    } catch (error) {
      Logger.log(
        'RewardsMoneyController: failed to cache referral me',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  #startReferralMeRequest(profileId: string): number {
    const generation =
      (this.#referralMeRequestGeneration.get(profileId) ?? 0) + 1;
    this.#referralMeRequestGeneration.set(profileId, generation);
    return generation;
  }

  #writeReferralMeIfLatest(
    profileId: string,
    payload: ReferralMeDto,
    requestGeneration: number,
  ): void {
    if (
      this.#referralMeRequestGeneration.get(profileId) !== requestGeneration
    ) {
      return;
    }
    this.#writeReferralMe(profileId, payload);
  }

  #writeReferralFunnel(profileId: string, payload: ReferralFunnelDto): void {
    this.update((draft) => {
      draft.referralFunnel[profileId] = { payload, lastFetched: Date.now() };
    });
  }

  #writeReferralCodes(profileId: string, payload: OwnReferralCodesDto): void {
    this.update((draft) => {
      draft.referralCodes[profileId] = { payload, lastFetched: Date.now() };
    });
  }

  #writeEarningsSummary(key: string, payload: EarningsSummaryDto): void {
    this.update((draft) => {
      draft.earningsSummary[key] = { payload, lastFetched: Date.now() };
    });
  }

  #writeEarningsLedgerFirstPage(
    key: string,
    payload: EarningsLedgerPageDto,
  ): void {
    this.update((draft) => {
      draft.earningsLedgerFirstPage[key] = {
        payload,
        lastFetched: Date.now(),
      };
    });
  }

  #writeClaimHistoryFirstPage(
    profileId: string,
    payload: ClaimHistoryPageDto,
  ): void {
    this.update((draft) => {
      draft.claimHistoryFirstPage[profileId] = {
        payload,
        lastFetched: Date.now(),
      };
    });
  }

  #writeCommissionsFirstPage(key: string, payload: CommissionsPageDto): void {
    this.update((draft) => {
      draft.commissionsFirstPage[key] = { payload, lastFetched: Date.now() };
    });
  }

  #writeClaimById(key: string, payload: ClaimDto): void {
    this.update((draft) => {
      draft.claimById[key] = { payload, lastFetched: Date.now() };

      const keys = Object.keys(draft.claimById);
      if (keys.length <= CLAIM_BY_ID_CACHE_MAX_ENTRIES) {
        return;
      }

      // Drop oldest by lastFetched until under the cap.
      const sorted = keys.sort(
        (a, b) =>
          (draft.claimById[a]?.lastFetched ?? 0) -
          (draft.claimById[b]?.lastFetched ?? 0),
      );
      const toDrop = sorted.length - CLAIM_BY_ID_CACHE_MAX_ENTRIES;
      for (let i = 0; i < toDrop; i++) {
        delete draft.claimById[sorted[i]];
      }
    });
  }
}
