import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import TokenList from './TokenList';
import { CROSSMINT_STAGING_XMEME_TOKEN } from '../../crossmint';
import { MEMECOINS_TEST_IDS } from '../../Memecoins.testIds';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockXmemeLocator = 'solana:7EivYFyNfgGj8xbUymR7J4LuxUHLKRzpLaERHLvi7Dgu';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../crossmint', () => {
  const actual = jest.requireActual('../../crossmint');
  return {
    ...actual,
    isCrossmintConfigured: jest.fn(() => true),
    fetchCrossmintMemecoinTokens: jest.fn(),
  };
});

jest.mock('../../hooks/useMemecoinMarketData', () => ({
  useMemecoinMarketData: () => ({
    marketDataByLocator: {
      [mockXmemeLocator]: {
        price: 0.00123,
        priceChange1d: 4.5,
        name: 'XMEME',
        symbol: 'XMEME',
        imageUrl: 'https://example.com/xmeme.png',
      },
    },
    isMarketDataLoading: false,
  }),
}));

jest.mock(
  '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => <View testID="memecoin-skeleton" />,
    };
  },
);

const { fetchCrossmintMemecoinTokens } = jest.requireMock(
  '../../crossmint',
) as {
  fetchCrossmintMemecoinTokens: jest.Mock;
};

const mockStore = configureMockStore();
const store = mockStore({
  engine: {
    backgroundState: {
      CurrencyRateController: {
        currentCurrency: 'usd',
      },
    },
  },
});

describe('Memecoins TokenList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchCrossmintMemecoinTokens.mockResolvedValue([
      CROSSMINT_STAGING_XMEME_TOKEN,
    ]);
  });

  it('renders token list with search and market data', async () => {
    const { getByText, getByTestId } = render(
      <Provider store={store}>
        <TokenList />
      </Provider>,
    );

    await waitFor(() => {
      expect(
        getByTestId(`${MEMECOINS_TEST_IDS.TOKEN_LIST_ITEM}-XMEME`),
      ).toBeOnTheScreen();
    });

    expect(getByText('Buy With Apple Pay')).toBeOnTheScreen();
    expect(getByTestId(MEMECOINS_TEST_IDS.TOKEN_LIST_SEARCH)).toBeOnTheScreen();
    expect(getByText('+4.50%')).toBeOnTheScreen();
  });

  it('filters tokens by search query', async () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <TokenList />
      </Provider>,
    );

    await waitFor(() => {
      expect(
        getByTestId(`${MEMECOINS_TEST_IDS.TOKEN_LIST_ITEM}-XMEME`),
      ).toBeOnTheScreen();
    });

    fireEvent.changeText(
      getByTestId(MEMECOINS_TEST_IDS.TOKEN_LIST_SEARCH_INPUT),
      'nomatch',
    );

    await waitFor(() => {
      expect(
        queryByTestId(`${MEMECOINS_TEST_IDS.TOKEN_LIST_ITEM}-XMEME`),
      ).toBeNull();
      expect(getByText('No tokens match your search.')).toBeOnTheScreen();
    });
  });
});
