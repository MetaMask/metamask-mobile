/* eslint-disable @typescript-eslint/naming-convention */

export type DecimalString = string;
export type IsoDateTimeString = string;
export type EvmAddress = string;
export type Bytes32 = string;

export interface VaultCompositionResponse {
  chain_id: number;
  vault_address: EvmAddress;
  vault_key: 'standard' | 'premium';
  boundary_at: IsoDateTimeString;
  as_of_block: number;
  as_of_timestamp: IsoDateTimeString;
  snapshot_id: string;
  snapshot_published_at: IsoDateTimeString;
  incentive_data_status: 'available' | 'unavailable';
  incentives_fetched_at: IsoDateTimeString | null;
  incentive_unavailable_reason: string | null;
  data_freshness: 'live' | 'degraded';
  snapshot_lag_seconds: number;
  stale_reason: string | null;
  nav_usd: DecimalString;
  fees: VaultCompositionFees;
  prices: VaultCompositionPrice[];
  components: VaultCompositionComponent[];
  protocols: VaultCompositionProtocol[];
  markets: VaultCompositionMarket[];
  reconciliation: VaultCompositionReconciliation;
}

export interface VaultCompositionFees {
  platform_fee_bps: number;
  performance_fee_bps: number;
}

export interface VaultCompositionPrice {
  asset_symbol: string;
  price_usd: DecimalString;
  price_as_of: IsoDateTimeString;
  source: string;
  read_at: IsoDateTimeString;
}

export interface VaultCompositionSourceLink {
  kind: 'contract' | 'market';
  label: string;
  url: string;
}

export interface VaultCompositionComponent {
  component_key:
    | 'direct_idle_musd'
    | 'direct_idle_usdc'
    | 'aave_v3_musd'
    | 'morpho_v2_musd'
    | 'morpho_v2_usdc';
  label: string;
  protocol: 'liquidity_buffer' | 'aave_v3' | 'morpho_v2';
  assets: {
    asset_symbol: string;
    amount: DecimalString;
    value_usd: DecimalString;
  }[];
  allocation_value_usd: DecimalString;
  allocation_fraction: DecimalString;
  organic_supply_apy: DecimalString;
  incentive_apr: DecimalString | null;
  estimated_total_annual_rate: DecimalString | null;
  weighted_organic_apy_contribution: DecimalString;
  weighted_incentive_apr_contribution: DecimalString | null;
  campaign_ends_at: IsoDateTimeString | null;
  source_links: VaultCompositionSourceLink[];
}

export interface VaultCompositionProtocol {
  protocol_key: 'liquidity_buffer' | 'aave_v3' | 'morpho_v2';
  allocation_value_usd: DecimalString;
  allocation_fraction: DecimalString;
  organic_supply_apy: DecimalString;
  incentive_apr: DecimalString | null;
  estimated_total_annual_rate: DecimalString | null;
}

export interface VaultCompositionMarket {
  row_kind: 'morpho_market' | 'parent_idle';
  market_key: Bytes32 | `${string}:parent_idle`;
  parent_component_key: 'morpho_v2_musd' | 'morpho_v2_usdc';
  label: string;
  collateral_symbol: string | null;
  loan_symbol: string;
  lltv: DecimalString | null;
  maturity: IsoDateTimeString | null;
  allocation_assets: DecimalString;
  allocation_value_usd: DecimalString;
  allocation_fraction_of_parent: DecimalString;
  allocation_fraction_of_vault: DecimalString;
  organic_supply_apy: DecimalString;
  weighted_organic_apy_contribution: DecimalString;
  market_url: string | null;
  source_links: VaultCompositionSourceLink[];
}

export interface VaultCompositionReconciliation {
  allocation_delta_usd: DecimalString;
  accountant_implied_aum_usd: DecimalString;
  accountant_aum_delta_usd: DecimalString;
  accountant_aum_delta_fraction: DecimalString;
  weighted_gross_organic_apy: DecimalString;
  weighted_incentive_apr: DecimalString | null;
  warning: string | null;
}
