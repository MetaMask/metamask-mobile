import React from 'react';
import { render } from '@testing-library/react-native';
import ExploreSearchResults from './ExploreSearchResults';
import { useExploreSearch } from './config/useExploreSearch';
import { useSelector } from 'react-redux';
import { selectBasicFunctionalityEnabled } from '../../../../../../selectors/settings';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('./config/useExploreSearch');
const mockUseExploreSearch = useExploreSearch as jest.MockedFunction<
  typeof useExploreSearch
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock child components that render individual items
jest.mock(
  '../../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem',
  () => () => null,
);

jest.mock(
  '../../../../../UI/Perps/components/PerpsMarketRowItem',
  () => () => null,
);

jest.mock(
  '../../../../../UI/Predict/components/PredictMarket',
  () => () => null,
);

jest.mock(
  '../../../../../UI/Predict/components/PredictMarketRowItem',
  () => () => null,
);

jest.mock(
  '../../../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter',
  () => {
    const ReactNative = jest.requireActual('react-native');
    return jest.fn(({ searchQuery }) =>
      searchQuery ? (
        <ReactNative.View testID="sites-search-footer">
          <ReactNative.Text>{searchQuery}</ReactNative.Text>
        </ReactNative.View>
      ) : null,
    );
  },
);

describe('ExploreSearchResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock selectBasicFunctionalityEnabled to return true by default
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectBasicFunctionalityEnabled) {
        return true;
      }
      return undefined;
    });
  });

  it('renders section headers for sections with data or loading', () => {
    mockUseExploreSearch.mockReturnValue({
      data: {
        tokens: [
          { assetId: '1', symbol: 'BTC', name: 'Bitcoin' },
          { assetId: '2', symbol: 'ETH', name: 'Ethereum' },
        ],
        perps: [{ symbol: 'BTC-USD', name: 'Bitcoin' }],
        predictions: [
          {
            id: '1',
            title: 'Will Bitcoin reach 100k?',
            outcomes: [
              {
                id: 'outcome-1',
                status: 'open',
                tokens: [{ id: 'token-1', title: 'Yes', price: 0.65 }],
              },
            ],
          },
        ],
        sites: [],
      },
      isLoading: {
        tokens: false,
        perps: false,
        predictions: false,
        sites: false,
      },
    });

    const { getByText, getByTestId } = render(
      <ExploreSearchResults searchQuery="btc" />,
    );

    expect(getByTestId('trending-search-results-list')).toBeDefined();
    expect(getByText('Tokens')).toBeDefined();
    expect(getByText('Perps')).toBeDefined();
    expect(getByText('Predictions')).toBeDefined();
  });

  it('only shows sections with data or loading state', () => {
    mockUseExploreSearch.mockReturnValue({
      data: {
        tokens: [{ assetId: '1', symbol: 'BTC', name: 'Bitcoin' }],
        perps: [],
        predictions: [],
        sites: [],
      },
      isLoading: {
        tokens: false,
        perps: false,
        predictions: false,
        sites: false,
      },
    });

    const { getByText, queryByText } = render(
      <ExploreSearchResults searchQuery="btc" />,
    );

    expect(getByText('Tokens')).toBeDefined();
    expect(queryByText('Perps')).toBeNull();
    expect(queryByText('Predictions')).toBeNull();
  });

  it('passes search query to useExploreSearch hook', () => {
    mockUseExploreSearch.mockReturnValue({
      data: {
        tokens: [],
        perps: [],
        predictions: [],
        sites: [],
      },
      isLoading: {
        tokens: false,
        perps: false,
        predictions: false,
        sites: false,
      },
    });

    render(<ExploreSearchResults searchQuery="ethereum" />);

    expect(mockUseExploreSearch).toHaveBeenCalledWith('ethereum');
  });

  describe('Footer', () => {
    it('displays SitesSearchFooter when search query is provided', () => {
      mockUseExploreSearch.mockReturnValue({
        data: {
          tokens: [{ assetId: '1', symbol: 'BTC', name: 'Bitcoin' }],
          perps: [],
          predictions: [],
          sites: [],
        },
        isLoading: {
          tokens: false,
          perps: false,
          predictions: false,
          sites: false,
        },
      });

      const { getByTestId } = render(
        <ExploreSearchResults searchQuery="bitcoin" />,
      );

      expect(getByTestId('sites-search-footer')).toBeDefined();
    });

    it('does not display footer when search query is empty', () => {
      mockUseExploreSearch.mockReturnValue({
        data: {
          tokens: [{ assetId: '1', symbol: 'BTC', name: 'Bitcoin' }],
          perps: [],
          predictions: [],
          sites: [],
        },
        isLoading: {
          tokens: false,
          perps: false,
          predictions: false,
          sites: false,
        },
      });

      const { queryByTestId } = render(<ExploreSearchResults searchQuery="" />);

      expect(queryByTestId('sites-search-footer')).toBeNull();
    });
  });
});
