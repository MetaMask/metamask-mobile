import { renderHook, waitFor } from '@testing-library/react-native';
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
import Engine from '../../../../core/Engine';
import { usePerpsChartData } from './usePerpsChartData';

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

jest.mock('../../../../core/Engine', () => ({
  context: {
    SwapsController: {
      fetchTokenWithCache: jest.fn(),
    },
  },
}));

jest.mock('../../Bridge/utils/exchange-rates', () => ({
  getTokenExchangeRate: jest.fn().mockResolvedValue(undefined),
}));

const mockPerpsChartDataDefault = {
  hasPerpsMarket: false,
  isMarketLoading: false,
  prices: [] as [string, number][],
  isLoading: false,
  currentPrice: 0,
  priceDiff: 0,
  comparePrice: 0,
  isRealtime: false,
  error: null,
};

jest.mock('./usePerpsChartData', () => ({
  usePerpsChartData: jest.fn(() => mockPerpsChartDataDefault),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockIsAssetFromSearch = jest.mocked(isAssetFromSearch);
const mockUseTokenHistoricalPrices = jest.mocked(useTokenHistoricalPrices);
const mockUsePerpsChartData = jest.mocked(usePerpsChartData);

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
    });
    mockUsePerpsChartData.mockReturnValue({
      hasPerpsMarket: false,
      isMarketLoading: false,
      prices: [],
      isLoading: false,
      currentPrice: 0,
      priceDiff: 0,
      comparePrice: 0,
      isRealtime: false,
      error: null,
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

  it('calls SwapsController.fetchTokenWithCache on mount', async () => {
    const token = {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      chainId: '0x1',
    } as TokenI;

    renderHook(() => useTokenPrice({ token }));

    await waitFor(() => {
      expect(
        Engine.context.SwapsController.fetchTokenWithCache,
      ).toHaveBeenCalledWith({
        networkClientId: 'mainnet',
      });
    });
  });

  describe('perps integration', () => {
    it('returns isRealtime false and hasPerpsMarket false when no perps market exists', async () => {
      const token = {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        chainId: '0x1',
        symbol: 'DAI',
      } as TokenI;

      mockUsePerpsChartData.mockReturnValue({
        hasPerpsMarket: false,
        isMarketLoading: false,
        prices: [],
        isLoading: false,
        currentPrice: 0,
        priceDiff: 0,
        comparePrice: 0,
        isRealtime: false,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrice({ token }));

      await waitFor(() => {
        expect(result.current.isRealtime).toBe(false);
        expect(result.current.hasPerpsMarket).toBe(false);
      });
    });

    it('uses perps data when perps market exists and has data', async () => {
      const token = {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
        symbol: 'ETH',
      } as TokenI;

      const perpsPrices: [string, number][] = [
        ['1700000000000', 1800],
        ['1700001000000', 1850],
        ['1700002000000', 1900],
      ];

      mockUsePerpsChartData.mockReturnValue({
        hasPerpsMarket: true,
        isMarketLoading: false,
        prices: perpsPrices,
        isLoading: false,
        currentPrice: 1900,
        priceDiff: 100,
        comparePrice: 1800,
        isRealtime: true,
        error: null,
      });

      const { result } = renderHook(() => useTokenPrice({ token }));

      await waitFor(() => {
        expect(result.current.hasPerpsMarket).toBe(true);
        expect(result.current.isRealtime).toBe(true);
        expect(result.current.currentPrice).toBe(1900);
        expect(result.current.priceDiff).toBe(100);
        expect(result.current.comparePrice).toBe(1800);
        expect(result.current.prices).toEqual(perpsPrices);
      });
    });

    it('falls back to API data when perps market exists but has no data', async () => {
      const token = {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
        symbol: 'ETH',
      } as TokenI;

      mockUsePerpsChartData.mockReturnValue({
        hasPerpsMarket: true,
        isMarketLoading: false,
        prices: [], // No perps data
        isLoading: false,
        currentPrice: 0,
        priceDiff: 0,
        comparePrice: 0,
        isRealtime: false,
        error: null,
      });

      const apiPrices: [string, number][] = [
        ['1700000000', 1750],
        ['1700001000', 1800],
      ];

      mockUseTokenHistoricalPrices.mockReturnValue({
        data: apiPrices,
        isLoading: false,
        error: undefined,
      });

      setupDefaultMocks({
        tokenMarketData: {
          '0x1': {
            '0x0000000000000000000000000000000000000000': { price: 0.9 },
          },
        },
      });

      const { result } = renderHook(() => useTokenPrice({ token }));

      await waitFor(() => {
        expect(result.current.hasPerpsMarket).toBe(true);
        expect(result.current.isRealtime).toBe(false);
        expect(result.current.prices).toEqual(apiPrices);
      });
    });

    it('passes token symbol and timePeriod to usePerpsChartData', async () => {
      const token = {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1',
        symbol: 'BTC',
      } as TokenI;

      renderHook(() => useTokenPrice({ token }));

      await waitFor(() => {
        expect(mockUsePerpsChartData).toHaveBeenCalledWith({
          symbol: 'BTC',
          timePeriod: '1d', // default time period
        });
      });
    });
  });
});
