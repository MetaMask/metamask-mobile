import type { InterestHistoryResponse } from '../../../app/components/UI/Money/types/moneyInterestHistory';
import type { VaultApyHistoryResponse } from '../../../app/components/UI/Money/types/moneyHistoricalVaultApys';
import type { VaultCompositionResponse } from '../../../app/components/UI/Money/types/moneyVaultComposition';
import { moneyHistoricalEarningsResponse } from '../../../app/components/UI/Money/__fixtures__/moneyInterestHistory';
import { restoreFetchPath, stubFetchPath } from './fetchStub';

const MONEY_EARNINGS_PATH =
  '/v1/positions/0x1234567890abcdef1234567890abcdef12345678/interest-history';
const MONEY_VAULT_COMPOSITION_PATH =
  '/v1/vaults/0x1c8a336051d2024e318a229d01f9f6cf96efd316/composition';
const MONEY_VAULT_APY_HISTORY_PATH = '/v1/vaults/apy-history';
const MONEY_EARNINGS_ORIGINS = [
  'https://money.dev-api.cx.metamask.io',
  'https://money.uat-api.cx.metamask.io',
  'https://money.api.cx.metamask.io',
] as const;
const MONEY_LOCAL_API_ORIGINS = ['http://localhost:3000'] as const;

export const moneyVaultCompositionResponse: VaultCompositionResponse = {
  chain_id: 143,
  vault_address: '0x1c8a336051d2024e318a229d01f9f6cf96efd316',
  vault_key: 'standard',
  boundary_at: '2026-11-26T00:00:00Z',
  as_of_block: 123456,
  as_of_timestamp: '2026-11-26T00:00:00Z',
  snapshot_id: 'snapshot-1',
  snapshot_published_at: '2026-11-26T00:05:00Z',
  incentive_data_status: 'available',
  incentives_fetched_at: '2026-11-26T00:01:00Z',
  incentive_unavailable_reason: null,
  data_freshness: 'live',
  snapshot_lag_seconds: 0,
  stale_reason: null,
  nav_usd: '100',
  fees: {
    platform_fee_bps: 100,
    performance_fee_bps: 1000,
  },
  prices: [],
  components: [
    {
      component_key: 'direct_idle_usdc',
      label: 'Liquidity buffer',
      protocol: 'liquidity_buffer',
      assets: [{ asset_symbol: 'USDC', amount: '40', value_usd: '40' }],
      allocation_value_usd: '40',
      allocation_fraction: '0.4',
      organic_supply_apy: '0',
      incentive_apr: null,
      estimated_total_annual_rate: '0',
      weighted_organic_apy_contribution: '0',
      weighted_incentive_apr_contribution: null,
      campaign_ends_at: null,
      source_links: [],
    },
    {
      component_key: 'aave_v3_musd',
      label: 'Aave mUSD',
      protocol: 'aave_v3',
      assets: [{ asset_symbol: 'mUSD', amount: '60', value_usd: '60' }],
      allocation_value_usd: '60',
      allocation_fraction: '0.6',
      organic_supply_apy: '0.052',
      incentive_apr: '0.01',
      estimated_total_annual_rate: '0.062',
      weighted_organic_apy_contribution: '0.0312',
      weighted_incentive_apr_contribution: '0.006',
      campaign_ends_at: null,
      source_links: [],
    },
  ],
  protocols: [],
  markets: [],
  reconciliation: {
    allocation_delta_usd: '0',
    accountant_implied_aum_usd: '100',
    accountant_aum_delta_usd: '0',
    accountant_aum_delta_fraction: '0',
    weighted_gross_organic_apy: '0.0312',
    weighted_incentive_apr: '0.006',
    warning: null,
  },
};

export const moneyHistoricalVaultApysResponse: VaultApyHistoryResponse = {
  chain_id: 143,
  vaults: [
    {
      vault_key: 'standard',
      vault_address: moneyVaultCompositionResponse.vault_address,
      daily_apy: [],
      periods: {
        '7d': {
          status: 'available',
          start_timestamp: '2026-11-19T00:00:00Z',
          end_timestamp: '2026-11-26T00:00:00Z',
          average_apy: '0.052',
          realized_period_apy: '0.001',
          previous_start_timestamp: '2026-11-12T00:00:00Z',
          previous_end_timestamp: '2026-11-19T00:00:00Z',
          previous_average_apy: '0.05',
          absolute_change: '0.002',
          relative_change: '0.04',
          direction: 'increase',
          unavailable_reason: null,
        },
        '30d': {
          status: 'available',
          start_timestamp: '2026-10-27T00:00:00Z',
          end_timestamp: '2026-11-26T00:00:00Z',
          average_apy: '0.052',
          realized_period_apy: '0.004',
          previous_start_timestamp: '2026-09-27T00:00:00Z',
          previous_end_timestamp: '2026-10-27T00:00:00Z',
          previous_average_apy: '0.05',
          absolute_change: '0.002',
          relative_change: '0.04',
          direction: 'increase',
          unavailable_reason: null,
        },
        '90d': {
          status: 'available',
          start_timestamp: '2026-08-28T00:00:00Z',
          end_timestamp: '2026-11-26T00:00:00Z',
          average_apy: '0.051',
          realized_period_apy: '0.012',
          previous_start_timestamp: '2026-05-30T00:00:00Z',
          previous_end_timestamp: '2026-08-28T00:00:00Z',
          previous_average_apy: '0.049',
          absolute_change: '0.002',
          relative_change: '0.04',
          direction: 'increase',
          unavailable_reason: null,
        },
        '180d': {
          status: 'available',
          start_timestamp: '2026-05-30T00:00:00Z',
          end_timestamp: '2026-11-26T00:00:00Z',
          average_apy: '0.05',
          realized_period_apy: '0.024',
          previous_start_timestamp: '2026-01-01T00:00:00Z',
          previous_end_timestamp: '2026-05-30T00:00:00Z',
          previous_average_apy: '0.048',
          absolute_change: '0.002',
          relative_change: '0.04',
          direction: 'increase',
          unavailable_reason: null,
        },
      },
    },
  ],
};

interface SetupMoneyEarningsApiMockOptions {
  response?: InterestHistoryResponse | Record<string, unknown>;
  status?: number;
  onRequest?: (url: string) => void;
}

interface SetupMoneyAllocationApiMockOptions {
  compositionResponse?: VaultCompositionResponse | Record<string, unknown>;
  historicalApyResponse?: VaultApyHistoryResponse | Record<string, unknown>;
  status?: number;
}

export const setupMoneyEarningsApiMock = ({
  response = moneyHistoricalEarningsResponse,
  status = 200,
  onRequest,
}: SetupMoneyEarningsApiMockOptions = {}): void => {
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    stubFetchPath(origin, MONEY_EARNINGS_PATH, response, status, {
      method: 'GET',
      onRequest: ({ url }) => onRequest?.(url),
    });
  });
};

export const clearMoneyEarningsApiMocks = (): void => {
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    restoreFetchPath(origin, MONEY_EARNINGS_PATH, { method: 'GET' });
  });
};

export const setupMoneyAllocationApiMock = ({
  compositionResponse = moneyVaultCompositionResponse,
  historicalApyResponse = moneyHistoricalVaultApysResponse,
  status = 200,
}: SetupMoneyAllocationApiMockOptions = {}): void => {
  MONEY_LOCAL_API_ORIGINS.forEach((origin) => {
    stubFetchPath(
      origin,
      MONEY_VAULT_COMPOSITION_PATH,
      compositionResponse,
      status,
      { method: 'GET' },
    );
  });
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    stubFetchPath(
      origin,
      MONEY_VAULT_APY_HISTORY_PATH,
      historicalApyResponse,
      status,
      { method: 'GET' },
    );
  });
};

export const clearMoneyAllocationApiMocks = (): void => {
  MONEY_LOCAL_API_ORIGINS.forEach((origin) => {
    restoreFetchPath(origin, MONEY_VAULT_COMPOSITION_PATH, { method: 'GET' });
  });
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    restoreFetchPath(origin, MONEY_VAULT_APY_HISTORY_PATH, { method: 'GET' });
  });
};
