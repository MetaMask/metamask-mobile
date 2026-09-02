import type { Messenger } from '@metamask/messenger';
import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { RewardsMoneyControllerMethodActions } from './RewardsMoneyController-method-action-types';

export const REWARDS_MONEY_CONTROLLER_NAME = 'RewardsMoneyController' as const;

// ─── API contract ─────────────────────────────────────────────────────────────
// These mirror the referral-program consumer surface exactly. All monetary
// values cross the boundary as mUSD base-unit decimal strings: they exceed
// Number.MAX_SAFE_INTEGER and the claim rail settles in base units, so a
// JS number would be wrong in both directions.

/** mUSD is fixed at 6 decimals. A constant, never part of the payload. */
export const MUSD_DECIMALS = 6;

export type ReferralRole = 'REFERRER' | 'REFEREE' | 'BOTH' | 'NONE';

/**
 * Server-side product decision about which screen to render. Returned
 * alongside `role` so the `BOTH` policy can change without an app release.
 */
export type ReferralVariant = 'REFERRER' | 'REFEREE' | 'NONE';

export type ReferralUserType = 'KOL' | 'REGULAR';

export type ReferralUserStatus = 'ACTIVE' | 'PAUSED';

export type ReferralCodeKind = 'PRIMARY' | 'VANITY' | 'SECONDARY';

export type ReferralCodeStatus = 'ACTIVE' | 'PAUSED' | 'REVOKED';

export type EarningOriginType =
  | 'CASHBACK'
  | 'REFERRAL_REV_SHARE'
  | 'SOCIAL_FOLLOW_TRADE';

/**
 * Why a given origin type pays zero right now. `TAX_DETERMINATION_REQUIRED` is
 * a soft block on income mechanisms only — cashback in the same claim still
 * pays.
 */
export type ClaimBlockingReason =
  | 'SUSPENDED'
  | 'ADDRESS_BLOCKED'
  | 'NO_ELIGIBLE_BALANCE'
  | 'BELOW_MINIMUM'
  | 'SIGNER_UNAVAILABLE'
  | 'TAX_DETERMINATION_REQUIRED';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ReferralCodeView = {
  code: string;
  kind: ReferralCodeKind;
  status: ReferralCodeStatus;
  /** Null when `REFERRAL_SHARE_URL_TEMPLATE` is unset server-side. */
  share_url: string | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ReferredByView = {
  referral_code: string;
  earning_start: string;
  /** Drives "your bonus window ends in N days". */
  earning_end: string | null;
};

/**
 * Program-level rates. Shared shape: a future `GET /social/me` returns its own
 * `earn_rates` block of the same form, so the path carries the namespace.
 *
 * Null per field, never absent — an unconfigured program has no rate rather
 * than a missing key.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EarnRatesView = {
  revshare_rate_bps: number | null;
  cashback_rate_bps: number | null;
  earning_term_days: number | null;
};

/** `GET /referral/me` — the single call that decides which screen renders. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ReferralMeDto = {
  role: ReferralRole;
  variant: ReferralVariant;
  user_type: ReferralUserType;
  status: ReferralUserStatus;
  referral_code: ReferralCodeView | null;
  referred_by: ReferredByView | null;
  earn_rates: EarnRatesView;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EarningsSummaryTotals = {
  lifetime: string;
  /** The exact net a claim of this type would pay right now. */
  claimable: string;
  pending: string;
  claimed: string;
  forfeited: string;
  blocking_reason: ClaimBlockingReason | null;
};

/**
 * `GET /earnings/summary` — all totals scoped to the requested
 * `earning_origin_type` set. Carries only what is not derivable: currency and
 * decimals are constants, and "which types to claim" / "all vs partial" come
 * from `deriveClaimability`.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EarningsSummaryDto = {
  lifetime_total: string;
  /** Exact net a claim over the scoped types would pay right now. */
  claimable: string;
  pending: string;
  claimed: string;
  forfeited: string;
  minimum_musd_base_units: string;
  /** Every in-scope key is present, defaulting to "0". */
  by_earning_origin_type: Partial<
    Record<EarningOriginType, EarningsSummaryTotals>
  >;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LedgerSwapsSourceView = {
  quote_id: string;
  src_asset_symbol: string | null;
  dest_asset_symbol: string | null;
  src_tx_hash: string | null;
  dest_tx_hash: string | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LedgerPerpsSourceView = {
  coin: string;
  trade_id: string;
  tx_hash: string | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LedgerEntryDto = {
  /** Stable list key. */
  id: string;
  earning_origin_type: EarningOriginType;
  musd_amount: string;
  fee_amount_usd: string;
  /** A rev-share day row may represent hundreds of trades. */
  entry_count: number;
  transaction_hash: string | null;
  chain_id: string | null;
  ledger_timestamp: string;
  claim_status: string;
  claim_expires_at: string | null;
  /**
   * Only `CASHBACK` is per-trade and names a source. Aggregates carry none —
   * a deliberate privacy boundary, not an omission.
   */
  swaps_source: LedgerSwapsSourceView | null;
  perps_source: LedgerPerpsSourceView | null;
};

/** Matches the repo-wide cursor page contract consumed by `useCursorPaginatedList`. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EarningsLedgerPageDto = {
  results: LedgerEntryDto[];
  has_more: boolean;
  cursor: string | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ClaimVoucherDto = {
  claim_id: string;
  /** Treasury address the authorization draws from. */
  from: string;
  to: string;
  /** mUSD base units as a decimal string. */
  value: string;
  /** Unix seconds. */
  valid_after: number;
  /** Unix seconds. The window is one minute. */
  valid_before: number;
  /** hex bytes32 */
  nonce: string;
  /** hex bytes65 */
  signature: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ClaimExcludedDto = {
  type: EarningOriginType;
  reason: ClaimBlockingReason;
};

export type ClaimStatusDto = 'LIVE_VOUCHER' | 'AWAITING_RELEASE' | 'OPENED';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ClaimDto = {
  id: string;
  beneficiary_profile_id: string;
  money_account_address: string;
  earning_origin_types: EarningOriginType[];
  gross_amount: string;
  withheld_amount: string;
  net_amount: string;
  withholding_rate_bps: number;
  valid_before: string | null;
  status: string;
  created_at: string;
};

/** `POST /wr/earnings/claim` */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ClaimInitiateResultDto = {
  claim: ClaimDto;
  /** Null when a lapsed claim is awaiting release. */
  voucher: ClaimVoucherDto | null;
  excluded: ClaimExcludedDto[];
  status: ClaimStatusDto;
};

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface GetReferralMeDto {
  /** Bypass the cache for this read. The repo's name — not `forceRefresh`. */
  forceFresh?: boolean;
}

export interface GetEarningsSummaryDto {
  /** Empty or omitted means all origin types. */
  originTypes?: EarningOriginType[];
  forceFresh?: boolean;
}

export interface GetEarningsLedgerDto {
  originTypes?: EarningOriginType[];
  cursor?: string | null;
  /**
   * Only honoured on a page-1 read; a cursor page always goes straight to the
   * network.
   */
  forceFresh?: boolean;
}

export interface InitiateClaimDto {
  moneyAccountAddress: string;
  originTypes: EarningOriginType[];
}

// ─── Controller state ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CacheEntry<T> = {
  payload: T;
  lastFetched: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsMoneyControllerState = {
  /**
   * Profile-scoped, not account-scoped — a single entry rather than a map.
   */
  referralMe: CacheEntry<ReferralMeDto> | null;
  /** Keyed by the origin-type scope. */
  earningsSummary: Record<string, CacheEntry<EarningsSummaryDto>>;
  /** Page 1 only. Later pages are merged in `useCursorPaginatedList`. */
  earningsLedgerFirstPage: Record<string, CacheEntry<EarningsLedgerPageDto>>;
};

export type RewardsMoneyControllerGetStateAction = ControllerGetStateAction<
  typeof REWARDS_MONEY_CONTROLLER_NAME,
  RewardsMoneyControllerState
>;

export type RewardsMoneyControllerStateChangeEvent = ControllerStateChangeEvent<
  typeof REWARDS_MONEY_CONTROLLER_NAME,
  RewardsMoneyControllerState
>;

/**
 * Published after a claim confirms so an open screen can re-query, following
 * the existing rewards event-invalidation pattern.
 */
export interface RewardsMoneyControllerEarningsUpdatedEvent {
  type: `${typeof REWARDS_MONEY_CONTROLLER_NAME}:earningsUpdated`;
  payload: [];
}

export type RewardsMoneyControllerActions =
  | RewardsMoneyControllerGetStateAction
  | RewardsMoneyControllerMethodActions;

export type RewardsMoneyControllerEvents =
  | RewardsMoneyControllerStateChangeEvent
  | RewardsMoneyControllerEarningsUpdatedEvent;

export type RewardsMoneyControllerMessengerType = Messenger<
  typeof REWARDS_MONEY_CONTROLLER_NAME,
  RewardsMoneyControllerActions,
  RewardsMoneyControllerEvents
>;
