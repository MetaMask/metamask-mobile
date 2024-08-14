import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Engine from '../../../../core/Engine';
import TokenDetails from './';
import { selectTokenList } from '../../../../selectors/tokenListController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
// eslint-disable-next-line import/no-namespace
import * as reactRedux from 'react-redux';

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    TokensController: {},
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

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
  balanceError: undefined,
  balanceFiat: '$6.49',
  decimals: 18,
  image:
    'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  name: 'Dai Stablecoin',
  symbol: 'DAI',
  isETH: false,
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

describe('TokenDetails', () => {
  it('should render correctly', () => {
    const useSelectorSpy = jest.spyOn(reactRedux, 'useSelector');
    useSelectorSpy.mockImplementation((selector) => {
      switch (selector) {
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

    const { toJSON, getByText } = renderWithProvider(
      <TokenDetails asset={mockDAI} />,
      {
        state: initialState,
      },
    );

    expect(getByText('Token details')).toBeDefined();
    expect(getByText('Contract address')).toBeDefined();
    expect(getByText('0x6B17...1d0F')).toBeDefined();
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
});
