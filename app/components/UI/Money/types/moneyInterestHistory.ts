/* eslint-disable @typescript-eslint/naming-convention */

export type InterestHistoryRangeKey = '7d' | '30d' | '90d' | '180d' | '365d';

export type InterestHistoryGranularity = 'day' | 'week' | 'month';

export type PeriodStatus = 'complete' | 'partial' | 'not_applicable';

export type Availability = 'available' | 'unavailable' | 'not_applicable';

export type UnavailableReason =
  | 'insufficient_cash_flow_history'
  | 'cash_flow_replay_invariant_failed'
  | 'historical_accountant_rate_unavailable'
  | 'vault_accounting_not_finalized'
  | 'before_user_earnings_inception'
  | 'historical_price_missing'
  | 'historical_price_stale';

export interface InterestHistoryAvailability {
  earnings: Availability;
  usd_pricing: Availability;
}

export interface InterestHistoryTotals {
  interest_earned_musd_assets: string | null;
  interest_earned_usd: string | null;
}

export interface InterestHistoryEarnings {
  period_status: PeriodStatus;
  availability: InterestHistoryAvailability;
  unavailable_reasons: UnavailableReason[];
  interest_earned_musd_assets: string | null;
  interest_earned_usd: string | null;
}

export interface InterestHistoryPerVault extends InterestHistoryEarnings {
  vault_key: string;
  vault_address: string;
}

export interface InterestHistoryBucket extends InterestHistoryEarnings {
  start: string;
  end: string;
  musd_price_usd: string | null;
  price_as_of: string | null;
  price_source: 'metamask_price_api' | null;
  by_vault: InterestHistoryPerVault[];
}

export interface InterestHistoryRange {
  range: InterestHistoryRangeKey;
  granularity: InterestHistoryGranularity;
  range_start: string;
  range_end: string;
  period_status: PeriodStatus;
  availability: InterestHistoryAvailability;
  unavailable_reasons: UnavailableReason[];
  totals: InterestHistoryTotals;
  buckets: InterestHistoryBucket[];
}

export interface InterestHistoryResponse {
  address: string;
  chain_id: number;
  bucket_timezone: 'UTC';
  updated_through: string;
  source_watermark: {
    vault_accounting: {
      block_number: string;
      block_timestamp: string;
    };
  };
  method: 'nav_difference';
  denomination: {
    asset: 'mUSD';
    decimals: 6;
  };
  ranges: InterestHistoryRange[];
}
