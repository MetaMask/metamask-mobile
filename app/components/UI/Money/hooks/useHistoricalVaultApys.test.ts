import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { MoneyQueryKeys } from '../queryKeys';
import { fetchMoneyHistoricalVaultApys } from '../services/moneyHistoricalVaultApys';
import type { VaultApyHistoryResponse } from '../types/moneyHistoricalVaultApys';
import { useHistoricalVaultApys } from './useHistoricalVaultApys';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyAccountVaultConfig: jest.fn(),
}));

jest.mock('../services/moneyHistoricalVaultApys', () => ({
  fetchMoneyHistoricalVaultApys: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
const mockFetchMoneyHistoricalVaultApys = jest.mocked(
  fetchMoneyHistoricalVaultApys,
);

const VAULT_CONFIG = {
  boringVault: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
  chainId: '0x8f',
};

const MOCK_RESPONSE = {} as VaultApyHistoryResponse;

interface VaultConfig {
  boringVault?: string;
  chainId?: string;
}

interface QueryOptions {
  queryKey: readonly unknown[];
  queryFn: () => Promise<VaultApyHistoryResponse>;
  staleTime: number;
  enabled: boolean;
}

const setSelector = (vaultConfig: VaultConfig = VAULT_CONFIG): void => {
  mockUseSelector.mockImplementation((selector) =>
    selector === selectMoneyAccountVaultConfig ? vaultConfig : undefined,
  );
};

const getQueryOptions = (): QueryOptions => {
  const queryCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
  if (queryCall === undefined) {
    throw new Error('Expected useQuery to be called');
  }

  return queryCall[0] as QueryOptions;
};

describe('useHistoricalVaultApys', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setSelector();
    mockUseQuery.mockReturnValue({} as never);
  });

  it('uses the configured vault address and decimal chain ID', () => {
    renderHook(() => useHistoricalVaultApys());

    expect(getQueryOptions().queryKey).toEqual([
      MoneyQueryKeys.FETCH_VAULT_APY_HISTORY,
      VAULT_CONFIG.boringVault.toLowerCase(),
      143,
    ]);
  });

  it('enables the query by default', () => {
    renderHook(() => useHistoricalVaultApys());

    expect(getQueryOptions().enabled).toBe(true);
  });

  it('sets 15-minute query freshness', () => {
    renderHook(() => useHistoricalVaultApys());

    expect(getQueryOptions().staleTime).toBe(15 * 60 * 1000);
  });

  it('disables the query when caller enablement is false', () => {
    renderHook(() => useHistoricalVaultApys({ enabled: false }));

    expect(getQueryOptions().enabled).toBe(false);
  });

  it('disables the query when vault configuration is missing', () => {
    setSelector({});

    renderHook(() => useHistoricalVaultApys());

    expect(getQueryOptions().enabled).toBe(false);
  });

  it('disables the query when the vault chain ID is invalid', () => {
    setSelector({ ...VAULT_CONFIG, chainId: 'invalid' });

    renderHook(() => useHistoricalVaultApys());

    expect(getQueryOptions().enabled).toBe(false);
  });

  it('passes normalized vault address and decimal chain ID to the fetcher', async () => {
    mockFetchMoneyHistoricalVaultApys.mockResolvedValue(MOCK_RESPONSE);
    renderHook(() => useHistoricalVaultApys());

    const result = await getQueryOptions().queryFn();

    expect(result).toBe(MOCK_RESPONSE);
    expect(mockFetchMoneyHistoricalVaultApys).toHaveBeenCalledWith(
      VAULT_CONFIG.boringVault.toLowerCase(),
      143,
    );
  });

  it('propagates fetcher failures', async () => {
    const error = new Error('historical APY unavailable');
    mockFetchMoneyHistoricalVaultApys.mockRejectedValue(error);
    renderHook(() => useHistoricalVaultApys());

    await expect(getQueryOptions().queryFn()).rejects.toBe(error);
  });

  it('throws when the query function lacks required configuration', async () => {
    setSelector({});
    renderHook(() => useHistoricalVaultApys());

    await expect(getQueryOptions().queryFn()).rejects.toThrow(
      'Cannot fetch Money historical vault APYs without a vault address and valid chain ID',
    );
  });
});
