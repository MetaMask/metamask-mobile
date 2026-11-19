import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  selectMoneyAccountPremiumVaultConfig,
  selectMoneyAccountVaultConfig,
} from '../../../../selectors/featureFlagController/moneyAccount';
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
  selectMoneyAccountPremiumVaultConfig: jest.fn(),
  selectMoneyAccountVaultConfig: jest.fn(),
}));

jest.mock('../services/moneyVaultComposition', () => ({
  fetchMoneyVaultComposition: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
const mockFetchMoneyVaultComposition = jest.mocked(fetchMoneyVaultComposition);

const STANDARD_VAULT_CONFIG = {
  boringVault: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
  chainId: '0x8f',
};
const PREMIUM_VAULT_CONFIG = {
  boringVault: '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb',
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

const setSelectors = ({
  standard = STANDARD_VAULT_CONFIG,
  premium = PREMIUM_VAULT_CONFIG,
}: {
  standard?: VaultConfig;
  premium?: VaultConfig;
} = {}): void => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyAccountVaultConfig) {
      return standard;
    }

    if (selector === selectMoneyAccountPremiumVaultConfig) {
      return premium;
    }

    return undefined;
  });
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
    setSelectors();
    mockUseQuery.mockReturnValue({} as never);
  });

  it.each([
    ['standard', STANDARD_VAULT_CONFIG],
    ['premium', PREMIUM_VAULT_CONFIG],
  ] as const)('uses the %s vault configuration', (vaultType, vaultConfig) => {
    renderHook(() => useMoneyVaultComposition({ vaultType }));

    const queryOptions = getQueryOptions();

    expect(queryOptions.queryKey).toEqual([
      MoneyQueryKeys.FETCH_VAULT_COMPOSITION,
      vaultType,
      vaultConfig.boringVault.toLowerCase(),
      143,
    ]);
    expect(queryOptions.enabled).toBe(true);
  });

  it('sets 15-minute query freshness', () => {
    renderHook(() => useMoneyVaultComposition({ vaultType: 'standard' }));

    expect(getQueryOptions().staleTime).toBe(15 * 60 * 1000);
  });

  it('combines valid configuration with caller enablement', () => {
    renderHook(() =>
      useMoneyVaultComposition({ vaultType: 'standard', enabled: false }),
    );

    expect(getQueryOptions().enabled).toBe(false);
  });

  it('disables the query when configuration is missing', () => {
    setSelectors({ standard: {} });

    renderHook(() => useMoneyVaultComposition({ vaultType: 'standard' }));

    expect(getQueryOptions().enabled).toBe(false);
  });

  it('disables the query when the configured chain ID is not safe', () => {
    setSelectors({
      standard: {
        boringVault: STANDARD_VAULT_CONFIG.boringVault,
        chainId: 'not-a-chain',
      },
    });

    renderHook(() => useMoneyVaultComposition({ vaultType: 'standard' }));

    expect(getQueryOptions().enabled).toBe(false);
  });

  it('delegates query execution to the composition service', async () => {
    mockFetchMoneyVaultComposition.mockResolvedValue(MOCK_RESPONSE);
    renderHook(() => useMoneyVaultComposition({ vaultType: 'premium' }));

    const queryOptions = getQueryOptions();
    const result = await queryOptions.queryFn();

    expect(result).toBe(MOCK_RESPONSE);
    expect(mockFetchMoneyVaultComposition).toHaveBeenCalledWith(
      PREMIUM_VAULT_CONFIG.boringVault.toLowerCase(),
      143,
    );
  });

  it('propagates composition service failures', async () => {
    const error = new Error('composition unavailable');
    mockFetchMoneyVaultComposition.mockRejectedValue(error);
    renderHook(() => useMoneyVaultComposition({ vaultType: 'standard' }));

    await expect(getQueryOptions().queryFn()).rejects.toBe(error);
  });

  it('throws when the query function lacks required configuration', async () => {
    setSelectors({ standard: {} });
    renderHook(() => useMoneyVaultComposition({ vaultType: 'standard' }));

    await expect(getQueryOptions().queryFn()).rejects.toThrow(
      'Cannot fetch Money vault composition without a vault address and valid chain ID',
    );
  });
});
