import type { Messenger } from '@metamask/messenger';
import type {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { Quote, QuoteResponse } from '@metamask/bridge-controller';
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
  /**
   * End of the window in which the referrer earns revenue share on this user's
   * trades. The referrer's term, not this user's bonus.
   */
  earning_end: string | null;
  /**
   * End of this user's own cashback window, snapshotted at registration from
   * the program's cashback term. Drives "your bonus window ends in N days".
   */
  cashback_earning_end: string | null;
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
  | 'claimFailureToast'
  | 'claimFailureRetryToast'
  | 'claimFailureWaitToast'
  | 'claimFailureMinimumToast'
  | 'claimFailureAddressBlockedToast'
  | 'historyClaimPending'
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
  | 'tradingActivityEmptyDescription'
  | 'tradingActivityEmptyAction'
  | 'copiedOnce'
  | 'copiedTimes'
  | 'rebatePerpsVolume'
  | 'rebateSwapsVolume'
  | 'rebatePredictions'
  | 'rebateSwaps'
  | 'inviteTitle'
  | 'inviteIllustrationLabel'
  | 'inviteMessageBody'
  | 'inviteReferralCode'
  | 'inviteDecline'
  | 'inviteAccept'
  | 'inviteAcceptedEyebrow'
  | 'inviteAcceptedTitle'
  | 'inviteAcceptedBody'
  | 'inviteAcceptedCloseA11y'
  | 'inviteAcceptedViewRewards'
  | 'inviteAcceptedStartTrading'
  | 'invitedBenefitTitle'
  | 'invitedReferredBy'
  | 'invitedOptInDescription'
  | 'invitedOptInAction'
  | 'invitedOptInSuccessToast'
  | 'invitedOptInLegal'
  | 'termsTitle'
  | 'termsDescription'
  | 'termsLearnMore'
  | 'termsUrl';

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
  /**
   * Base units voided and not paid. Absent when the caller opted out of
   * claimability, like `claimable`, `held`, and `blocked`.
   */
  voided?: string;
  pending: string;
  claimed: string;
  blocking_reason?: ClaimBlockingReason | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AddressTotalsDto = {
  address: string;
  lifetime: string;
  claimable?: string;
  held?: string;
  blocked?: string;
  /** Absent when the caller opted out of claimability. */
  voided?: string;
  pending: string;
  claimed: string;
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
  /** Absent when the caller opted out of claimability. */
  voided?: string;
  pending: string;
  claimed: string;
  minimum_musd_base_units: string;
  self_earned: BranchViewDto<SelfEarnedFamilyTotalsDto>;
  earned_by_others: BranchViewDto<EarnedByOthersFamilyTotalsDto>;
  /**
   * True while part of this profile's money is still keyed on a profile merged
   * into it and has not moved yet. The figures then cover only what has
   * arrived. Always present.
   */
  pairing_pending: boolean;
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
export type LedgerPredictSourceView = {
  condition_id: string;
  token_id: string;
  side: string;
  tx_hash: string | null;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LedgerEarningEntryDto = {
  type: 'earning';
  id: string;
  earning_origin_type: EarningOriginType;
  musd_amount: string;
  /** The part of `musd_amount` that is voided. `"0"` when nothing is. */
  voided_musd_amount: string;
  fee_amount_usd: string;
  entry_count: number;
  transaction_hash: string | null;
  chain_id: string | null;
  ledger_timestamp: string;
  claim_status: string;
  /**
   * When this entry stops being pending. Never null: a cashback entry carries
   * the end of its claim delay, and a day entry carries its UTC day's close.
   */
  claimable_at: string;
  blocking_reason?: LedgerBlockingReason | null;
  swaps_source: LedgerSwapsSourceView | null;
  perps_source: LedgerPerpsSourceView | null;
  predict_source: LedgerPredictSourceView | null;
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
  /** `VOUCHER` for an in-app claim; `MANUAL` for a recorded payout. */
  payout_method: string;
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
  /** `VOUCHER` for an in-app claim; `MANUAL` for a recorded payout. */
  payout_method: string;
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

/** Last path segment of `POST /wr/earnings/claim/<slug>`. */
export type ClaimRouteSlug =
  | 'referral-trade-fee-cashback'
  | 'referral-rev-share';

export interface ClaimVoucherDto {
  claim_id: string;
  from: string;
  to: string;
  value: string;
  valid_after: number;
  valid_before: number;
  nonce: string;
  signature: string;
}

export interface ClaimExcludedDto {
  type: string;
  reason: string;
}

export interface ClaimInitiateDto {
  claim: ClaimDto;
  voucher: ClaimVoucherDto | null;
  excluded: ClaimExcludedDto[];
  status: 'LIVE_VOUCHER' | 'AWAITING_RELEASE' | 'OPENED';
}

export interface ClaimProofChallengeDto {
  earning_address: string;
  amount_musd_base_units: string;
  message: string;
}

export interface ClaimProofRequiredDto {
  reason: 'PROOF_REQUIRED';
  claim_intent_id: string;
  expires_at: string;
  challenges: ClaimProofChallengeDto[];
}

export interface ClaimProofSubmissionDto {
  earning_address: string;
  signature: string;
}

export interface InitiateClaimBody {
  money_account_address: string;
  claim_intent_id?: string;
  proofs?: ClaimProofSubmissionDto[];
}

export type InitiateClaimResult =
  | { kind: 'authorized'; body: ClaimInitiateDto }
  | { kind: 'proof_required'; body: ClaimProofRequiredDto };

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

/**
 * Optional narrowing for `GET /earnings/summary`.
 *
 * A window (`from`/`to`, UTC `YYYY-MM-DD`, closed on both ends) is only valid
 * with `includeClaimable: false`. Claimability is what a claim would pay right
 * now, so the server refuses it beside a window rather than mixing the two.
 */
export interface EarningsSummaryQuery {
  from?: string;
  to?: string;
  /**
   * When false, the response omits `claimable`, `held` and `blocked`.
   * Defaults to true, matching the server.
   */
  includeClaimable?: boolean;
}

export interface GetEarningsSummaryDto extends EarningsSummaryQuery {
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

/**
 * Products this client asks `POST /earnings/rebate/quote` about. Predict is
 * accepted by the server and answers `PRODUCT_NOT_SUPPORTED`; it is not on
 * this surface.
 */
export type RebateQuoteProduct = 'swaps' | 'perps';

/** Why a quote shows no rebate row. Mirrors the money service. */
export type RebateQuoteReason =
  | 'NO_REBATE'
  | 'FEE_TOKEN_NOT_ELIGIBLE'
  | 'REGION_RESTRICTED'
  | 'PRODUCT_NOT_SUPPORTED';

/**
 * `POST /earnings/rebate/quote`. `rebateBips` is bips of the MetaMask fee:
 * 2000 is 20%.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RebateQuoteResponse = {
  product: RebateQuoteProduct;
  /** Always `rebateBips > 0`. */
  eligible: boolean;
  rebateBips: number;
  reason: RebateQuoteReason | null;
};

export type PerpsRebateTradeSide = 'BUY' | 'SELL';

/**
 * What the perps client is about to trade. The server validates this and
 * drops it: no rate depends on it today. The controller leaves out a trade
 * the server would refuse, so a bad one never costs the quote.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type PerpsRebateTrade = {
  /**
   * A Hyperliquid perp name: `BTC`, or a builder-deployed `xyz:TSLA`. Spot
   * names such as `@107` are not perps.
   */
  coin: string;
  side: PerpsRebateTradeSide;
  /**
   * Size times price in USD, as a plain non-negative decimal string: up to
   * 15 integer digits and 18 decimals, no sign, no exponent.
   */
  notionalUsd: string;
};

/**
 * The swaps bridge quote a rebate quote is asked about: the `quote` of a
 * bridge `QuoteResponse` (either version), not the response itself. Only its
 * `feeData` matters; the server reads `feeData.metabridge` alone.
 */
export type SwapsRebateBridgeQuote =
  | Pick<Quote, 'feeData'>
  | Pick<QuoteResponse['quote'], 'feeData'>;

/**
 * Body of `POST /earnings/rebate/quote`. The controller sets `product`;
 * callers never do. Swaps send only the MetaMask fee leg of the quote.
 */
export type RebateQuoteBody =
  | {
      product: 'swaps';
      quote: {
        feeData: {
          metabridge: SwapsRebateBridgeQuote['feeData']['metabridge'];
        };
      };
    }
  | {
      product: 'perps';
      trade?: PerpsRebateTrade;
    };

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
