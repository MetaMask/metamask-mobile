import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokenPrice } from './useTokenPrice';
import { TokenI } from '../../Tokens/types';
import { selectSelectedNetworkClientId } from '../../../../selectors/networkController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../selectors/currencyRateController';
import { isAssetFromSearch } from '../../../../selectors/tokenSearchDiscoveryDataController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import useTokenHistoricalPrices from '../../../hooks/useTokenHistoricalPrices';
import { getTokenExchangeRate } from '../../Bridge/utils/exchange-rates';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectNativeCurrencyByChainId: jest.fn(),
  selectSelectedNetworkClientId: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(),
  selectCurrencyRates: jest.fn(),
}));

jest.mock('../../../../selectors/tokenSearchDiscoveryDataController', () => ({
  isAssetFromSearch: jest.fn(),
  selectTokenDisplayData: jest.fn(),
}));

jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));

jest.mock('../../../hooks/useTokenHistoricalPrices', () => jest.fn());

jest.mock('../../Bridge/utils/exchange-rates', () => ({
  getTokenExchangeRate: jest.fn().mockResolvedValue(undefined),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockIsAssetFromSearch = jest.mocked(isAssetFromSearch);
const mockUseTokenHistoricalPrices = jest.mocked(useTokenHistoricalPrices);
const mockGetTokenExchangeRate = jest.mocked(getTokenExchangeRate);

describe('useTokenPrice', () => {
  const defaultCurrencyRates = {
    ETH: { conversionRate: 2000, conversionDate: Date.now() },
  };

  const setupDefaultMocks = (overrides?: {
    tokenMarketData?: Record<string, Record<string, { price: number }>>;
    currencyRates?: typeof defaultCurrencyRates;
    tokenDisplayData?: { found: boolean; price?: { price: number } };
  }) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectCurrencyRates) {
        return overrides?.currencyRates ?? defaultCurrencyRates;
      }
      if (selector === selectCurrentCurrency) {
        return 'usd';
      }
      if (selector === selectTokenMarketData) {
        return overrides?.tokenMarketData ?? {};
      }
      if (selector === selectSelectedNetworkClientId) {
        return 'mainnet';
      }
      if (typeof selector === 'function') {
        if (overrides?.tokenDisplayData) {
          return overrides.tokenDisplayData;
        }
        return 'ETH';
      }
      return undefined;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockIsAssetFromSearch.mockReturnValue(false);
    mockUseTokenHistoricalPrices.mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
      hasInsufficientCoverage: false,
    });
    setupDefaultMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns loading state from historical prices hook', async () => {
    const token = {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      chainId: '0x1',
    } as TokenI;

    mockUseTokenHistoricalPrices.mockReturnValue({
      isLoading: true,
      data: undefined,
      error: undefined,
      hasInsufficientCoverage: false,
    });

    const { result } = renderHook(() => useTokenPrice({ token }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });
    expect(result.current.prices).toEqual([]);
  });

  it('returns price data for EVM token with market data rate', async () => {
    const token = {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      chainId: '0x1',
      symbol: 'DAI',
    } as TokenI;

    setupDefaultMocks({
      tokenMarketData: {
        '0x1': {
          '0x6B175474E89094C44Da98b954EedeAC495271d0F': { price: 0.0005 },
        },
      },
    });

    mockUseTokenHistoricalPrices.mockReturnValue({
      data: [
        ['1700000000', 0.99],
        ['1700001000', 1.0],
      ],
      isLoading: false,
      error: undefined,
      hasInsufficientCoverage: false,
    });

    const { result } = renderHook(() => useTokenPrice({ token }));

    await waitFor(() => {
      expect(result.current.currentPrice).toBe(1);
    });
    expect(result.current.comparePrice).toBe(0.99);
    expect(result.current.currentCurrency).toBe('usd');
    expect(result.current.chartNavigationButtons).toEqual([
      '1d',
      '1w',
      '1m',
      '3m',
      '1y',
      '3y',
    ]);
  });

  it('returns price from search result when token is from search', async () => {
    const token = {
      address: '0xabc123',
      chainId: '0x1',
      isFromSearch: true,
    } as unknown as TokenI;

    mockIsAssetFromSearch.mockReturnValue(true);

    setupDefaultMocks({
      tokenDisplayData: { found: true, price: { price: 123.45 } },
    });

    const { result } = renderHook(() => useTokenPrice({ token }));

    await waitFor(() => {
      expect(result.current.currentPrice).toBe(123.45);
    });
  });

  it('returns different chart navigation buttons for non-EVM tokens', async () => {
    const token = {
      address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:abc123',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    } as TokenI;

    const { result } = renderHook(() => useTokenPrice({ token }));

    await waitFor(() => {
      expect(result.current.chartNavigationButtons).toEqual([
        '1d',
        '1w',
        '1m',
        '3m',
        '1y',
        'all',
      ]);
    });
  });

  it('uses multichain asset rates for non-EVM tokens', async () => {
    const token = {
      address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:abc123',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    } as TokenI;

    const multichainAssetRates = {
      rate: 150.5,
      marketData: undefined,
    };

    mockUseTokenHistoricalPrices.mockReturnValue({
      data: [['1700000000', 145.0]],
      isLoading: false,
      error: undefined,
      hasInsufficientCoverage: false,
    });

    const { result } = renderHook(() =>
      useTokenPrice({ token, multichainAssetRates }),
    );

    await waitFor(() => {
      expect(result.current.currentPrice).toBe(150.5);
    });
    expect(result.current.comparePrice).toBe(145.0);
    expect(result.current.priceDiff).toBe(5.5);
  });

  it('forwards hasInsufficientCoverage from the historical prices hook', async () => {
    const token = {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      chainId: '0x1',
    } as TokenI;

    mockUseTokenHistoricalPrices.mockReturnValue({
      data: [['1700000000', 1.0]],
      isLoading: false,
      error: undefined,
      hasInsufficientCoverage: true,
    });

    const { result } = renderHook(() => useTokenPrice({ token }));

    await waitFor(() => {
      expect(result.current.hasInsufficientCoverage).toBe(true);
    });
  });

  it('clears stale fetchedMarketData when token changes', async () => {
    const tokenA = {
      address: '0xaaaa',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    } as TokenI;
    const tokenB = {
      address: '0xbbbb',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    } as TokenI;

    setupDefaultMocks();
    mockUseTokenHistoricalPrices.mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
      hasInsufficientCoverage: false,
    });

    let resolveA!: (v: unknown) => void;
    let resolveB!: (v: unknown) => void;

    mockGetTokenExchangeRate
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolveA = r as (v: unknown) => void;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolveB = r as (v: unknown) => void;
          }),
      );

    const { rerender, result } = renderHook(
      ({ token }: { token: TokenI }) => useTokenPrice({ token }),
      { initialProps: { token: tokenA } },
    );

    rerender({ token: tokenB });

    await act(async () => {
      resolveA({ price: 999, pricePercentChange1d: 50 });
    });

    expect(result.current.currentPrice).toBe(0);

    await act(async () => {
      resolveB({ price: 42, pricePercentChange1d: 5 });
    });

    await waitFor(() => {
      expect(result.current.currentPrice).toBe(42);
    });
  });
});
