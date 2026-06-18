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
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
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
jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));
jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(),
  selectCurrentCurrency: jest.fn(),
}));
jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);
const mockControllerMessengerCall = jest.mocked(
  Engine.controllerMessenger.call,
);

const MOCK_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const MAINNET_CHAIN_ID = '0x1';
const MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

// price is denominated in the native currency (ETH), not USD.
// 0.0005 ETH/mUSD × 2000 USD/ETH = $1.00/mUSD — the correct peg for a
// dollar-backed stablecoin. These values are chosen deliberately so that
// musdFiatRate = 1.0, keeping all downstream fiat arithmetic easy to verify.
const MOCK_TOKEN_MARKET_DATA = {
  [MAINNET_CHAIN_ID]: {
    [MUSD_ADDRESS]: { price: 0.0005 },
  },
};

const MOCK_CURRENCY_RATES = {
  ETH: { conversionRate: 2000 },
};

const MOCK_NETWORK_CONFIGURATIONS = {
  [MAINNET_CHAIN_ID]: { nativeCurrency: 'ETH' },
};

const DEFAULT_REMOTE_APY_CONFIG: MoneyVaultApyRemoteConfig = {
  vaultApyFallback: undefined,
  vaultApyOverride: undefined,
};

function setupDefaultSelectors({
  lastKnownBalance = null,
  remoteApyConfig = DEFAULT_REMOTE_APY_CONFIG,
}: {
  lastKnownBalance?: {
    address: string;
    value: string;
    currency: string;
    updatedAt: number;
  } | null;
  remoteApyConfig?: MoneyVaultApyRemoteConfig;
} = {}) {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPrimaryMoneyAccount) {
      return { address: MOCK_ADDRESS };
    }
    if (selector === selectTokenMarketData) {
      return MOCK_TOKEN_MARKET_DATA;
    }
    if (selector === selectCurrencyRates) {
      return MOCK_CURRENCY_RATES;
    }
    if (selector === selectNetworkConfigurations) {
      return MOCK_NETWORK_CONFIGURATIONS;
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
}> = {
  data: {
    musdBalance: '1000000',
    vmusdValueInMusd: '2000000',
    totalBalance: '3000000',
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
  }> = DEFAULT_MONEY_BALANCE_QUERY,
  vaultApy: QueryState<{ apy: number }> = DEFAULT_VAULT_APY_QUERY,
) {
  mockUseQuery.mockImplementation(((options: { queryKey?: unknown[] }) => {
    if (
      options.queryKey?.[0] ===
      'MoneyAccountBalanceService:getMoneyAccountBalance'
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

  it('returns undefined fiat values when musdFiatRate cannot be computed', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return { address: MOCK_ADDRESS };
      }
      if (selector === selectTokenMarketData) {
        return {};
      }
      if (selector === selectCurrencyRates) {
        return MOCK_CURRENCY_RATES;
      }
      if (selector === selectNetworkConfigurations) {
        return MOCK_NETWORK_CONFIGURATIONS;
      }
      if (selector === selectMoneyVaultApyRemoteConfig) {
        return DEFAULT_REMOTE_APY_CONFIG;
      }
      return undefined;
    });

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.totalFiatFormatted).toBeUndefined();
    expect(result.current.totalFiatRaw).toBeUndefined();
  });

  it('returns $0.00 (not unavailable) when the balance is zero and the rate is missing', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return { address: MOCK_ADDRESS };
      }
      if (selector === selectTokenMarketData) {
        // No price data available → musdFiatRate cannot be computed.
        return {};
      }
      if (selector === selectCurrencyRates) {
        return MOCK_CURRENCY_RATES;
      }
      if (selector === selectNetworkConfigurations) {
        return MOCK_NETWORK_CONFIGURATIONS;
      }
      if (selector === selectCurrentCurrency) {
        return 'usd';
      }
      if (selector === selectMoneyVaultApyRemoteConfig) {
        return DEFAULT_REMOTE_APY_CONFIG;
      }
      return undefined;
    });
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

  it('returns formatted total fiat when all data is available', () => {
    // musdFiatRate = price(0.0005) * conversionRate(2000) = 1.0
    // musd balance 1 * 1.0 = $1.00, vmUSD balance 2 * 1.0 = $2.00, total = $3.00
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.totalFiatFormatted).toBe('$3.00');
  });

  it('disables moneyBalanceQuery when no account address', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPrimaryMoneyAccount) {
        return undefined;
      }
      if (selector === selectTokenMarketData) {
        return MOCK_TOKEN_MARKET_DATA;
      }
      if (selector === selectCurrencyRates) {
        return MOCK_CURRENCY_RATES;
      }
      if (selector === selectNetworkConfigurations) {
        return MOCK_NETWORK_CONFIGURATIONS;
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
        'MoneyAccountBalanceService:getMoneyAccountBalance',
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

    it('refetchBalance invalidates the balance query via ReactQueryService', async () => {
      const { result } = renderHook(() => useMoneyAccountBalance());

      await result.current.refetchBalance();

      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'MoneyAccountBalanceService:getMoneyAccountBalance',
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
});
