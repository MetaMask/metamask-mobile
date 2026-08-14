import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import useMoneyAccountBalance, {
  getLiveVedaVaultExchangeRate,
} from './useMoneyAccountBalance';
import {
  selectLastKnownMoneyBalance,
  setLastKnownMoneyBalance,
} from '../../../../core/redux/slices/moneyBalance';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import Engine from '../../../../core/Engine';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

jest.mock('@metamask/react-data-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn(),
    },
  },
}));

const mockInvalidateQueries = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {
      invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
    },
  },
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
  selectMoneyAccounts: jest.fn(),
}));
jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
const mockControllerMessengerCall = jest.mocked(
  Engine.controllerMessenger.call,
);

const MOCK_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

function setupDefaultSelectors(
  options: {
    lastKnownBalance?: {
      address: string;
      value: string;
      currency: string;
      updatedAt: number;
    } | null;
  } = {},
) {
  const lastKnownBalance = options.lastKnownBalance ?? null;

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPrimaryMoneyAccount) {
      return { address: MOCK_ADDRESS };
    }
    if (selector === selectCurrentCurrency) {
      return 'usd';
    }
    if (selector === selectLastKnownMoneyBalance) {
      return lastKnownBalance;
    }
    return undefined;
  });
}

interface QueryState<T> {
  data: T | undefined;
  isLoading: boolean;
  isError?: boolean;
  isFetching?: boolean;
  refetch?: jest.Mock;
}

const DEFAULT_MONEY_BALANCE_QUERY: QueryState<{
  musdBalance: string;
  vmusdValueInMusd: string;
  totalBalance: string;
  source: 'api' | 'rpc';
  usedFallback: boolean;
}> = {
  data: {
    musdBalance: '1000000',
    vmusdValueInMusd: '2000000',
    totalBalance: '3000000',
    source: 'api',
    usedFallback: false,
  },
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: jest.fn(),
};

function setupDefaultQueries(
  moneyBalance: QueryState<{
    musdBalance: string;
    vmusdValueInMusd: string;
    totalBalance: string;
    source?: 'api' | 'rpc';
    usedFallback?: boolean;
  }> = DEFAULT_MONEY_BALANCE_QUERY,
) {
  mockUseQuery.mockReturnValue(moneyBalance as never);
}

describe('getLiveVedaVaultExchangeRate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls Engine.controllerMessenger.call with MoneyAccountBalanceService:getExchangeRate and staleTime 0', async () => {
    mockControllerMessengerCall.mockResolvedValue({ rate: '1.05' } as never);

    await getLiveVedaVaultExchangeRate();

    expect(mockControllerMessengerCall).toHaveBeenCalledWith(
      'MoneyAccountBalanceService:getExchangeRate',
      { staleTime: 0 },
    );
  });

  it('returns the rate from the service response', async () => {
    mockControllerMessengerCall.mockResolvedValue({ rate: '1.05' } as never);

    const rate = await getLiveVedaVaultExchangeRate();

    expect(rate).toBe('1.05');
  });
});

describe('useMoneyAccountBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultSelectors();
    setupDefaultQueries();
  });

  it('isBalanceLoading is true when moneyBalanceQuery is loading', () => {
    setupDefaultQueries({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.isBalanceLoading).toBe(true);
  });

  it('isBalanceLoading is false when query has completed', () => {
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.isBalanceLoading).toBe(false);
  });

  it('disables the balance query when disabled', () => {
    renderHook(() => useMoneyAccountBalance({ enabled: false }));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('returns undefined tokenTotal when still loading', () => {
    setupDefaultQueries({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.tokenTotal).toBeUndefined();
  });

  it('returns sum of musd and vault token balances as tokenTotal when loaded', () => {
    // musdBalance '1000000' = 1 mUSD (6 decimals), vmusdValueInMusd '2000000' = 2 mUSD
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.tokenTotal?.toFixed(0)).toBe('3');
  });

  it('returns withdrawableMusd as the vmUSD-shares-only mUSD equivalent when loaded', () => {
    // vmusdValueInMusd '2000000' = 2 mUSD (6 decimals) — vmUSD shares only, not including bare mUSD
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.withdrawableMusd?.toFixed(0)).toBe('2');
  });

  it('returns undefined withdrawableMusd while loading', () => {
    setupDefaultQueries({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.withdrawableMusd).toBeUndefined();
  });

  it('returns $0.00 in USD when the balance is zero', () => {
    setupDefaultQueries({
      data: { musdBalance: '0', vmusdValueInMusd: '0', totalBalance: '0' },
      isLoading: false,
      isError: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.totalFiatFormatted).toBe('$0.00');
    expect(result.current.totalFiatRaw).toBe('0');
    expect(result.current.isBalanceUnavailable).toBe(false);
  });

  it('returns formatted total fiat in USD via the peg', () => {
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.totalFiatFormatted).toBe('$3.00');
  });

  it('disables moneyBalanceQuery when no account address', () => {
    setupDefaultSelectors();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return undefined;
      }
      if (selector === selectCurrentCurrency) {
        return 'usd';
      }
      return undefined;
    });

    renderHook(() => useMoneyAccountBalance());

    const balanceCallArgs = mockUseQuery.mock.calls.find(
      ([opts]) =>
        (opts as { queryKey: string[] }).queryKey[0] ===
        'MoneyAccountBalanceService:fetchBalanceWithFallback',
    );
    expect((balanceCallArgs?.[0] as { enabled?: boolean }).enabled).toBe(false);
  });

  it('totalFiatRaw is the string representation of totalFiat', () => {
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.totalFiatRaw).toBe('3');
  });

  it('collapses sub-cent total fiat to $0.00 when both balances are 1 minimal unit', () => {
    setupDefaultQueries({
      data: {
        musdBalance: '1',
        vmusdValueInMusd: '1',
        totalBalance: '2',
      },
      isLoading: false,
      isError: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.totalFiatFormatted).toBe('$0.00');
  });

  describe('error surface', () => {
    it('exposes isBalanceFetchError true when moneyBalanceQuery has errored', () => {
      setupDefaultQueries({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.isBalanceFetchError).toBe(true);
    });

    it('exposes isBalanceFetchError false when no queries have errored', () => {
      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.isBalanceFetchError).toBe(false);
    });

    it('returns undefined totalFiatFormatted on balance fetch error', () => {
      setupDefaultQueries({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.totalFiatFormatted).toBeUndefined();
    });

    it('returns undefined totalFiatRaw on balance fetch error', () => {
      setupDefaultQueries({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.totalFiatRaw).toBeUndefined();
    });

    it('returns undefined tokenTotal on balance fetch error', () => {
      setupDefaultQueries({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.tokenTotal).toBeUndefined();
    });

    it('surfaces the balance query object so callers can read isFetching directly', () => {
      setupDefaultQueries({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: true,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.moneyBalanceQuery.isFetching).toBe(true);
    });

    it('refetchBalance invalidates source service caches then the UI facade', async () => {
      mockControllerMessengerCall.mockResolvedValue(undefined as never);

      const { result } = renderHook(() => useMoneyAccountBalance());

      await result.current.refetchBalance();

      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'MoneyAccountBalanceService:invalidateQueries',
        {
          queryKey: [
            'MoneyAccountBalanceService:getMoneyAccountBalance',
            MOCK_ADDRESS,
          ],
        },
      );
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'MoneyAccountApiDataService:invalidateQueries',
        {
          queryKey: [
            'MoneyAccountApiDataService:fetchPositions',
            MOCK_ADDRESS.toLowerCase(),
          ],
        },
      );
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'MoneyAccountBalanceService:fetchBalanceWithFallback',
          MOCK_ADDRESS,
        ],
        refetchType: 'all',
      });
    });

    it('refetchBalance is a no-op when no primary Money Account exists', async () => {
      setupDefaultSelectors();
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPrimaryMoneyAccount) {
          return undefined;
        }
        if (selector === selectCurrentCurrency) {
          return 'usd';
        }
        return undefined;
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      await expect(result.current.refetchBalance()).resolves.toBeUndefined();

      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('last known balance', () => {
    const persistedBalance = {
      address: MOCK_ADDRESS,
      value: '$2,384.34',
      currency: 'usd',
      updatedAt: 1,
    };

    it('isBalanceUnavailable is false on a successful fetch', () => {
      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.isBalanceUnavailable).toBe(false);
    });

    it('isBalanceUnavailable is true on a balance fetch error', () => {
      setupDefaultQueries({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.isBalanceUnavailable).toBe(true);
    });

    it('persists the balance on a successful fetch', () => {
      renderHook(() => useMoneyAccountBalance());

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: setLastKnownMoneyBalance.type,
          payload: expect.objectContaining({
            address: MOCK_ADDRESS,
            currency: 'usd',
          }),
        }),
      );
    });

    it('does not persist the balance on a fetch error', () => {
      setupDefaultQueries({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: false,
      });

      renderHook(() => useMoneyAccountBalance());

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('exposes the persisted balance when it matches the account and currency', () => {
      setupDefaultSelectors({ lastKnownBalance: persistedBalance });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.lastKnownTotalFiatFormatted).toBe('$2,384.34');
    });

    it('ignores a persisted balance from a different currency', () => {
      setupDefaultSelectors({
        lastKnownBalance: { ...persistedBalance, currency: 'eur' },
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.lastKnownTotalFiatFormatted).toBeUndefined();
    });

    it('ignores a persisted balance from a different account', () => {
      setupDefaultSelectors({
        lastKnownBalance: { ...persistedBalance, address: '0xother' },
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.lastKnownTotalFiatFormatted).toBeUndefined();
    });
  });

  describe('balance provenance', () => {
    it('exposes balanceSource and usedFallback from the canonical response', () => {
      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.balanceSource).toBe('api');
      expect(result.current.usedFallback).toBe(false);
      expect(result.current.isBalanceDegraded).toBe(false);
    });

    it('marks the balance as degraded when usedFallback is true', () => {
      setupDefaultQueries({
        data: {
          musdBalance: '1000000',
          vmusdValueInMusd: '2000000',
          totalBalance: '3000000',
          source: 'rpc',
          usedFallback: true,
        },
        isLoading: false,
        isError: false,
        isFetching: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.balanceSource).toBe('rpc');
      expect(result.current.usedFallback).toBe(true);
      expect(result.current.isBalanceDegraded).toBe(true);
    });
  });
});
