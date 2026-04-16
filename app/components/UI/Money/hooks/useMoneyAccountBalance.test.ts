import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useQueries } from '@tanstack/react-query';
import useMoneyAccountBalance, {
  getLiveVedaVaultExchangeRate,
} from './useMoneyAccountBalance';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectCurrencyRates } from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import Engine from '../../../../core/Engine';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueries: jest.fn(),
}));

jest.mock('../../SimulationDetails/FiatDisplay/useFiatFormatter', () => ({
  __esModule: true,
  default: () => (val: { toFixed: (n: number) => string }) =>
    `$${val.toFixed(2)}`,
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn(),
    },
  },
}));

// Selector modules are only used as identity references in the useSelector mock;
// they don't need to be individually mocked.
jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));
jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));
jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(),
}));
jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQueries = jest.mocked(useQueries);
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

function setupDefaultSelectors() {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectSelectedInternalAccountByScope) {
      return () => ({ address: MOCK_ADDRESS });
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
    return undefined;
  });
}

interface QueryState<T> {
  data: T | undefined;
  isLoading: boolean;
}

const DEFAULT_MUSD_BALANCE_QUERY: QueryState<{ balance: string }> = {
  data: { balance: '1000000' },
  isLoading: false,
};
const DEFAULT_VAULT_APY_QUERY: QueryState<{ apy: number }> = {
  data: { apy: 5.5 },
  isLoading: false,
};
const DEFAULT_MUSD_EQUIVALENT_BALANCE_QUERY: QueryState<{
  musdEquivalentValue: string;
}> = {
  data: { musdEquivalentValue: '2000000' },
  isLoading: false,
};

function makeQueryResults({
  musdBalance = DEFAULT_MUSD_BALANCE_QUERY,
  vaultApy = DEFAULT_VAULT_APY_QUERY,
  musdEquivalentBalance = DEFAULT_MUSD_EQUIVALENT_BALANCE_QUERY,
}: {
  musdBalance?: QueryState<{ balance: string }>;
  vaultApy?: QueryState<{ apy: number }>;
  musdEquivalentBalance?: QueryState<{ musdEquivalentValue: string }>;
} = {}) {
  return [musdBalance, vaultApy, musdEquivalentBalance] as ReturnType<
    typeof useQueries
  >;
}

function setupDefaultQueries() {
  mockUseQueries.mockReturnValue(makeQueryResults());
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

  it('isAggregatedBalanceLoading is true when musdBalanceQuery is loading', () => {
    mockUseQueries.mockReturnValue(
      makeQueryResults({
        musdBalance: { data: undefined, isLoading: true },
      }),
    );

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.isAggregatedBalanceLoading).toBe(true);
  });

  it('isAggregatedBalanceLoading is true when musdEquivalentBalanceQuery is loading', () => {
    mockUseQueries.mockReturnValue(
      makeQueryResults({
        musdBalance: { data: { balance: '0' }, isLoading: false },
        musdEquivalentBalance: { data: undefined, isLoading: true },
      }),
    );

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.isAggregatedBalanceLoading).toBe(true);
  });

  it('isAggregatedBalanceLoading is false when both queries have completed', () => {
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.isAggregatedBalanceLoading).toBe(false);
  });

  it('returns undefined tokenTotal when still loading', () => {
    mockUseQueries.mockReturnValue(
      makeQueryResults({
        musdBalance: { data: undefined, isLoading: true },
        vaultApy: { data: undefined, isLoading: false },
        musdEquivalentBalance: { data: undefined, isLoading: true },
      }),
    );

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.tokenTotal).toBeUndefined();
  });

  it('returns sum of musd and vault token balances as tokenTotal when loaded', () => {
    // balance '1000000' = 1 mUSD (6 decimals), musdEquivalentValue '2000000' = 2 mUSD
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.tokenTotal?.toFixed(0)).toBe('3');
  });

  it('returns undefined fiat values when musdFiatRate cannot be computed', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountByScope) {
        return () => ({ address: MOCK_ADDRESS });
      }
      if (selector === selectTokenMarketData) {
        // No price data available
        return {};
      }
      if (selector === selectCurrencyRates) {
        return MOCK_CURRENCY_RATES;
      }
      if (selector === selectNetworkConfigurations) {
        return MOCK_NETWORK_CONFIGURATIONS;
      }
      return undefined;
    });

    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.totalFiatFormatted).toBeUndefined();
    expect(result.current.musdFiatFormatted).toBeUndefined();
    expect(result.current.musdSHFvdFiatFormatted).toBeUndefined();
    expect(result.current.totalFiatRaw).toBeUndefined();
  });

  it('returns formatted total fiat when all data is available', () => {
    // musdFiatRate = price(0.0005) * conversionRate(2000) = 1.0
    // musd balance 1 * 1.0 = $1.00, musdSHFvd balance 2 * 1.0 = $2.00, total = $3.00
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.totalFiatFormatted).toBe('$3.00');
    expect(result.current.musdFiatFormatted).toBe('$1.00');
    expect(result.current.musdSHFvdFiatFormatted).toBe('$2.00');
  });

  it('disables musdBalanceQuery and GET_MUSD_EQUIVALENT_VALUE query when no account address', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountByScope) {
        return () => undefined;
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
      return undefined;
    });

    renderHook(() => useMoneyAccountBalance());

    const queriesArg = mockUseQueries.mock.calls[0][0] as {
      queries: { enabled?: boolean }[];
    };
    expect(queriesArg.queries[0].enabled).toBe(false);
    expect(queriesArg.queries[2].enabled).toBe(false);
  });

  it('totalFiatRaw is the string representation of totalFiat', () => {
    const { result } = renderHook(() => useMoneyAccountBalance());

    expect(result.current.totalFiatRaw).toBe('3');
  });
});
