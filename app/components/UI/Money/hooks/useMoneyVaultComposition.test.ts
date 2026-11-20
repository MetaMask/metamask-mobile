import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { MoneyQueryKeys } from '../queryKeys';
import { fetchMoneyVaultComposition } from '../services/moneyVaultComposition';
import type { VaultCompositionResponse } from '../types/moneyVaultComposition';
import { useMoneyVaultComposition } from './useMoneyVaultComposition';

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

jest.mock('../services/moneyVaultComposition', () => ({
  fetchMoneyVaultComposition: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
const mockFetchMoneyVaultComposition = jest.mocked(fetchMoneyVaultComposition);

const VAULT_CONFIG = {
  boringVault: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
  chainId: '0x8f',
};
const MOCK_RESPONSE = {
  vault_key: 'standard',
  snapshot_id: 'snapshot-1',
} as unknown as VaultCompositionResponse;

interface VaultConfig {
  boringVault?: string;
  chainId?: string;
}

interface QueryOptions {
  queryKey: readonly unknown[];
  queryFn: () => Promise<VaultCompositionResponse>;
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

describe('useMoneyVaultComposition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setSelector();
    mockUseQuery.mockReturnValue({} as never);
  });

  it('uses the configured vault address and chain ID', () => {
    renderHook(() => useMoneyVaultComposition());

    const queryOptions = getQueryOptions();

    expect(queryOptions.queryKey).toEqual([
      MoneyQueryKeys.FETCH_VAULT_COMPOSITION,
      VAULT_CONFIG.boringVault,
      VAULT_CONFIG.chainId,
    ]);
    expect(queryOptions.enabled).toBe(true);
  });

  it('sets 15-minute query freshness', () => {
    renderHook(() => useMoneyVaultComposition());

    expect(getQueryOptions().staleTime).toBe(15 * 60 * 1000);
  });

  it('combines valid configuration with caller enablement', () => {
    renderHook(() => useMoneyVaultComposition({ enabled: false }));

    expect(getQueryOptions().enabled).toBe(false);
  });

  it('disables the query when configuration is missing', () => {
    setSelector({});

    renderHook(() => useMoneyVaultComposition());

    expect(getQueryOptions().enabled).toBe(false);
  });

  it('passes the configured address and parsed chain ID to the composition service', async () => {
    mockFetchMoneyVaultComposition.mockResolvedValue(MOCK_RESPONSE);
    renderHook(() => useMoneyVaultComposition());

    const queryOptions = getQueryOptions();
    const result = await queryOptions.queryFn();

    expect(result).toBe(MOCK_RESPONSE);
    expect(mockFetchMoneyVaultComposition).toHaveBeenCalledWith(
      VAULT_CONFIG.boringVault,
      143,
    );
  });

  it('propagates composition service failures', async () => {
    const error = new Error('composition unavailable');
    mockFetchMoneyVaultComposition.mockRejectedValue(error);
    renderHook(() => useMoneyVaultComposition());

    await expect(getQueryOptions().queryFn()).rejects.toBe(error);
  });

  it('throws when the query function lacks required configuration', async () => {
    setSelector({});
    renderHook(() => useMoneyVaultComposition());

    await expect(getQueryOptions().queryFn()).rejects.toThrow(
      'Cannot fetch Money vault composition without a vault address and valid chain ID',
    );
  });
});
