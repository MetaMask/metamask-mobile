import { MarketDataDetails } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import React from 'react';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import {
  selectEvmTicker,
  selectProviderConfig,
} from '../../../../selectors/networkController';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import { backgroundState } from '../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TokenDetails from './';
// eslint-disable-next-line import/no-namespace
import * as reactRedux from 'react-redux';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { handleFetch } from '@metamask/controller-utils';

jest.mock('../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: jest.fn(),
  context: {
    TokensController: {},
  },
}));

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../Earn/selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn(() => false),
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
  settings: {
    primaryCurrency: 'usd',
    hideZeroBalanceTokens: true,
  },
};

const mockDAI = {
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  aggregators: ['Metamask', 'Coinmarketcap'],
  balanceFiat: '$6.49',
  balance: '649',
  logo: 'logo-src',
  decimals: 18,
  image:
    'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  name: 'Dai Stablecoin',
  symbol: 'DAI',
  isETH: false,
  hasBalanceError: false,
  chainId: '0x1',
};
const mockAssets = {
  '0x6b175474e89094c44da98b954eedeac495271d0f': mockDAI,
};
const mockExchangeRate = 2712.15;
const mockCurrentCurrency = 'usd';
const mockContractExchangeRates = {
  '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
    allTimeHigh: 0.00045049491236145674,
    allTimeLow: 0.00032567089582484455,
    circulatingSupply: 5210102796.32321,
    currency: 'ETH',
    dilutedMarketCap: 1923097.9291743594,
    high1d: 0.0003703658992610993,
    id: 'dai',
    low1d: 0.00036798603064620616,
    marketCap: 1923097.9291743594,
    marketCapPercentChange1d: -0.03026,
    price: 0.00036902069191213795,
    priceChange1d: 0.00134711,
    pricePercentChange14d: -0.01961306580879152,
    pricePercentChange1d: 0.13497913251736524,
    pricePercentChange1h: -0.15571963819527113,
    pricePercentChange1y: -0.01608509228365429,
    pricePercentChange200d: -0.0287692372426721,
    pricePercentChange30d: -0.08401729203937018,
    pricePercentChange7d: 0.019578202262256407,
    tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    totalVolume: 54440.464606773865,
  },
};

const mockTokenMarketDataByChainId: Record<
  Hex,
  Record<string, MarketDataDetails>
> = {
  '0x1': {
    '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
      allTimeHigh: 0.00045049491236145674,
      allTimeLow: 0.00032567089582484455,
      circulatingSupply: 5210102796.32321,
      currency: 'ETH',
      dilutedMarketCap: 1923097.9291743594,
      high1d: 0.0003703658992610993,
      low1d: 0.00036798603064620616,
      marketCap: 1923097.9291743594,
      marketCapPercentChange1d: -0.03026,
      price: 0.00036902069191213795,
      priceChange1d: 0.00134711,
      pricePercentChange14d: -0.01961306580879152,
      pricePercentChange1d: 0.13497913251736524,
      pricePercentChange1h: -0.15571963819527113,
      pricePercentChange1y: -0.01608509228365429,
      pricePercentChange200d: -0.0287692372426721,
      pricePercentChange30d: -0.08401729203937018,
      pricePercentChange7d: 0.019578202262256407,
      tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      totalVolume: 54440.464606773865,
    },
  },
};

describe('TokenDetails', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  const mockSelectors = () => {
    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockImplementation((selectorOrCallback) => {
      const SELECTOR_MOCKS = {
        selectIsEvmNetworkSelected: true,
        selectEvmTokenMarketData: {
          marketData:
            mockTokenMarketDataByChainId['0x1'][
              '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            ],
          metadata: {
            decimals: 18,
            conversionRate: 2712.15,
            aggregators: ['Metamask', 'Coinmarketcap'],
          },
        },
        selectTokenMarketDataByChainId: {},
        selectConversionRateBySymbol: mockExchangeRate,
        selectNativeCurrencyByChainId: 'ETH',
        selectMultichainAssetsRates: {},
      } as const;

      if (typeof selectorOrCallback === 'function') {
        const selectorString = selectorOrCallback.toString();
        const matchedSelector = Object.keys(SELECTOR_MOCKS).find((key) =>
          selectorString.includes(key),
        );
        if (matchedSelector) {
          return SELECTOR_MOCKS[matchedSelector as keyof typeof SELECTOR_MOCKS];
        }
      }

      switch (selectorOrCallback) {
        case selectTokenList:
          return mockAssets;
        case selectContractExchangeRates:
          return {};
        case selectConversionRate:
          return mockExchangeRate;
        case selectCurrentCurrency:
          return mockCurrentCurrency;
        case selectProviderConfig:
          return { ticker: 'ETH' };
        case selectEvmTicker:
          return 'ETH';
        case selectMultichainAssetsRates:
          return {};
        case selectIsEvmNetworkSelected:
          return true;
        default:
          return undefined;
      }
    });
  };

  it('should render correctly', () => {
    mockSelectors();

    const { toJSON, getByText } = renderWithProvider(
      <TokenDetails asset={mockDAI} />,
      {
        state: initialState,
      },
    );

    expect(getByText('Token details')).toBeDefined();
    expect(getByText('Contract address')).toBeDefined();
    expect(getByText('0x6B175...71d0F')).toBeDefined();
    expect(getByText('Token decimal')).toBeDefined();
    expect(getByText('18')).toBeDefined();
    expect(getByText('Token list')).toBeDefined();
    expect(getByText('Metamask, Coinmarketcap')).toBeDefined();
    expect(getByText('Market details')).toBeDefined();
    expect(getByText('Market Cap')).toBeDefined();
    expect(getByText('Total Volume (24h)')).toBeDefined();
    expect(getByText('$147.65M')).toBeDefined();
    expect(getByText('Volume / Market Cap')).toBeDefined();
    expect(getByText('2.83%')).toBeDefined();
    expect(getByText('Circulating supply')).toBeDefined();
    expect(getByText('5.21B')).toBeDefined();
    expect(getByText('All time high')).toBeDefined();
    expect(getByText('$1.22')).toBeDefined();
    expect(getByText('All time low')).toBeDefined();
    expect(getByText('$0.88')).toBeDefined();
    expect(getByText('2.83%')).toBeDefined();
    expect(getByText('Fully diluted')).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render Token Details without Market Details when marketData is null', () => {
    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    const SELECTOR_MOCKS = {
      selectTokenMarketDataByChainId: {},
      selectConversionRateBySymbol: mockExchangeRate,
      selectNativeCurrencyByChainId: 'ETH',
      selectMultichainAssetsRates: {},
      selectEvmTokenMarketData: {
        marketData:
          mockTokenMarketDataByChainId['0x1'][
            '0x6b175474e89094c44da98b954eedeac495271d0f'
          ],
        metadata: {
          decimals: 18,
          conversionRate: 2712.15,
          aggregators: ['Metamask', 'Coinmarketcap'],
        },
      },
    } as const;

    useSelectorSpy.mockImplementation((selectorOrCallback) => {
      if (typeof selectorOrCallback === 'function') {
        const selectorString = selectorOrCallback.toString();
        const matchedSelector = Object.keys(SELECTOR_MOCKS).find((key) =>
          selectorString.includes(key),
        );
        if (matchedSelector) {
          return SELECTOR_MOCKS[matchedSelector as keyof typeof SELECTOR_MOCKS];
        }
      }

      switch (selectorOrCallback) {
        case selectTokenList:
          return mockAssets;
        case selectContractExchangeRates:
          return {};
        case selectConversionRate:
          return mockExchangeRate;
        case selectCurrentCurrency:
          return mockCurrentCurrency;
        case selectProviderConfig:
          return { ticker: 'ETH' };
        case selectEvmTicker:
          return 'ETH';
        case selectMultichainAssetsRates:
          return {};
        default:
          return undefined;
      }
    });

    const { getByText, queryByText } = renderWithProvider(
      <TokenDetails asset={mockDAI} />,
      {
        state: initialState,
      },
    );

    expect(getByText('Token details')).toBeDefined();
    expect(queryByText('Market details')).toBeNull();
  });

  it('should render MarketDetails without TokenDetails when tokenList is null', () => {
    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockImplementation((selectorOrCallback) => {
      const SELECTOR_MOCKS = {
        selectEvmTokenMarketData: {
          marketData:
            mockTokenMarketDataByChainId['0x1'][
              '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            ],
        },
        selectConversionRateBySymbol: mockExchangeRate,
        selectNativeCurrencyByChainId: 'ETH',
      } as const;

      if (typeof selectorOrCallback === 'function') {
        const selectorString = selectorOrCallback.toString();
        const matchedSelector = Object.keys(SELECTOR_MOCKS).find((key) =>
          selectorString.includes(key),
        );
        if (matchedSelector) {
          return SELECTOR_MOCKS[matchedSelector as keyof typeof SELECTOR_MOCKS];
        }
      }

      switch (selectorOrCallback) {
        case selectContractExchangeRates:
          return mockContractExchangeRates;
        case selectConversionRate:
          return mockExchangeRate;
        case selectCurrentCurrency:
          return mockCurrentCurrency;
        case selectMultichainAssetsRates:
          return {};
        case selectIsEvmNetworkSelected:
          return true;
        default:
          return undefined;
      }
    });

    const { getByText, queryByText, debug } = renderWithProvider(
      <TokenDetails asset={mockDAI} />,
      { state: initialState },
    );
    debug();
    expect(queryByText('Token details')).toBeNull();
    expect(getByText('Market details')).toBeDefined();
  });

  it('should fetch market data from API for non-imported EVM token', async () => {
    // Given a non-imported EVM token (not in cache)
    const testTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC address
    const nonImportedToken = {
      ...mockDAI,
      address: testTokenAddress,
      symbol: 'USDC',
      name: 'USD Coin',
    };

    const mockApiResponse = {
      [testTokenAddress.toLowerCase()]: {
        price: 0.0005,
        marketCap: '5000000',
        totalVolume: '1000000',
        circulatingSupply: '10000000',
        allTimeHigh: 0.001,
        allTimeLow: 0.0001,
        dilutedMarketCap: '6000000',
      },
    };

    jest.mocked(handleFetch).mockResolvedValue(mockApiResponse);

    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockImplementation((selectorOrCallback) => {
      const SELECTOR_MOCKS = {
        selectEvmTokenMarketData: null, // No cached data
        selectConversionRateBySymbol: mockExchangeRate,
        selectNativeCurrencyByChainId: 'ETH',
        selectMultichainAssetsRates: {},
      } as const;

      if (typeof selectorOrCallback === 'function') {
        const selectorString = selectorOrCallback.toString();
        const matchedSelector = Object.keys(SELECTOR_MOCKS).find((key) =>
          selectorString.includes(key),
        );
        if (matchedSelector) {
          return SELECTOR_MOCKS[matchedSelector as keyof typeof SELECTOR_MOCKS];
        }
      }

      switch (selectorOrCallback) {
        case selectCurrentCurrency:
          return mockCurrentCurrency;
        case selectIsEvmNetworkSelected:
          return true;
        case selectMultichainAssetsRates:
          return {};
        default:
          return undefined;
      }
    });

    // When component renders
    const { findByText } = renderWithProvider(
      <TokenDetails asset={nonImportedToken} />,
      { state: initialState },
    );

    // Then market data should be fetched and displayed
    await findByText('Market details');
    expect(handleFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        'price.api.cx.metamask.io/v2/chains/1/spot-prices',
      ),
    );
    expect(handleFetch).toHaveBeenCalledWith(
      expect.stringContaining('includeMarketData=true'),
    );
  });

  it('should fetch market data from API for non-imported Solana token', async () => {
    // Given a non-imported Solana token (CAIP format)
    const mockSolanaToken = {
      address:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      aggregators: [],
      balanceFiat: '$10.00',
      balance: '10',
      logo: 'https://example.com/jup.png',
      decimals: 9,
      image: 'https://example.com/jup.png',
      name: 'Jupiter',
      symbol: 'JUP',
      isETH: false,
      hasBalanceError: false,
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    };

    const mockApiResponse = {
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN':
        {
          price: 0.431111,
          marketCap: '1364703778',
          totalVolume: '32954819',
          circulatingSupply: '3165216666.64',
          allTimeHigh: 2,
          allTimeLow: 0.306358,
          dilutedMarketCap: '3017669206',
        },
    };

    jest.mocked(handleFetch).mockResolvedValue(mockApiResponse);

    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockImplementation((selectorOrCallback) => {
      const SELECTOR_MOCKS = {
        selectEvmTokenMarketData: null,
        selectConversionRateBySymbol: undefined,
        selectNativeCurrencyByChainId: undefined,
        selectMultichainAssetsRates: {}, // No cached rate
      } as const;

      if (typeof selectorOrCallback === 'function') {
        const selectorString = selectorOrCallback.toString();
        const matchedSelector = Object.keys(SELECTOR_MOCKS).find((key) =>
          selectorString.includes(key),
        );
        if (matchedSelector) {
          return SELECTOR_MOCKS[matchedSelector as keyof typeof SELECTOR_MOCKS];
        }
      }

      switch (selectorOrCallback) {
        case selectCurrentCurrency:
          return mockCurrentCurrency;
        case selectIsEvmNetworkSelected:
          return false;
        case selectMultichainAssetsRates:
          return {};
        default:
          return undefined;
      }
    });

    // When component renders
    const { findByText } = renderWithProvider(
      <TokenDetails asset={mockSolanaToken} />,
      { state: initialState },
    );

    // Then market data should be fetched from v3 API and displayed
    await findByText('Market details');
    expect(handleFetch).toHaveBeenCalledWith(
      expect.stringContaining('price.api.cx.metamask.io/v3/spot-prices'),
    );
    expect(handleFetch).toHaveBeenCalledWith(
      expect.stringContaining('includeMarketData=true'),
    );
  });

  it('should not fetch market data when already cached for EVM token', async () => {
    // Given an EVM token with cached market data
    jest.clearAllMocks(); // Clear previous API calls

    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockImplementation((selectorOrCallback) => {
      const SELECTOR_MOCKS = {
        selectEvmTokenMarketData: {
          marketData: {
            price: 0.0005,
            marketCap: '5000000',
            totalVolume: '1000000',
            circulatingSupply: '10000000',
            allTimeHigh: 0.001,
            allTimeLow: 0.0001,
          },
        }, // Market data is cached
        selectConversionRateBySymbol: mockExchangeRate,
        selectNativeCurrencyByChainId: 'ETH',
        selectMultichainAssetsRates: {},
        selectTokenDisplayData: { found: false },
      } as const;

      if (typeof selectorOrCallback === 'function') {
        const selectorString = selectorOrCallback.toString();
        const matchedSelector = Object.keys(SELECTOR_MOCKS).find((key) =>
          selectorString.includes(key),
        );
        if (matchedSelector) {
          return SELECTOR_MOCKS[matchedSelector as keyof typeof SELECTOR_MOCKS];
        }
      }

      switch (selectorOrCallback) {
        case selectCurrentCurrency:
          return mockCurrentCurrency;
        case selectIsEvmNetworkSelected:
          return true;
        case selectMultichainAssetsRates:
          return {};
        default:
          return undefined;
      }
    });

    // When component renders
    const { getByText } = renderWithProvider(<TokenDetails asset={mockDAI} />, {
      state: initialState,
    });

    // Then market data should be displayed without API call
    expect(getByText('Market details')).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(handleFetch).not.toHaveBeenCalled();
  });

  it('should not fetch market data when already cached for non-EVM (Solana) token', async () => {
    // Given a Solana token with cached market data
    jest.clearAllMocks(); // Clear previous API calls

    const mockSolanaToken = {
      address:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
      aggregators: [],
      balanceFiat: '$10.00',
      balance: '10',
      logo: 'https://example.com/jup.png',
      decimals: 9,
      image: 'https://example.com/jup.png',
      name: 'Jupiter',
      symbol: 'JUP',
      isETH: false,
      hasBalanceError: false,
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    };

    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockImplementation((selectorOrCallback) => {
      const SELECTOR_MOCKS = {
        selectEvmTokenMarketData: null,
        selectConversionRateBySymbol: undefined,
        selectNativeCurrencyByChainId: undefined,
        selectMultichainAssetsRates: {
          [mockSolanaToken.address]: {
            rate: 0.431111,
            marketData: {
              // Cached market data for Solana token
              allTimeHigh: 2,
              allTimeLow: 0.306358,
              circulatingSupply: '3165216666.64',
              marketCap: '1364703778',
              totalVolume: '32954819',
              dilutedMarketCap: '3017669206',
            },
          },
        },
        selectTokenDisplayData: { found: false },
      } as const;

      if (typeof selectorOrCallback === 'function') {
        const selectorString = selectorOrCallback.toString();
        const matchedSelector = Object.keys(SELECTOR_MOCKS).find((key) =>
          selectorString.includes(key),
        );
        if (matchedSelector) {
          return SELECTOR_MOCKS[matchedSelector as keyof typeof SELECTOR_MOCKS];
        }
      }

      switch (selectorOrCallback) {
        case selectCurrentCurrency:
          return mockCurrentCurrency;
        case selectIsEvmNetworkSelected:
          return false;
        case selectMultichainAssetsRates:
          return SELECTOR_MOCKS.selectMultichainAssetsRates;
        default:
          return undefined;
      }
    });

    // When component renders
    const { getByText } = renderWithProvider(
      <TokenDetails asset={mockSolanaToken} />,
      { state: initialState },
    );

    // Then market data should be displayed without API call
    expect(getByText('Market details')).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(handleFetch).not.toHaveBeenCalled();
  });

  it('should handle API fetch errors gracefully', async () => {
    // Given an API that fails
    const testTokenAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7'; // USDT address
    const nonImportedToken = {
      ...mockDAI,
      address: testTokenAddress,
    };

    jest.mocked(handleFetch).mockRejectedValue(new Error('API Error'));

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockImplementation((selectorOrCallback) => {
      const SELECTOR_MOCKS = {
        selectEvmTokenMarketData: null,
        selectConversionRateBySymbol: mockExchangeRate,
        selectNativeCurrencyByChainId: 'ETH',
        selectMultichainAssetsRates: {},
      } as const;

      if (typeof selectorOrCallback === 'function') {
        const selectorString = selectorOrCallback.toString();
        const matchedSelector = Object.keys(SELECTOR_MOCKS).find((key) =>
          selectorString.includes(key),
        );
        if (matchedSelector) {
          return SELECTOR_MOCKS[matchedSelector as keyof typeof SELECTOR_MOCKS];
        }
      }

      switch (selectorOrCallback) {
        case selectCurrentCurrency:
          return mockCurrentCurrency;
        case selectIsEvmNetworkSelected:
          return true;
        case selectMultichainAssetsRates:
          return {};
        default:
          return undefined;
      }
    });

    // When component renders
    const { queryByText } = renderWithProvider(
      <TokenDetails asset={nonImportedToken} />,
      { state: initialState },
    );

    // Then error should be logged but component should not crash
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to fetch market data:',
      expect.any(Error),
    );
    expect(queryByText('Market details')).toBeNull();

    consoleErrorSpy.mockRestore();
  });
});
