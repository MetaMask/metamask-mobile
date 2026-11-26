import type { InterestHistoryResponse } from '../../../app/components/UI/Money/types/moneyInterestHistory';
import type { VaultApyHistoryResponse } from '../../../app/components/UI/Money/types/moneyHistoricalVaultApys';
import type { VaultCompositionResponse } from '../../../app/components/UI/Money/types/moneyVaultComposition';
import { moneyHistoricalEarningsResponse } from '../../../app/components/UI/Money/__fixtures__/moneyInterestHistory';
import { moneyVaultCompositionResponse } from '../../../app/components/UI/Money/__fixtures__/moneyVaultComposition';
import { restoreFetchPath, stubFetchPath } from './fetchStub';

const MONEY_EARNINGS_PATH =
  '/v1/positions/0x1234567890abcdef1234567890abcdef12345678/interest-history';
const MONEY_VAULT_COMPOSITION_PATH =
  '/v1/vaults/0xb4563bcd3b7764ccbf497f515585f70b6c3ea5ae/composition';
const MONEY_VAULT_APY_HISTORY_PATH = '/v1/vaults/apy-history';
const MONEY_EARNINGS_ORIGINS = [
  'https://money.dev-api.cx.metamask.io',
  'https://money.uat-api.cx.metamask.io',
  'https://money.api.cx.metamask.io',
] as const;

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
  compositionResponse?:
    | VaultCompositionResponse
    | Record<string, unknown>
    | null;
  status?: number;
  compositionStatus?: number;
  historicalApyStatus?: number;
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
  status = 200,
  compositionStatus = status,
  historicalApyStatus = status,
}: SetupMoneyAllocationApiMockOptions = {}): void => {
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    stubFetchPath(
      origin,
      MONEY_VAULT_COMPOSITION_PATH,
      compositionResponse,
      compositionStatus,
      { method: 'GET' },
    );
  });
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    stubFetchPath(
      origin,
      MONEY_VAULT_APY_HISTORY_PATH,
      moneyHistoricalVaultApysResponse,
      historicalApyStatus,
      { method: 'GET' },
    );
  });
};

export const clearMoneyAllocationApiMocks = (): void => {
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    restoreFetchPath(origin, MONEY_VAULT_COMPOSITION_PATH, { method: 'GET' });
  });
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    restoreFetchPath(origin, MONEY_VAULT_APY_HISTORY_PATH, { method: 'GET' });
  });
};
