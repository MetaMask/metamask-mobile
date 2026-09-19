import type { Messenger } from '@metamask/messenger';
import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { RewardsMoneyControllerMethodActions } from './RewardsMoneyController-method-action-types';

export const REWARDS_MONEY_CONTROLLER_NAME = 'RewardsMoneyController' as const;

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

export type EarningOriginType =
  | 'SWAPS_FEE_CASHBACK'
  | 'PERPS_FEE_CASHBACK'
  | 'REFERRAL_REV_SHARE'
  | 'SOCIAL_FOLLOW_TRADE';

/**
 * What one claim settles, and the key the summary groups by. Both cashback
 * mechanisms settle as one family, so they are one balance on a read surface.
 */
export type EarningClaimFamily =
  | 'REFERRAL_TRADE_FEE_CASHBACK'
  | 'REFERRAL_REV_SHARE'
  | 'SOCIAL_FOLLOW_TRADE';

export type ClaimBlockingReason =
  | 'SUSPENDED'
  | 'ADDRESS_BLOCKED'
  | 'NO_ELIGIBLE_BALANCE'
  | 'BELOW_MINIMUM'
  | 'VELOCITY_LIMIT_EXCEEDED'
  | 'SIGNER_UNAVAILABLE'
  | 'TAX_DETERMINATION_REQUIRED'
  | 'EARNING_ADDRESS_MISSING'
  | 'MECHANISM_NOT_CLAIMABLE';

export type LedgerBlockingReason =
  | 'SUSPENDED'
  | 'TAX_DETERMINATION_REQUIRED'
  | 'EARNING_ADDRESS_MISSING'
  | 'MECHANISM_NOT_CLAIMABLE';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ReferralCodeView = {
  code: string;
  kind: string;
  status: string;
  /** Null when `REFERRAL_SHARE_URL_TEMPLATE` is unset server-side. */
  share_url: string | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ReferredByView = {
  referral_code: string | null;
  earning_start: string | null;
  /** Drives "your bonus window ends in N days". */
  earning_end: string | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EarnRatesView = {
  revshare_rate_bps: number | null;
  cashback_rate_bps: number | null;
  revshare_earning_term_minutes: number | null;
  cashback_earning_term_minutes: number | null;
};

/**
 * Copy keys the server resolves from Contentful for the referral screens.
 *
 * Mirrors `REFERRAL_CONTENTFUL_STRING_KEYS` in va-mmcx-rewards-money. The
 * server fills any key Contentful is missing from its own English defaults, so
 * every key is always present — never optional.
 */
export type ReferralLocalizedTextKey =
  | 'waysToEarn'
  | 'earningsTab'
  | 'performanceTitle'
  | 'earnEligibleFees'
  | 'yourReferralCode'
  | 'share'
  | 'referrals'
  | 'tradeCommissions'
  | 'recordedEarnings'
  | 'availableToClaim'
  | 'claim'
  | 'claimed'
  | 'claimSuccessToast'
  | 'last7Days'
  | 'recordedEarningsLabel'
  | 'breakdown'
  | 'tradingRebates'
  | 'history'
  | 'historyReferrals'
  | 'historyCommission'
  | 'historyRebate'
  | 'historyClaimed'
  | 'historyPromo'
  | 'shareCode'
  | 'shareVia'
  | 'copyLink'
  | 'messages'
  | 'telegram'
  | 'last30DaysUpdatedDaily'
  | 'eligibleFees'
  | 'funnelCodeUses'
  | 'funnelCodeUsesDescription'
  | 'funnelConfirmed'
  | 'funnelConfirmedDescription'
  | 'funnelActive'
  | 'funnelActiveDescription'
  | 'funnelFeeGenerating'
  | 'funnelFeeGeneratingDescription'
  | 'tradingCommissionsSection'
  | 'copiedOnce'
  | 'copiedTimes'
  | 'rebatePerpsVolume'
  | 'rebateSwapsVolume'
  | 'rebatePredictions'
  | 'rebateSwaps'
  | 'inviteTitle'
  | 'inviteIllustrationLabel'
  | 'inviteBody'
  | 'inviteReferralCode'
  | 'inviteUseDifferentCode'
  | 'inviteCodePlaceholder'
  | 'inviteCancelEdit'
  | 'inviteDecline'
  | 'inviteAccept'
  | 'inviteAcceptedToast'
  | 'invitedBenefitTitle'
  | 'invitedReferredBy'
  | 'invitedOptInDescription'
  | 'invitedOptInAction'
  | 'invitedOptInSuccessToast'
  | 'invitedOptInLegal';

/** Resolved for the request's `Accept-Language`; defaults fill missing keys. */
export type ReferralLocalizedText = {
  [key in ReferralLocalizedTextKey]: string;
};

/** Light/dark Contentful asset URLs. Type alias (not interface) for Json/StateConstraint. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ThemeImage = {
  lightModeUrl: string;
  darkModeUrl: string;
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
  localized_text: ReferralLocalizedText;
  /** Null when Contentful has no invite hero synced. */
  invite_hero: ThemeImage | null;
};

/** `GET /referral/me/funnel` */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ReferralFunnelDto = {
  enrolled: number;
  earning_generating: number;
};

/** One code from `GET /referral/me/referral-code`. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OwnReferralCodeDto = {
  code: string;
  kind: string;
  status: string;
  active_from: string | null;
  active_until: string | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OwnReferralCodesDto = {
  codes: OwnReferralCodeDto[];
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ReadWindowDto = {
  from: string | null;
  to: string | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SummaryTotalsDto = {
  lifetime: string;
  claimable?: string;
  held?: string;
  blocked?: string;
  pending: string;
  claimed: string;
  forfeited: string;
  blocking_reason?: ClaimBlockingReason | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AddressTotalsDto = {
  address: string;
  lifetime: string;
  claimable?: string;
  held?: string;
  blocked?: string;
  pending: string;
  claimed: string;
  forfeited: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SelfEarnedFamilyTotalsDto = SummaryTotalsDto & {
  by_address: AddressTotalsDto[];
};

export type EarnedByOthersFamilyTotalsDto = SummaryTotalsDto;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BranchViewDto<F extends SummaryTotalsDto> = SummaryTotalsDto & {
  by_claim_family: { [family: string]: F };
};

/** `GET /earnings/summary` — live backend SummaryView shape. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EarningsSummaryDto = {
  lifetime_total: string;
  window: ReadWindowDto | null;
  claimable?: string;
  held?: string;
  blocked?: string;
  pending: string;
  claimed: string;
  forfeited: string;
  minimum_musd_base_units: string;
  self_earned: BranchViewDto<SelfEarnedFamilyTotalsDto>;
  earned_by_others: BranchViewDto<EarnedByOthersFamilyTotalsDto>;
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
export type LedgerEarningEntryDto = {
  type: 'earning';
  id: string;
  earning_origin_type: EarningOriginType;
  musd_amount: string;
  fee_amount_usd: string;
  entry_count: number;
  transaction_hash: string | null;
  chain_id: string | null;
  ledger_timestamp: string;
  claim_status: string;
  claim_expires_at: string | null;
  blocking_reason?: LedgerBlockingReason | null;
  swaps_source: LedgerSwapsSourceView | null;
  perps_source: LedgerPerpsSourceView | null;
};

/**
 * Settled payout row from `GET /earnings/ledger?include_claims=true`.
 * In-flight claims stay on `GET /earnings/claim/me` — they are not in this feed.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LedgerClaimEntryDto = {
  type: 'claim';
  id: string;
  route: string;
  gross_amount: string;
  net_amount: string;
  withholding_rate_bps: number;
  status: string;
  ledger_timestamp: string;
  settled_at: string | null;
};

/** Discriminated ledger row; branch on `type`. */
export type LedgerEntryDto = LedgerEarningEntryDto | LedgerClaimEntryDto;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EarningsLedgerPageDto = {
  results: LedgerEntryDto[];
  has_more: boolean;
  cursor: string | null;
  window: ReadWindowDto | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ClaimEarningDto = {
  id: string;
  type: string;
  day: string;
  musd_amount_unfloored: string;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ClaimDto = {
  id: string;
  beneficiary_profile_id: string;
  money_account_address: string;
  earning_origin_types: string[];
  gross_amount: string;
  withheld_amount: string;
  net_amount: string;
  withholding_rate_bps: number;
  nonce: string | null;
  signature: string | null;
  valid_before: string | null;
  settled_block: string | null;
  settled_tx_hash: string | null;
  settled_at: string | null;
  released_at: string | null;
  status: string;
  route: string;
  created_at: string;
  updated_at: string;
  earnings?: ClaimEarningDto[];
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ClaimHistoryPageDto = {
  results: ClaimDto[];
  has_more: boolean;
  cursor: string | null;
};

/**
 * The mechanisms `GET /referral/me/commissions` serves.
 *
 * Deliberately narrower than `EarningOriginType`: the server rejects any other
 * value with a 400 rather than returning an empty page.
 */
export type ReferrerOriginType = 'REFERRAL_REV_SHARE' | 'SOCIAL_FOLLOW_TRADE';

/** Which fill table produced a token. Namespaces `TokenView.key`. */
export type TokenSource = 'PERPS' | 'SWAPS';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TokenView = {
  /**
   * `${source}:${identifier}` — a perps market name or a CAIP-19 asset id.
   * The grouping identity; `symbol` is not.
   */
  key: string;
  /** Display only, and nullable. Never group or match on this. */
  symbol: string | null;
  source: TokenSource;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CommissionEntryView = {
  id: string;
  earning_origin_type: ReferrerOriginType;
  day: string;
  token: TokenView;
  musd_amount: string;
  /** 8dp normally; 2dp when `copied_times` is null. */
  fee_amount_usd: string;
  /** Null whenever `copied_times` is null. */
  fill_count: number | null;
  /** Null when exactly one referee, so a single trader cannot be identified. */
  copied_times: number | null;
};

export type MechanismsView = {
  [K in ReferrerOriginType]: {
    claim_open: boolean;
    reason: 'MECHANISM_NOT_CLAIMABLE' | null;
  };
};

/** `GET /referral/me/commissions` — a breakdown, never a balance. */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CommissionsPageDto = {
  results: CommissionEntryView[];
  mechanisms: MechanismsView;
  has_more: boolean;
  cursor: string | null;
};

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface GetReferralMeDto {
  forceFresh?: boolean;
}

export interface GetReferralFunnelDto {
  forceFresh?: boolean;
}

export interface GetReferralCodesDto {
  forceFresh?: boolean;
}

export interface RegisterRefereeDto {
  /** The referrer's code. The referee is the bearer token's own profile. */
  code: string;
}

export interface GetEarningsSummaryDto {
  originTypes?: EarningOriginType[];
  forceFresh?: boolean;
}

export interface GetEarningsLedgerDto {
  originTypes?: EarningOriginType[];
  cursor?: string | null;
  forceFresh?: boolean;
  /**
   * Interleave settled payouts with accruals (server `include_claims`).
   * Defaults to true — the Earnings history surface wants the unified feed.
   * Pass false only for accrual-only consumers.
   */
  includeClaims?: boolean;
}

export interface GetClaimHistoryDto {
  cursor?: string | null;
  forceFresh?: boolean;
}

export interface GetClaimByIdDto {
  claimId: string;
  forceFresh?: boolean;
}

export interface GetCommissionsDto {
  /** Omit for both mechanisms — the server's default is already all of them. */
  originType?: ReferrerOriginType;
  cursor?: string | null;
  /** `YYYY-MM-DD`. Server defaults to 90 days ago; ignored once paging. */
  fromDay?: string;
  forceFresh?: boolean;
}

// ─── Controller state ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CacheEntry<T> = {
  payload: T;
  lastFetched: number;
};

/** Soft cap on claim-by-id cache entries so the map cannot grow without bound. */
export const CLAIM_BY_ID_CACHE_MAX_ENTRIES = 20;

/**
 * Persisted Rewards Money state.
 *
 * Profile-scoped caches are keyed by Hydra `profileId` (and a scope suffix
 * where needed), matching RewardsController's `subscriptionId`-keyed maps so a
 * late write for profile A cannot be read as profile B.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsMoneyControllerState = {
  /** Keyed by Hydra profileId. */
  referralMe: { [profileId: string]: CacheEntry<ReferralMeDto> };
  /** Keyed by Hydra profileId. */
  referralCodes: { [profileId: string]: CacheEntry<OwnReferralCodesDto> };
  /** Keyed by Hydra profileId. */
  referralFunnel: { [profileId: string]: CacheEntry<ReferralFunnelDto> };
  /** Keyed by `${profileId}:${originTypeScope}`. */
  earningsSummary: { [scopeKey: string]: CacheEntry<EarningsSummaryDto> };
  /** Page 1 only. Keyed by `${profileId}:${ledgerScope}`. */
  earningsLedgerFirstPage: {
    [scopeKey: string]: CacheEntry<EarningsLedgerPageDto>;
  };
  /** Keyed by Hydra profileId. */
  claimHistoryFirstPage: {
    [profileId: string]: CacheEntry<ClaimHistoryPageDto>;
  };
  /** Page 1 only. Keyed by `${profileId}:${commissionsScope}`. */
  commissionsFirstPage: { [scopeKey: string]: CacheEntry<CommissionsPageDto> };
  /** Keyed by `${profileId}:${claimId}`. */
  claimById: { [scopeKey: string]: CacheEntry<ClaimDto> };
  /** Persisted env URL override (non-production builds only). */
  rewardsMoneyEnvUrl: string | null;
};

export type RewardsMoneyControllerGetStateAction = ControllerGetStateAction<
  typeof REWARDS_MONEY_CONTROLLER_NAME,
  RewardsMoneyControllerState
>;

export type RewardsMoneyControllerStateChangeEvent = ControllerStateChangeEvent<
  typeof REWARDS_MONEY_CONTROLLER_NAME,
  RewardsMoneyControllerState
>;

export type RewardsMoneyControllerActions =
  | RewardsMoneyControllerGetStateAction
  | RewardsMoneyControllerMethodActions;

export type RewardsMoneyControllerEvents =
  RewardsMoneyControllerStateChangeEvent;

export type RewardsMoneyControllerMessengerType = Messenger<
  typeof REWARDS_MONEY_CONTROLLER_NAME,
  RewardsMoneyControllerActions,
  RewardsMoneyControllerEvents
>;
