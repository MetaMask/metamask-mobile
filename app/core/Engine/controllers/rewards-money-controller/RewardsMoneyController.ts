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
  type EarningOriginType,
  type EarningsLedgerPageDto,
  type EarningsSummaryDto,
  type GetClaimByIdDto,
  type GetClaimHistoryDto,
  type GetEarningsLedgerDto,
  type GetEarningsSummaryDto,
  type GetReferralCodesDto,
  type GetReferralFunnelDto,
  type GetReferralMeDto,
  type OwnReferralCodesDto,
  type ReferralFunnelDto,
  type ReferralMeDto,
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

const REFERRAL_ME_CACHE_KEY = 'me';
const REFERRAL_CODES_CACHE_KEY = 'codes';
const REFERRAL_FUNNEL_CACHE_KEY = 'funnel';
const CLAIM_HISTORY_CACHE_KEY = 'me';

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

const MESSENGER_EXPOSED_METHODS = [
  'getReferralMe',
  'getReferralFunnel',
  'getReferralCodes',
  'validateReferralCode',
  'getEarningsSummary',
  'getEarningsLedger',
  'getClaimHistory',
  'getClaimById',
  'invalidateRewardsMoneyCache',
  'isRewardsMoneyFeatureEnabled',
  'resetState',
  'getRewardsMoneyEnvUrl',
  'canChangeRewardsMoneyEnvUrl',
  'getDefaultRewardsMoneyEnvUrl',
  'setRewardsMoneyEnvUrl',
] as const;

/**
 * Controller for the Rewards Money consumer surface: bootstrap referral reads,
 * scoped earnings summary and ledger, and claim history reads.
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

  isRewardsMoneyFeatureEnabled(): boolean {
    return !this.#isDisabled();
  }

  resetState(): void {
    this.update(() => getRewardsMoneyControllerDefaultState());
  }

  /**
   * Drop every cached bucket. Called on env URL change and on auth change.
   */
  invalidateRewardsMoneyCache(): void {
    this.update((draft) => {
      draft.referralMe = null;
      draft.referralCodes = null;
      draft.referralFunnel = null;
      draft.earningsSummary = {};
      draft.earningsLedgerFirstPage = {};
      draft.claimHistoryFirstPage = null;
      draft.claimById = {};
    });
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
    this.update((state) => {
      state.rewardsMoneyEnvUrl = url;
    });
    this.messenger.call('RewardsMoneyDataService:setRewardsMoneyEnvUrl', url);
    this.invalidateRewardsMoneyCache();
  }

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

  async getReferralFunnel(
    params: GetReferralFunnelDto = {},
  ): Promise<ReferralFunnelDto> {
    if (this.#isDisabled()) {
      return { enrolled: 0, earning_generating: 0 };
    }

    const fetchFresh = () =>
      this.messenger.call('RewardsMoneyDataService:getReferralFunnel');

    if (params.forceFresh) {
      const fresh = await fetchFresh();
      this.#writeReferralFunnel(fresh);
      return fresh;
    }

    return wrapWithCache<ReferralFunnelDto>({
      key: REFERRAL_FUNNEL_CACHE_KEY,
      ttl: REFERRAL_FUNNEL_CACHE_THRESHOLD_MS,
      readCache: () => this.state.referralFunnel ?? undefined,
      fetchFresh,
      writeCache: (_key, payload) => this.#writeReferralFunnel(payload),
    });
  }

  async getReferralCodes(
    params: GetReferralCodesDto = {},
  ): Promise<OwnReferralCodesDto> {
    if (this.#isDisabled()) {
      return { codes: [] };
    }

    const fetchFresh = () =>
      this.messenger.call('RewardsMoneyDataService:getReferralCodes');

    if (params.forceFresh) {
      const fresh = await fetchFresh();
      this.#writeReferralCodes(fresh);
      return fresh;
    }

    return wrapWithCache<OwnReferralCodesDto>({
      key: REFERRAL_CODES_CACHE_KEY,
      ttl: REFERRAL_CODES_CACHE_THRESHOLD_MS,
      readCache: () => this.state.referralCodes ?? undefined,
      fetchFresh,
      writeCache: (_key, payload) => this.#writeReferralCodes(payload),
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

  async getEarningsLedger(
    params: GetEarningsLedgerDto = {},
  ): Promise<EarningsLedgerPageDto> {
    if (this.#isDisabled()) {
      return { results: [], has_more: false, cursor: null, window: null };
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

    const fetchFresh = () =>
      this.messenger.call('RewardsMoneyDataService:getClaimHistory', null);

    if (forceFresh) {
      const fresh = await fetchFresh();
      this.#writeClaimHistoryFirstPage(fresh);
      return fresh;
    }

    return wrapWithCache<ClaimHistoryPageDto>({
      key: CLAIM_HISTORY_CACHE_KEY,
      ttl: CLAIM_HISTORY_CACHE_THRESHOLD_MS,
      readCache: () => this.state.claimHistoryFirstPage ?? undefined,
      fetchFresh,
      writeCache: (_key, payload) => this.#writeClaimHistoryFirstPage(payload),
    });
  }

  async getClaimById(params: GetClaimByIdDto): Promise<ClaimDto> {
    if (this.#isDisabled()) {
      throw new Error('Rewards Money is disabled');
    }

    const { claimId, forceFresh } = params;
    const fetchFresh = () =>
      this.messenger.call('RewardsMoneyDataService:getClaimById', claimId);

    if (forceFresh) {
      const fresh = await fetchFresh();
      this.#writeClaimById(claimId, fresh);
      return fresh;
    }

    return wrapWithCache<ClaimDto>({
      key: claimId,
      ttl: CLAIM_BY_ID_CACHE_THRESHOLD_MS,
      readCache: (cacheKey) => this.state.claimById[cacheKey],
      fetchFresh,
      writeCache: (cacheKey, payload) =>
        this.#writeClaimById(cacheKey, payload),
    });
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

  #writeReferralFunnel(payload: ReferralFunnelDto): void {
    this.update((draft) => {
      draft.referralFunnel = { payload, lastFetched: Date.now() };
    });
  }

  #writeReferralCodes(payload: OwnReferralCodesDto): void {
    this.update((draft) => {
      draft.referralCodes = { payload, lastFetched: Date.now() };
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

  #writeClaimHistoryFirstPage(payload: ClaimHistoryPageDto): void {
    this.update((draft) => {
      draft.claimHistoryFirstPage = { payload, lastFetched: Date.now() };
    });
  }

  #writeClaimById(claimId: string, payload: ClaimDto): void {
    this.update((draft) => {
      draft.claimById[claimId] = { payload, lastFetched: Date.now() };

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
