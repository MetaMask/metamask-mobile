/* eslint-disable @typescript-eslint/naming-convention */

export interface VaultCompositionResponse {
  chain_id: number;
  vault_address: string;
  vault_key: 'standard' | 'premium';
  boundary_at: string;
  as_of_block: number;
  as_of_timestamp: string;
  snapshot_id: string;
  snapshot_published_at: string;
  incentive_data_status: 'available' | 'unavailable';
  incentives_fetched_at: string | null;
  incentive_unavailable_reason: string | null;
  data_freshness: 'live' | 'degraded';
  snapshot_lag_seconds: number;
  stale_reason: string | null;
  nav_usd: string;
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
  price_usd: string;
  price_as_of: string;
  source: string;
  read_at: string;
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
    amount: string;
    value_usd: string;
  }[];
  allocation_value_usd: string;
  allocation_fraction: string;
  organic_supply_apy: string;
  incentive_apr: string | null;
  estimated_total_annual_rate: string | null;
  weighted_organic_apy_contribution: string;
  weighted_incentive_apr_contribution: string | null;
  campaign_ends_at: string | null;
  source_links: VaultCompositionSourceLink[];
}

export interface VaultCompositionProtocol {
  protocol_key: 'liquidity_buffer' | 'aave_v3' | 'morpho_v2';
  allocation_value_usd: string;
  allocation_fraction: string;
  organic_supply_apy: string;
  incentive_apr: string | null;
  estimated_total_annual_rate: string | null;
}

export interface VaultCompositionMarket {
  row_kind: 'morpho_market' | 'parent_idle';
  market_key: string;
  parent_component_key: 'morpho_v2_musd' | 'morpho_v2_usdc';
  label: string;
  collateral_symbol: string | null;
  loan_symbol: string;
  lltv: string | null;
  maturity: string | null;
  allocation_assets: string;
  allocation_value_usd: string;
  allocation_fraction_of_parent: string;
  allocation_fraction_of_vault: string;
  organic_supply_apy: string;
  weighted_organic_apy_contribution: string;
  market_url: string | null;
  source_links: VaultCompositionSourceLink[];
}

export interface VaultCompositionReconciliation {
  allocation_delta_usd: string;
  accountant_implied_aum_usd: string;
  accountant_aum_delta_usd: string;
  accountant_aum_delta_fraction: string;
  weighted_gross_organic_apy: string;
  weighted_incentive_apr: string | null;
  warning: string | null;
}
