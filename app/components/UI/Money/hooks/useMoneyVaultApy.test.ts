import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { selectHasMoneyAccountPremiumApyEntitlement } from '../../../../selectors/subscriptionController';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
import { selectMoneyVaultApyRemoteConfig } from '../selectors/featureFlags';
import type { MoneyVaultApyRemoteConfig } from '../selectors/featureFlags.types';
import useMoneyPremiumVaultRate from './useMoneyPremiumVaultRate';
import useMoneyVaultApy from './useMoneyVaultApy';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('./useMoneyPremiumVaultRate', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
const mockUseMoneyPremiumVaultRate = jest.mocked(useMoneyPremiumVaultRate);

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
  isEntitled = false,
  premiumRate = undefined as string | undefined,
  premiumRateLoading = false,
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyVaultApyRemoteConfig) {
      return remoteApyConfig;
    }
    if (selector === selectHasMoneyAccountPremiumApyEntitlement) {
      return isEntitled;
    }
    return undefined;
  });
  mockUseQuery.mockReturnValue(query as never);
  mockUseMoneyPremiumVaultRate.mockReturnValue({
    rate: premiumRate,
    ratePercent: undefined,
    ratePercentFormatted: undefined,
    vaultRateQuery: {
      isLoading: premiumRateLoading,
      isError: false,
      data: premiumRate ? { rate: premiumRate } : undefined,
    },
  } as never);
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

  it('returns the base service APY for a non-subscriber', () => {
    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBe(0.05);
    expect(result.current.apyPercent).toBe(5);
    expect(result.current.apyPercentFormatted).toBe('5%');
    expect(result.current.baseApyDecimal).toBe(0.05);
    expect(result.current.baseApyPercent).toBe(5);
    expect(mockUseMoneyPremiumVaultRate).toHaveBeenCalledWith({
      enabled: false,
    });
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
    expect(result.current.baseApyDecimal).toBeUndefined();
    expect(result.current.isBaseApyLoading).toBe(true);
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

  it('does not report the base APY as loading when an override is already set', () => {
    setup({
      query: { data: undefined, isLoading: true, isError: false },
      remoteApyConfig: { vaultApyFallback: 0.04, vaultApyOverride: 0.08 },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.baseApyDecimal).toBe(0.08);
    expect(result.current.isBaseApyLoading).toBe(false);
  });

  it('reports base APY loading while an entitled user already has a premium rate', () => {
    setup({
      isEntitled: true,
      premiumRate: '0.08',
      query: { data: undefined, isLoading: true, isError: false },
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.vaultApyQuery.isLoading).toBe(false);
    expect(result.current.apyDecimal).toBe(0.08);
    expect(result.current.baseApyDecimal).toBeUndefined();
    expect(result.current.isBaseApyLoading).toBe(true);
  });

  it('returns the premium rate for an entitled user', () => {
    setup({
      isEntitled: true,
      premiumRate: '0.08',
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(mockUseMoneyPremiumVaultRate).toHaveBeenCalledWith({
      enabled: true,
    });
    expect(result.current.apyDecimal).toBe(0.08);
    expect(result.current.apyPercent).toBe(8);
    expect(result.current.apyPercentFormatted).toBe('8%');
    expect(result.current.baseApyDecimal).toBe(0.05);
    expect(result.current.baseApyPercent).toBe(5);
    expect(result.current.vaultApyQuery.isLoading).toBe(false);
  });

  it('keeps APY undefined while the premium rate loads for an entitled user', () => {
    setup({
      isEntitled: true,
      premiumRate: undefined,
      premiumRateLoading: true,
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBeUndefined();
    expect(result.current.apyPercent).toBeUndefined();
    expect(result.current.vaultApyQuery.isLoading).toBe(true);
  });

  it('returns undefined APY when an entitled user has an unparsable premium rate', () => {
    setup({
      isEntitled: true,
      premiumRate: 'not-a-rate',
    });

    const { result } = renderHook(() => useMoneyVaultApy());

    expect(result.current.apyDecimal).toBeUndefined();
    expect(result.current.apyPercent).toBeUndefined();
  });

  it('disables the premium rate query when the hook is disabled for an entitled user', () => {
    setup({ isEntitled: true, premiumRate: '0.08' });

    renderHook(() => useMoneyVaultApy({ enabled: false }));

    expect(mockUseMoneyPremiumVaultRate).toHaveBeenCalledWith({
      enabled: false,
    });
  });
});
