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
import { selectMoneyVaultApyRemoteConfig } from '../selectors/featureFlags';
import type { MoneyVaultApyRemoteConfig } from '../selectors/featureFlags.types';

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

const DEFAULT_REMOTE_APY_CONFIG: MoneyVaultApyRemoteConfig = {
  vaultApyFallback: undefined,
  vaultApyOverride: undefined,
};

function setupDefaultSelectors(
  options: {
    lastKnownBalance?: {
      address: string;
      value: string;
      currency: string;
      updatedAt: number;
    } | null;
    remoteApyConfig?: MoneyVaultApyRemoteConfig;
  } = {},
) {
  const lastKnownBalance = options.lastKnownBalance ?? null;
  const remoteApyConfig = options.remoteApyConfig ?? DEFAULT_REMOTE_APY_CONFIG;

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
    if (selector === selectMoneyVaultApyRemoteConfig) {
      return remoteApyConfig;
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

const DEFAULT_VAULT_APY_QUERY: QueryState<{ apy: number }> = {
  data: { apy: 0.05 },
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
  vaultApy: QueryState<{ apy: number }> = DEFAULT_VAULT_APY_QUERY,
) {
  mockUseQuery.mockImplementation(((options: { queryKey?: unknown[] }) => {
    if (
      options.queryKey?.[0] ===
      'MoneyAccountBalanceService:fetchBalanceWithFallback'
    ) {
      return moneyBalance;
    }
    return vaultApy;
  }) as unknown as typeof useQuery);
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
      if (selector === selectMoneyVaultApyRemoteConfig) {
        return DEFAULT_REMOTE_APY_CONFIG;
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

  it('returns apyDecimal as the raw vault APY value from the API', () => {
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.apyDecimal).toBe(0.05);
  });

  it('returns apyPercent as the vault APY multiplied by 100', () => {
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.apyPercent).toBe(5);
  });

  it('returns apyPercentFormatted as a display-ready percentage string', () => {
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.apyPercentFormatted).toBe('5%');
  });

  it('rounds apyPercent half up to one decimal place for high-precision APY', () => {
    const apyDecimal = 0.0377356238130822;

    setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
      data: { apy: apyDecimal },
      isLoading: false,
      isError: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.apyDecimal).toBe(apyDecimal);
    expect(result.current.apyPercent).toBe(3.8);
    expect(result.current.apyPercentFormatted).toBe('3.8%');
  });

  it('rounds apyPercent down to one decimal place for a high-precision APY', () => {
    const apyDecimal = 0.03341;

    setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
      data: { apy: apyDecimal },
      isLoading: false,
      isError: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.apyDecimal).toBe(apyDecimal);
    expect(result.current.apyPercent).toBe(3.3);
    expect(result.current.apyPercentFormatted).toBe('3.3%');
  });

  it('returns undefined for all APY fields when vault APY data is not available and no fallback configured', () => {
    setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: false,
    });

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.apyDecimal).toBeUndefined();
    expect(result.current.apyPercent).toBeUndefined();
    expect(result.current.apyPercentFormatted).toBeUndefined();
  });

  describe('effective APY precedence', () => {
    it('uses serviceApy when no override and service returns a value', () => {
      setupDefaultSelectors();
      setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
        data: { apy: 0.05 },
        isLoading: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.apyDecimal).toBe(0.05);
      expect(result.current.apyPercent).toBe(5);
      expect(result.current.apyPercentFormatted).toBe('5%');
    });

    it('uses vaultApyFallback when service returns undefined and fallback is configured', () => {
      setupDefaultSelectors({
        remoteApyConfig: {
          vaultApyFallback: 0.04,
          vaultApyOverride: undefined,
        },
      });
      setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
        data: undefined,
        isLoading: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.apyDecimal).toBe(0.04);
      expect(result.current.apyPercent).toBe(4);
      expect(result.current.apyPercentFormatted).toBe('4%');
    });

    it('does not use vaultApyFallback while vault APY query is loading', () => {
      setupDefaultSelectors({
        remoteApyConfig: {
          vaultApyFallback: 0.04,
          vaultApyOverride: undefined,
        },
      });
      setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.apyDecimal).toBeUndefined();
      expect(result.current.apyPercent).toBeUndefined();
      expect(result.current.apyPercentFormatted).toBeUndefined();
    });

    it('uses vaultApyFallback when vault APY query errors and fallback is configured', () => {
      setupDefaultSelectors({
        remoteApyConfig: {
          vaultApyFallback: 0.04,
          vaultApyOverride: undefined,
        },
      });
      setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
        data: undefined,
        isLoading: false,
        isError: true,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.apyDecimal).toBe(0.04);
      expect(result.current.apyPercent).toBe(4);
      expect(result.current.apyPercentFormatted).toBe('4%');
    });

    it('uses vaultApyOverride when query errors and override is configured', () => {
      setupDefaultSelectors({
        remoteApyConfig: {
          vaultApyFallback: 0.04,
          vaultApyOverride: 0.08,
        },
      });
      setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
        data: undefined,
        isLoading: false,
        isError: true,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.apyDecimal).toBe(0.08);
      expect(result.current.apyPercent).toBe(8);
      expect(result.current.apyPercentFormatted).toBe('8%');
    });

    it('returns undefined APY when service is undefined and vaultApyFallback is unconfigured', () => {
      setupDefaultSelectors({
        remoteApyConfig: {
          vaultApyFallback: undefined,
          vaultApyOverride: undefined,
        },
      });
      setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
        data: undefined,
        isLoading: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.apyDecimal).toBeUndefined();
      expect(result.current.apyPercent).toBeUndefined();
      expect(result.current.apyPercentFormatted).toBeUndefined();
    });

    it('uses vaultApyOverride instead of serviceApy when override is set', () => {
      setupDefaultSelectors({
        remoteApyConfig: { vaultApyFallback: 0, vaultApyOverride: 0.08 },
      });
      setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
        data: { apy: 0.05 },
        isLoading: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.apyDecimal).toBe(0.08);
      expect(result.current.apyPercent).toBe(8);
      expect(result.current.apyPercentFormatted).toBe('8%');
    });

    it('uses vaultApyOverride 0 even when serviceApy has a valid value', () => {
      setupDefaultSelectors({
        remoteApyConfig: { vaultApyFallback: 0, vaultApyOverride: 0 },
      });
      setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
        data: { apy: 0.05 },
        isLoading: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.apyDecimal).toBe(0);
      expect(result.current.apyPercent).toBe(0);
      expect(result.current.apyPercentFormatted).toBe('0%');
    });

    it('shows real 0% from service when serviceApy is 0 and override is undefined', () => {
      setupDefaultSelectors({
        remoteApyConfig: {
          vaultApyFallback: 0.04,
          vaultApyOverride: undefined,
        },
      });
      setupDefaultQueries(DEFAULT_MONEY_BALANCE_QUERY, {
        data: { apy: 0 },
        isLoading: false,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.apyDecimal).toBe(0);
      expect(result.current.apyPercent).toBe(0);
      expect(result.current.apyPercentFormatted).toBe('0%');
    });
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

    it('exposes isBalanceFetching true when balance query is fetching', () => {
      setupDefaultQueries({
        data: undefined,
        isLoading: false,
        isError: true,
        isFetching: true,
      });

      const { result } = renderHook(() => useMoneyAccountBalance());

      expect(result.current.isBalanceFetching).toBe(true);
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
