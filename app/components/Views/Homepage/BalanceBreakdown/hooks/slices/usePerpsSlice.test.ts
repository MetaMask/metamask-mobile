import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsLiveAccount } from '../../../../../UI/Perps/hooks';
import { usePerpsConnection } from '../../../../../UI/Perps/hooks/usePerpsConnection';
import { selectPerpsEnabledFlag } from '../../../../../UI/Perps/selectors/featureFlags';
import {
  selectPerpsBalances,
  selectPerpsEligibility,
  selectPerpsProvider,
} from '../../../../../UI/Perps/selectors/perpsController';
import { usePerpsSlice } from './usePerpsSlice';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../UI/Perps/hooks', () => ({
  usePerpsLiveAccount: jest.fn(),
}));
jest.mock('../../../../../UI/Perps/hooks/usePerpsConnection');

const mockUseSelector = jest.mocked(useSelector);
const mockUsePerpsLiveAccount = jest.mocked(usePerpsLiveAccount);
const mockUsePerpsConnection = jest.mocked(usePerpsConnection);

describe('usePerpsSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsEligibility) return true;
      if (selector === selectPerpsProvider) return 'hyperliquid';
      if (selector === selectPerpsBalances) {
        return {
          hyperliquid: { accountValue1dAgo: '80' },
        };
      }
      return undefined;
    });
    mockUsePerpsLiveAccount.mockReturnValue({
      account: { totalBalance: '100' },
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLiveAccount>);
    mockUsePerpsConnection.mockReturnValue({
      error: null,
    } as ReturnType<typeof usePerpsConnection>);
  });

  it('uses account total balance and the active provider baseline', () => {
    const { result } = renderHook(() => usePerpsSlice((amount) => amount * 2));

    expect(result.current).toMatchObject({
      status: 'ready',
      valueFiat: 200,
      value1dAgoFiat: 160,
    });
  });

  it('excludes partial stream totals until completeness metadata recovers', () => {
    const liveAccount = {
      account: {
        spendableBalance: '100',
        withdrawableBalance: '100',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
        totalBalance: '100',
      },
      isInitialLoading: false,
      aggregate: {
        status: 'partial',
        availableProviders: ['hyperliquid'],
        unavailableProviders: ['lighter'],
        pendingProviders: [],
      },
    } satisfies ReturnType<typeof usePerpsLiveAccount>;
    const toUserCurrency = (amount: number) => amount * 2;
    mockUsePerpsLiveAccount.mockReturnValue(liveAccount);

    const { result, rerender } = renderHook(() =>
      usePerpsSlice(toUserCurrency),
    );

    expect(result.current).toMatchObject({
      status: 'partial',
      isVisible: true,
      valueFiat: 0,
      value1dAgoFiat: undefined,
    });

    mockUsePerpsLiveAccount.mockReturnValue({
      ...liveAccount,
      aggregate: {
        status: 'complete',
        availableProviders: ['hyperliquid', 'lighter'],
        unavailableProviders: [],
        pendingProviders: [],
      },
    });

    rerender({});

    expect(result.current).toMatchObject({
      status: 'ready',
      isVisible: true,
      valueFiat: 200,
      value1dAgoFiat: 160,
    });
  });

  it('reports no baseline when an aggregated provider lacks the 1d-ago observation', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsEligibility) return true;
      if (selector === selectPerpsProvider) return 'aggregated';
      if (selector === selectPerpsBalances) {
        return {
          hyperliquid: { accountValue1dAgo: '80' },
          lighter: { totalBalance: '20' },
        };
      }
      return undefined;
    });

    mockUsePerpsLiveAccount.mockReturnValue({
      account: {
        totalBalance: '100',
        providerStates: {
          hyperliquid: { providerId: 'hyperliquid', status: 'available' },
          lighter: { providerId: 'lighter', status: 'available' },
        },
      },
      isInitialLoading: false,
    } as ReturnType<typeof usePerpsLiveAccount>);

    const { result } = renderHook(() => usePerpsSlice((amount) => amount));

    expect(result.current.status).toBe('ready');
    expect(result.current.valueFiat).toBe(100);
    expect(result.current.value1dAgoFiat).toBeUndefined();
  });

  it('reports no baseline when the active provider lacks the 1d-ago observation', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsEligibility) return true;
      if (selector === selectPerpsProvider) return 'hyperliquid';
      if (selector === selectPerpsBalances) {
        return { hyperliquid: { totalBalance: '100' } };
      }
      return undefined;
    });

    const { result } = renderHook(() => usePerpsSlice((amount) => amount));

    expect(result.current.value1dAgoFiat).toBeUndefined();
  });

  it.each<[string, number | undefined]>([
    ['0', 0],
    ['-10', -10],
    ['invalid', undefined],
    ['NaN', undefined],
    ['Infinity', undefined],
  ])('reports the historical baseline %s as %s', (baseline, expected) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsProvider) return 'hyperliquid';
      if (selector === selectPerpsBalances) {
        return { hyperliquid: { accountValue1dAgo: baseline } };
      }
      return undefined;
    });

    const { result } = renderHook(() => usePerpsSlice((amount) => amount));

    expect(result.current.value1dAgoFiat).toBe(expected);
  });

  it('keeps funded balances available when trading is geo-blocked', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      if (selector === selectPerpsEligibility) return false;
      if (selector === selectPerpsProvider) return 'hyperliquid';
      if (selector === selectPerpsBalances) {
        return {
          hyperliquid: { accountValue1dAgo: '80' },
        };
      }
      return undefined;
    });

    const { result } = renderHook(() => usePerpsSlice((amount) => amount));

    expect(mockUsePerpsLiveAccount).toHaveBeenCalledWith({
      enabled: true,
      throttleMs: 1000,
    });
    expect(result.current).toMatchObject({
      status: 'ready',
      isVisible: true,
      valueFiat: 100,
      value1dAgoFiat: 80,
    });
  });

  it('is ineligible when the feature is unavailable', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return false;
      if (selector === selectPerpsEligibility) return true;
      if (selector === selectPerpsBalances) return {};
      return undefined;
    });

    const { result } = renderHook(() => usePerpsSlice((amount) => amount * 2));

    expect(mockUsePerpsLiveAccount).toHaveBeenCalledWith({
      enabled: false,
      throttleMs: 1000,
    });
    expect(result.current.status).toBe('ineligible');
    expect(result.current.isVisible).toBe(false);
    expect(result.current.valueFiat).toBe(0);
  });

  it('reports a connection error when no account data is available', () => {
    mockUsePerpsLiveAccount.mockReturnValue({
      account: null,
      isInitialLoading: true,
    });
    mockUsePerpsConnection.mockReturnValue({
      error: 'Connection failed',
    } as ReturnType<typeof usePerpsConnection>);

    const { result } = renderHook(() => usePerpsSlice((amount) => amount));

    expect(result.current.status).toBe('error');
  });

  it('reports an error when fiat conversion is unavailable', () => {
    const { result } = renderHook(() => usePerpsSlice(() => undefined));

    expect(result.current.status).toBe('error');
    expect(result.current.valueFiat).toBe(0);
  });
});
