import React from 'react';
import { Hex } from '@metamask/utils';
import { MarketDataDetails } from '@metamask/assets-controllers';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import TokenDetails from './';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import {
  selectProviderConfig,
  selectEvmTicker,
} from '../../../../selectors/networkController';
// eslint-disable-next-line import/no-namespace
import * as reactRedux from 'react-redux';
// eslint-disable-next-line import/no-namespace
import * as StakeConstants from '../../Stake/constants';
import { strings } from '../../../../../locales/i18n';
jest.mock('../../../../core/Engine', () => ({
  getTotalEvmFiatAccountBalance: jest.fn(),
  context: {
    TokensController: {},
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
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

let isStablecoinLendingFeatureEnabledSpy: jest.SpyInstance;

describe('TokenDetails', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });
  beforeEach(() => {
    isStablecoinLendingFeatureEnabledSpy = jest
      .spyOn(StakeConstants, 'isStablecoinLendingFeatureEnabled')
      .mockReturnValue(false);
  });

  const mockSelectors = () => {
    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockImplementation((selectorOrCallback) => {
      const SELECTOR_MOCKS = {
        selectTokenMarketDataByChainId: mockTokenMarketDataByChainId['0x1'],
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
        case selectTokenList:
          return mockAssets;
        case selectContractExchangeRates:
          return mockContractExchangeRates;
        case selectConversionRate:
          return mockExchangeRate;
        case selectCurrentCurrency:
          return mockCurrentCurrency;
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
    expect(getByText('5.22B')).toBeDefined();
    expect(getByText('Total Volume (24h)')).toBeDefined();
    expect(getByText('147.65M')).toBeDefined();
    expect(getByText('Volume / Market Cap')).toBeDefined();
    expect(getByText('2.83%')).toBeDefined();
    expect(getByText('Circulating supply')).toBeDefined();
    expect(getByText('5.21B')).toBeDefined();
    expect(getByText('All time high')).toBeDefined();
    expect(getByText('All time low')).toBeDefined();
    expect(getByText('$0.88')).toBeDefined();
    expect(getByText('2.83%')).toBeDefined();
    expect(getByText('Fully diluted')).toBeDefined();
    expect(getByText('1.92M')).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render Token Details without Market Details when marketData is null', () => {
    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    const SELECTOR_MOCKS = {
      selectTokenMarketDataByChainId: {},
      selectConversionRateBySymbol: mockExchangeRate,
      selectNativeCurrencyByChainId: 'ETH',
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
        selectTokenMarketDataByChainId: mockTokenMarketDataByChainId['0x1'],
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
        case selectTokenList:
          return {};
        case selectContractExchangeRates:
          return mockContractExchangeRates;
        case selectConversionRate:
          return mockExchangeRate;
        case selectCurrentCurrency:
          return mockCurrentCurrency;
        default:
          return undefined;
      }
    });

    const { getByText, queryByText } = renderWithProvider(
      <TokenDetails asset={mockDAI} />,
      { state: initialState },
    );
    expect(queryByText('Token details')).toBeNull();
    expect(getByText('Market details')).toBeDefined();
  });

  it('renders EarnEmptyStateCta if asset can be lent and balance is not zero', () => {
    isStablecoinLendingFeatureEnabledSpy.mockReturnValue(true);

    mockSelectors();

    const { getByText } = renderWithProvider(<TokenDetails asset={mockDAI} />, {
      state: initialState,
    });

    expect(
      getByText(
        strings('earn.empty_state_cta.heading', {
          tokenSymbol: mockDAI.symbol,
        }),
      ),
    ).toBeDefined();
    expect(
      getByText(strings('earn.empty_state_cta.start_earning')),
    ).toBeDefined();
  });

  it('does not render EarnEmptyCta if asset can be lent but balance is zero', () => {
    isStablecoinLendingFeatureEnabledSpy.mockReturnValue(true);

    mockSelectors();

    const mockDaiWithoutBalance = {
      ...mockDAI,
      balanceFiat: '$0.00',
      balance: '0',
    };

    const { queryByText } = renderWithProvider(
      <TokenDetails asset={mockDaiWithoutBalance} />,
      {
        state: initialState,
      },
    );

    expect(
      queryByText(
        strings('earn.empty_state_cta.heading', {
          tokenSymbol: mockDAI.symbol,
        }),
      ),
    ).toBeNull();
    expect(
      queryByText(strings('earn.empty_state_cta.start_earning')),
    ).toBeNull();
  });
});
