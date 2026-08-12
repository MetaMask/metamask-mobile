import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import useMoneyVaultApy from './useMoneyVaultApy';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
import { selectMoneyVaultApyRemoteConfig } from '../selectors/featureFlags';
import type { MoneyVaultApyRemoteConfig } from '../selectors/featureFlags.types';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);

interface QueryState {
  data: { apy: number } | undefined;
  isLoading: boolean;
  isError?: boolean;
}

const DEFAULT_REMOTE_APY_CONFIG: MoneyVaultApyRemoteConfig = {
  vaultApyFallback: undefined,
  vaultApyOverride: undefined,
};

const DEFAULT_QUERY: QueryState = {
  data: { apy: 0.05 },
  isLoading: false,
  isError: false,
};

const setup = ({
  remoteApyConfig = DEFAULT_REMOTE_APY_CONFIG,
  query = DEFAULT_QUERY,
}: {
  remoteApyConfig?: MoneyVaultApyRemoteConfig;
  query?: QueryState;
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyVaultApyRemoteConfig) {
      return remoteApyConfig;
    }

    return undefined;
  });
  mockUseQuery.mockReturnValue(query as never);
};

describe('useMoneyVaultApy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('configures the vault APY query with five-minute refetching', () => {
    renderHook(() => useMoneyVaultApy());

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: [MoneyAccountBalanceServiceQueryKeys.GET_VAULT_APY],
      enabled: true,
      refetchInterval: 5 * 60 * 1000,
    });
  });

  it('disables the vault APY query when disabled', () => {
    renderHook(() => useMoneyVaultApy({ enabled: false }));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('returns the service APY in decimal, percent, and formatted forms', () => {
    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0.05);
    expect(result.current.apyPercent).toBe(5);
    expect(result.current.apyPercentFormatted).toBe('5%');
  });

  it('leaves APY values undefined while the query is loading', () => {
    setup({
      query: { data: undefined, isLoading: true, isError: false },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: undefined },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBeUndefined();
    expect(result.current.apyPercent).toBeUndefined();
    expect(result.current.apyPercentFormatted).toBeUndefined();
  });

  it('uses the fallback when the settled query has no service APY', () => {
    setup({
      query: { data: undefined, isLoading: false, isError: false },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: undefined },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0.04);
    expect(result.current.apyPercent).toBe(4);
  });

  it('uses the fallback when the query errors', () => {
    setup({
      query: { data: undefined, isLoading: false, isError: true },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: undefined },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0.04);
    expect(result.current.apyPercentFormatted).toBe('4%');
  });

  it('uses the override over the service APY and fallback', () => {
    setup({
      query: { data: { apy: 0.05 }, isLoading: false, isError: false },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: 0.08 },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0.08);
    expect(result.current.apyPercent).toBe(8);
  });

  it('preserves a configured zero override', () => {
    setup({
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: 0 },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0);
    expect(result.current.apyPercent).toBe(0);
    expect(result.current.apyPercentFormatted).toBe('0%');
  });

  it('preserves a zero service APY instead of using the fallback', () => {
    setup({
      query: { data: { apy: 0 }, isLoading: false, isError: false },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: undefined },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0);
    expect(result.current.apyPercent).toBe(0);
  });

  it('rounds a high-precision APY to one decimal place using half-up rounding', () => {
    setup({
      query: {
        data: { apy: 0.0377356238130822 },
        isLoading: false,
        isError: false,
      },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyPercent).toBe(3.8);
    expect(result.current.apyPercentFormatted).toBe('3.8%');
  });
});
