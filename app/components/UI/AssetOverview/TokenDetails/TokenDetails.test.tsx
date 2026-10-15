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
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import { backgroundState } from '../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TokenDetails from './';
// eslint-disable-next-line import-x/no-namespace
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
        selectTokenMarketData:
          mockTokenMarketDataByChainId['0x1'][
            '0x6B175474E89094C44Da98b954EedeAC495271d0F'
          ],
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

  it('renders token details and market details sections', () => {
    mockSelectors();

    const { getByText, getAllByText } = renderWithProvider(
      <TokenDetails asset={mockDAI} />,
      {
        state: initialState,
      },
    );

    // Token details section
    expect(getByText('Token details')).toBeDefined();
    expect(getByText('Contract address')).toBeDefined();
    expect(getByText('0x6B175...71d0F')).toBeDefined();
    expect(getByText('Token decimal')).toBeDefined();
    expect(getByText('18')).toBeDefined();
    expect(getByText('Token list')).toBeDefined();
    expect(getByText('Metamask, Coinmarketcap')).toBeDefined();
    expect(getByText('Market details')).toBeDefined();
    expect(getByText('Market cap')).toBeDefined();
    expect(getAllByText('$5.22B').length).toBe(2); // marketCap and fullyDiluted (same value)
    expect(getByText('Total volume (24h)')).toBeDefined();
    expect(getByText('$147.65M')).toBeDefined(); // totalVolume (ETH) * conversionRate
    expect(getByText('Volume / Market cap')).toBeDefined();
    expect(getByText('2.83%')).toBeDefined();
    expect(getByText('Circulating supply')).toBeDefined();
    expect(getByText('5.21B')).toBeDefined();
    expect(getByText('All time high')).toBeDefined();
    expect(getByText('$1.22')).toBeDefined(); // allTimeHigh (ETH) * conversionRate
    expect(getByText('All time low')).toBeDefined();
    expect(getByText('$0.88')).toBeDefined(); // allTimeLow (ETH) * conversionRate
    expect(getByText('Fully diluted')).toBeDefined();
  });

  it('should render Token Details without Market Details when marketData is null', () => {
    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    const SELECTOR_MOCKS = {
      selectTokenMarketDataByChainId: {},
      selectConversionRateBySymbol: mockExchangeRate,
      selectNativeCurrencyByChainId: 'ETH',
      selectMultichainAssetsRates: {},
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
        selectTokenMarketData:
          mockTokenMarketDataByChainId['0x1'][
            '0x6B175474E89094C44Da98b954EedeAC495271d0F'
          ],
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

    const tokenWithoutAddress = {
      ...mockDAI,
      address: '', // Empty address makes contractAddress null
    };

    const { getByText, queryByText } = renderWithProvider(
      <TokenDetails asset={tokenWithoutAddress} />,
      { state: initialState },
    );
    expect(queryByText('Token details')).toBeNull();
    expect(getByText('Market details')).toBeDefined();
  });

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

  const mockUseSelectorImplementation =
    (customMocks: Record<string, unknown>) => (selectorOrCallback: unknown) => {
      if (typeof selectorOrCallback === 'function') {
        const selectorString = selectorOrCallback.toString();
        const matchedKey = Object.keys(customMocks).find((key) =>
          selectorString.includes(key),
        );
        if (matchedKey) return customMocks[matchedKey];
      }

      switch (selectorOrCallback) {
        case selectCurrentCurrency:
          return mockCurrentCurrency;
        case selectIsEvmNetworkSelected:
          return customMocks.isEvmNetwork ?? true;
        case selectMultichainAssetsRates:
          return customMocks.multichainRates ?? {};
        default:
          return undefined;
      }
    };

  it('should fetch market data from API for non-imported EVM token', async () => {
    const testToken = {
      ...mockDAI,
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
    };

    jest.mocked(handleFetch).mockResolvedValue({
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
        price: 0.0005,
        marketCap: '5000000',
      },
    });

    jest.spyOn(reactRedux, 'useSelector').mockImplementation(
      mockUseSelectorImplementation({
        selectTokenMarketData: null,
        selectConversionRateBySymbol: mockExchangeRate,
        selectNativeCurrencyByChainId: 'ETH',
        isEvmNetwork: true,
      }),
    );

    const { findByText } = renderWithProvider(
      <TokenDetails asset={testToken} />,
      { state: initialState },
    );

    await findByText('Market details');
    expect(handleFetch).toHaveBeenCalledWith(
      expect.stringContaining('price.api.cx.metamask.io/v3/spot-prices'),
    );
  });

  it('should fetch market data from API for non-imported Solana token', async () => {
    jest.mocked(handleFetch).mockResolvedValue({
      [mockSolanaToken.address]: {
        price: 0.431111,
        marketCap: '1364703778',
      },
    });

    jest.spyOn(reactRedux, 'useSelector').mockImplementation(
      mockUseSelectorImplementation({
        selectTokenMarketData: null,
        isEvmNetwork: false,
      }),
    );

    const { findByText } = renderWithProvider(
      <TokenDetails asset={mockSolanaToken} />,
      { state: initialState },
    );

    await findByText('Market details');
    expect(handleFetch).toHaveBeenCalledWith(
      expect.stringContaining('price.api.cx.metamask.io/v3/spot-prices'),
    );
  });

  it('should not fetch market data when already cached for EVM token', async () => {
    jest.clearAllMocks();

    jest.spyOn(reactRedux, 'useSelector').mockImplementation(
      mockUseSelectorImplementation({
        selectTokenMarketData: {
          price: 0.0005,
          marketCap: '5000000',
        },
        selectConversionRateBySymbol: mockExchangeRate,
        selectNativeCurrencyByChainId: 'ETH',
        isEvmNetwork: true,
      }),
    );

    const { getByText } = renderWithProvider(<TokenDetails asset={mockDAI} />, {
      state: initialState,
    });

    expect(getByText('Market details')).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(handleFetch).not.toHaveBeenCalled();
  });

  it('should not fetch market data when already cached for Solana token', async () => {
    jest.clearAllMocks();

    jest.spyOn(reactRedux, 'useSelector').mockImplementation(
      mockUseSelectorImplementation({
        selectTokenMarketData: null,
        multichainRates: {
          [mockSolanaToken.address]: {
            rate: 0.431111,
            marketData: {
              allTimeHigh: 2,
              marketCap: '1364703778',
            },
          },
        },
        isEvmNetwork: false,
      }),
    );

    const { getByText } = renderWithProvider(
      <TokenDetails asset={mockSolanaToken} />,
      { state: initialState },
    );

    expect(getByText('Market details')).toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(handleFetch).not.toHaveBeenCalled();
  });

  // Token Details V1 resolves market data once for the whole screen and passes
  // it down, so this component must not duplicate the request.
  it('does not fetch market data when it is supplied by the caller', async () => {
    jest.clearAllMocks();

    jest.spyOn(reactRedux, 'useSelector').mockImplementation(
      mockUseSelectorImplementation({
        selectTokenMarketData: null,
        selectConversionRateBySymbol: mockExchangeRate,
        selectNativeCurrencyByChainId: 'ETH',
        isEvmNetwork: true,
      }),
    );

    const { getByText } = renderWithProvider(
      <TokenDetails
        asset={mockDAI}
        marketData={
          {
            assetPriceType: 'fungible',
            price: 1,
            usdPrice: 1,
            lastUpdated: 0,
            marketCap: 5_000_000,
          } as never
        }
      />,
      { state: initialState },
    );

    expect(getByText('Market details')).toBeOnTheScreen();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(handleFetch).not.toHaveBeenCalled();
  });

  // The caller passes null while its own request is in flight. Fetching here
  // would race it with an identical request, which is what the prop exists to
  // prevent — so presence of the prop, not its value, has to gate the fetch.
  it('does not fetch market data when the caller supplies null', async () => {
    jest.clearAllMocks();

    jest.spyOn(reactRedux, 'useSelector').mockImplementation(
      mockUseSelectorImplementation({
        selectTokenMarketData: null,
        selectConversionRateBySymbol: mockExchangeRate,
        selectNativeCurrencyByChainId: 'ETH',
        isEvmNetwork: true,
      }),
    );

    // No market data from any source, so the section itself stays hidden —
    // what matters here is that no request went out to populate it.
    const { getByText } = renderWithProvider(
      <TokenDetails asset={mockDAI} marketData={null} />,
      { state: initialState },
    );

    expect(getByText('Token details')).toBeOnTheScreen();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(handleFetch).not.toHaveBeenCalled();
  });

  // Omitting the prop entirely is the legacy page, which still owns its fetch.
  it('fetches market data when no caller supplies it', async () => {
    jest.clearAllMocks();

    jest.mocked(handleFetch).mockResolvedValue({});
    jest.spyOn(reactRedux, 'useSelector').mockImplementation(
      mockUseSelectorImplementation({
        selectTokenMarketData: null,
        selectConversionRateBySymbol: mockExchangeRate,
        selectNativeCurrencyByChainId: 'ETH',
        isEvmNetwork: true,
      }),
    );

    renderWithProvider(<TokenDetails asset={mockDAI} />, {
      state: initialState,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(handleFetch).toHaveBeenCalledWith(
      expect.stringContaining('price.api.cx.metamask.io/v3/spot-prices'),
    );
  });

  // Supplied data is already in the selected currency, so applying the native
  // conversion rate on top of it would inflate every figure.
  it('renders supplied market data without applying the conversion rate', () => {
    jest.clearAllMocks();

    jest.spyOn(reactRedux, 'useSelector').mockImplementation(
      mockUseSelectorImplementation({
        selectTokenMarketData: null,
        selectConversionRateBySymbol: mockExchangeRate,
        selectNativeCurrencyByChainId: 'ETH',
        isEvmNetwork: true,
      }),
    );

    const { getByText } = renderWithProvider(
      <TokenDetails
        asset={mockDAI}
        marketData={
          {
            assetPriceType: 'fungible',
            price: 1,
            usdPrice: 1,
            lastUpdated: 0,
            marketCap: 5_000_000,
          } as never
        }
      />,
      { state: initialState },
    );

    // 5M as given, not 5M multiplied by the ETH rate.
    expect(getByText('$5.00M')).toBeOnTheScreen();
  });
});
