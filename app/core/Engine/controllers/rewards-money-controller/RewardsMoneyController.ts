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
  type OptimisticClaim,
  type RecordOptimisticClaimDto,
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

/**
 * How long a post-claim overlay may outlive its claim. The reconciler normally
 * settles well inside this; the bound exists so a claim it never settles cannot
 * pin a wrong figure on screen indefinitely.
 */
export const OPTIMISTIC_CLAIM_TTL_MS = 30 * 60 * 1000;

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
  optimisticClaim: {
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
/**
 * Explicit comparator: the default `sort()` coerces to string and sorts by code
 * unit, which happens to be right here but is not stated. Sonar flags the
 * implicit form, and being explicit costs nothing.
 *
 * @param a - First origin type.
 * @param b - Second origin type.
 * @returns Standard comparator result.
 */
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
 * Parses an mUSD base-unit string, treating anything malformed as zero rather
 * than throwing on a money screen.
 *
 * @param value - Base-unit decimal string.
 * @returns The value as a BigInt.
 */
function toBaseUnits(value: string | undefined): bigint {
  if (!value) {
    return 0n;
  }
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

/**
 * Whether the server's reported `claimed` total has caught up with an
 * outstanding optimistic claim.
 *
 * @param summary - The freshly fetched summary.
 * @param claim - The outstanding overlay.
 * @returns True once the overlay should be dropped.
 */
function hasServerCaughtUp(
  summary: EarningsSummaryDto,
  claim: OptimisticClaim,
): boolean {
  return (
    toBaseUnits(summary.claimed) >=
    toBaseUnits(claim.baselineClaimed) + toBaseUnits(claim.netAmount)
  );
}

/**
 * Applies a confirmed-but-unsettled claim to a scoped summary: the claim is
 * already on chain, so `claimable` has been spent and `claimed` has grown, even
 * though the reconciler has not told the server yet.
 *
 * Only the totals are adjusted. Per-type figures are left as the server sent
 * them: a claim's net mixes types and cannot be decomposed client-side, and
 * inventing a split would be exactly the shown-vs-signed divergence this
 * overlay exists to avoid.
 *
 * @param summary - The server's summary.
 * @param claim - The outstanding overlay.
 * @returns A summary reflecting the claim.
 */
export function applyOptimisticClaim(
  summary: EarningsSummaryDto,
  claim: OptimisticClaim,
): EarningsSummaryDto {
  const net = toBaseUnits(claim.netAmount);
  const claimable = toBaseUnits(summary.claimable);
  const spent = claimable < net ? claimable : net;

  return {
    ...summary,
    claimable: (claimable - spent).toString(),
    claimed: (toBaseUnits(summary.claimed) + spent).toString(),
  };
}

const MESSENGER_EXPOSED_METHODS = [
  'getReferralMe',
  'getEarningsSummary',
  'getEarningsLedger',
  'initiateClaim',
  'invalidateRewardsMoneyCache',
  'recordOptimisticClaim',
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
  readonly #isDisabled: () => boolean;

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
      // `optimisticClaim` is deliberately NOT cleared here: it exists precisely
      // to survive the post-claim cache flush and the refetch that follows,
      // which is when the server is most likely to still report pre-claim
      // totals. It clears itself once the server agrees, or on its TTL.
    });
  }

  /**
   * Record what a confirmed claim paid, so scoped summaries report the
   * post-claim figure until the server reflects it.
   *
   * @param params - The net amount paid and the origin types it covered.
   */
  recordOptimisticClaim(params: RecordOptimisticClaimDto): void {
    const scopeKey = originTypeScopeKey(params.originTypes);
    const baselineClaimed =
      this.state.earningsSummary[scopeKey]?.payload.claimed ?? '0';

    this.update((draft) => {
      draft.optimisticClaim = {
        netAmount: params.netAmount,
        originTypes: params.originTypes,
        baselineClaimed,
        expiresAt: Date.now() + OPTIMISTIC_CLAIM_TTL_MS,
      };
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
      return this.#withOptimisticClaim(fresh, originTypes);
    }

    const summary = await wrapWithCache<EarningsSummaryDto>({
      key,
      ttl: EARNINGS_SUMMARY_CACHE_THRESHOLD_MS,
      readCache: (cacheKey) => this.state.earningsSummary[cacheKey],
      fetchFresh,
      writeCache: (cacheKey, payload) =>
        this.#writeEarningsSummary(cacheKey, payload),
    });

    return this.#withOptimisticClaim(summary, originTypes);
  }

  /**
   * Overlays an outstanding confirmed claim onto a scoped summary, and clears
   * the overlay once the server has caught up or it has expired.
   *
   * The cache always stores what the server said; the overlay is applied on the
   * way out, so it can never be baked into a persisted payload.
   */
  #withOptimisticClaim(
    summary: EarningsSummaryDto,
    originTypes: EarningOriginType[] | undefined,
  ): EarningsSummaryDto {
    const claim = this.state.optimisticClaim;
    if (!claim) {
      return summary;
    }

    if (Date.now() > claim.expiresAt || hasServerCaughtUp(summary, claim)) {
      this.update((draft) => {
        draft.optimisticClaim = null;
      });
      return summary;
    }

    // A summary that excludes every type the claim paid from is unaffected by
    // it, so leave those scopes alone.
    const scope = originTypes ?? [];
    const overlaps =
      scope.length === 0 ||
      scope.some((originType) => claim.originTypes.includes(originType));

    return overlaps ? applyOptimisticClaim(summary, claim) : summary;
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
