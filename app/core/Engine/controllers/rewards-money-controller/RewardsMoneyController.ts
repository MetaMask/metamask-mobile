import { BaseController, type StateMetadata } from '@metamask/base-controller';
import { wrapWithCache } from '../rewards-controller/RewardsController';
import Logger from '../../../../util/Logger';
import type { RewardsMoneyControllerMessenger } from '../../messengers/rewards-money-controller-messenger';
import {
  defaultRewardsMoneyControllerState,
  getRewardsMoneyControllerDefaultState,
} from './defaultState';
import {
  REWARDS_MONEY_CONTROLLER_NAME,
  type ClaimInitiateResultDto,
  type EarningOriginType,
  type EarningsLedgerPageDto,
  type EarningsSummaryDto,
  type GetEarningsLedgerDto,
  type GetEarningsSummaryDto,
  type GetReferralMeDto,
  type InitiateClaimDto,
  type ReferralMeDto,
  type RewardsMoneyControllerState,
} from './types';

export type { RewardsMoneyControllerMessenger };

const controllerName = REWARDS_MONEY_CONTROLLER_NAME;

/**
 * All three reads share a 60s TTL. The referral-program data moves on a
 * per-trade cadence, so a minute is short enough that a pull-to-refresh is
 * rarely needed and long enough that tab switching does not re-fetch.
 */
export const REFERRAL_ME_CACHE_THRESHOLD_MS = 60_000;
export const EARNINGS_SUMMARY_CACHE_THRESHOLD_MS = 60_000;
export const EARNINGS_LEDGER_CACHE_THRESHOLD_MS = 60_000;

/** The single key for the profile-scoped `referralMe` bucket. */
const REFERRAL_ME_CACHE_KEY = 'me';

const metadata: StateMetadata<RewardsMoneyControllerState> = {
  referralMe: {
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
};

export {
  defaultRewardsMoneyControllerState,
  getRewardsMoneyControllerDefaultState,
};

/**
 * Builds the cache key for an origin-type scope. Sorted so `[A, B]` and
 * `[B, A]` share one entry, and `all` for the unscoped read so an empty array
 * never collides with a genuinely empty key.
 */
export function originTypeScopeKey(originTypes?: EarningOriginType[]): string {
  if (!originTypes || originTypes.length === 0) {
    return 'all';
  }
  return [...originTypes].sort().join(',');
}

const MESSENGER_EXPOSED_METHODS = [
  'getReferralMe',
  'getEarningsSummary',
  'getEarningsLedger',
  'initiateClaim',
  'invalidateRewardsMoneyCache',
  'notifyEarningsUpdated',
  'resetState',
] as const;

/**
 * Controller for the referral-program consumer surface: the bootstrap read
 * that decides which screen renders, the scoped earnings summary and ledger,
 * and claim initiation.
 */
export class RewardsMoneyController extends BaseController<
  typeof controllerName,
  RewardsMoneyControllerState,
  RewardsMoneyControllerMessenger
> {
  #isDisabled: () => boolean;

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
   * Reset controller state to default.
   */
  resetState(): void {
    this.update(() => getRewardsMoneyControllerDefaultState());
  }

  /**
   * Drop every cached bucket. Called on claim confirmation and on auth change.
   *
   * Every new bucket must be added here — the rewards controller's equivalent
   * leaks stale data across identity switches whenever one is forgotten, which
   * is exactly the failure this mirrors and avoids.
   */
  invalidateRewardsMoneyCache(): void {
    this.update((draft) => {
      draft.referralMe = null;
      draft.earningsSummary = {};
      draft.earningsLedgerFirstPage = {};
    });
  }

  /**
   * Tell open screens their earnings moved. Screens subscribe via
   * `useRewardsMoneyEvents` rather than polling.
   */
  notifyEarningsUpdated(): void {
    this.messenger.publish(`${controllerName}:earningsUpdated`);
  }

  /**
   * The bootstrap read. One call decides which screen renders, which rates it
   * shows, and whether there is a code to share.
   */
  async getReferralMe(params: GetReferralMeDto = {}): Promise<ReferralMeDto> {
    if (this.#isDisabled()) {
      throw new Error('Rewards Money is disabled');
    }

    const fetchFresh = () =>
      this.messenger.call('RewardsMoneyDataService:getReferralMe');

    if (params.forceFresh) {
      const fresh = await fetchFresh();
      this.#writeReferralMe(fresh);
      return fresh;
    }

    return wrapWithCache<ReferralMeDto>({
      key: REFERRAL_ME_CACHE_KEY,
      ttl: REFERRAL_ME_CACHE_THRESHOLD_MS,
      readCache: () => this.state.referralMe ?? undefined,
      fetchFresh,
      writeCache: (_key, payload) => this.#writeReferralMe(payload),
    });
  }

  /**
   * Totals and claimability for an origin-type scope. `claimable` is the exact
   * net a claim would pay, so the headline and the CTA cannot drift apart.
   */
  async getEarningsSummary(
    params: GetEarningsSummaryDto = {},
  ): Promise<EarningsSummaryDto> {
    if (this.#isDisabled()) {
      throw new Error('Rewards Money is disabled');
    }

    const { originTypes, forceFresh } = params;
    const key = originTypeScopeKey(originTypes);
    const fetchFresh = () =>
      this.messenger.call(
        'RewardsMoneyDataService:getEarningsSummary',
        originTypes,
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

  /**
   * Page 1 goes through the cache and is the only page ever written to state.
   * A cursor page goes straight to the network — caching it would let a
   * multi-page merge flash and then shrink on the next refetch.
   */
  async getEarningsLedger(
    params: GetEarningsLedgerDto = {},
  ): Promise<EarningsLedgerPageDto> {
    if (this.#isDisabled()) {
      return { results: [], has_more: false, cursor: null };
    }

    const { originTypes, cursor, forceFresh } = params;

    if (cursor) {
      return this.messenger.call(
        'RewardsMoneyDataService:getEarningsLedger',
        originTypes,
        cursor,
      );
    }

    const key = originTypeScopeKey(originTypes);
    const fetchFresh = () =>
      this.messenger.call(
        'RewardsMoneyDataService:getEarningsLedger',
        originTypes,
        null,
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

  /**
   * Opens a claim. Never cached: the voucher it returns is single-use and
   * expires in 60 seconds.
   */
  async initiateClaim(
    params: InitiateClaimDto,
  ): Promise<ClaimInitiateResultDto> {
    if (this.#isDisabled()) {
      throw new Error('Rewards Money is disabled');
    }

    const result = await this.messenger.call(
      'RewardsMoneyDataService:initiateClaim',
      params.moneyAccountAddress,
      params.originTypes,
    );

    // The claim has stamped its accruals server-side, so every cached total is
    // now stale regardless of whether the batch lands.
    this.invalidateRewardsMoneyCache();

    return result;
  }

  #writeReferralMe(payload: ReferralMeDto): void {
    try {
      this.update((draft) => {
        draft.referralMe = { payload, lastFetched: Date.now() };
      });
    } catch (error) {
      Logger.log(
        'RewardsMoneyController: failed to cache referral me',
        error instanceof Error ? error.message : String(error),
      );
    }
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
}
