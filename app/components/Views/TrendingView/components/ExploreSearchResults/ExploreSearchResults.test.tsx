import React from 'react';
import { render } from '@testing-library/react-native';
import ExploreSearchResults from './ExploreSearchResults';
import { useExploreSearch } from '../../hooks/useExploreSearch';
import { useSelector } from 'react-redux';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';

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

jest.mock('../../hooks/useExploreSearch');
const mockUseExploreSearch = useExploreSearch as jest.MockedFunction<
  typeof useExploreSearch
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock child components that render individual items
jest.mock(
  '../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem',
  () => () => null,
);

jest.mock(
  '../../../../UI/Perps/components/PerpsMarketRowItem',
  () => () => null,
);

jest.mock('../../../../UI/Predict/components/PredictMarket', () => () => null);

jest.mock(
  '../../../../UI/Predict/components/PredictMarketRowItem',
  () => () => null,
);

jest.mock(
  '../../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter',
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

  afterEach(() => {
    jest.resetAllMocks();
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
      sectionsOrder: ['tokens', 'perps', 'predictions', 'sites'],
    });

    const { getByText, getByTestId } = render(
      <ExploreSearchResults searchQuery="btc" />,
    );

    expect(getByTestId('trending-search-results-list')).toBeDefined();
    expect(getByText('Trending tokens')).toBeDefined();
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
      sectionsOrder: ['tokens', 'perps', 'predictions', 'sites'],
    });

    const { getByText, queryByText } = render(
      <ExploreSearchResults searchQuery="btc" />,
    );

    expect(getByText('Trending tokens')).toBeDefined();
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
      sectionsOrder: ['tokens', 'perps', 'predictions', 'sites'],
    });

    render(<ExploreSearchResults searchQuery="ethereum" />);

    expect(mockUseExploreSearch).toHaveBeenCalledWith('ethereum');
  });

  describe('Footer', () => {
    it('renders component with search query for footer', () => {
      // Arrange
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
        sectionsOrder: ['tokens', 'perps', 'predictions', 'sites'],
      });

      // Act
      const { getByTestId } = render(
        <ExploreSearchResults searchQuery="bitcoin" />,
      );

      // Assert - FlashList renders with data
      expect(getByTestId('trending-search-results-list')).toBeDefined();
    });

    it('renders component with empty search query', () => {
      // Arrange
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
        sectionsOrder: ['tokens', 'perps', 'predictions', 'sites'],
      });

      // Act
      const { getByTestId } = render(<ExploreSearchResults searchQuery="" />);

      // Assert
      expect(getByTestId('trending-search-results-list')).toBeDefined();
    });
  });

  describe('loading state', () => {
    it('renders skeleton items when section is loading', () => {
      // Arrange
      mockUseExploreSearch.mockReturnValue({
        data: {
          tokens: [],
          perps: [],
          predictions: [],
          sites: [],
        },
        isLoading: {
          tokens: true,
          perps: false,
          predictions: false,
          sites: false,
        },
        sectionsOrder: ['tokens', 'perps', 'predictions', 'sites'],
      });

      // Act
      const { getByText } = render(
        <ExploreSearchResults searchQuery="bitcoin" />,
      );

      // Assert - shows header for loading section
      expect(getByText('Trending tokens')).toBeDefined();
    });

    it('hides section when not loading and has no data', () => {
      // Arrange
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
        sectionsOrder: ['tokens', 'perps', 'predictions', 'sites'],
      });

      // Act
      const { queryByText } = render(
        <ExploreSearchResults searchQuery="test" />,
      );

      // Assert - no section headers when empty and not loading
      expect(queryByText('Trending tokens')).toBeNull();
      expect(queryByText('Perps')).toBeNull();
      expect(queryByText('Predictions')).toBeNull();
    });
  });

  describe('basic functionality toggle', () => {
    it('hides all sections when basic functionality is disabled', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectBasicFunctionalityEnabled) {
          return false;
        }
        return undefined;
      });
      mockUseExploreSearch.mockReturnValue({
        data: {
          tokens: [{ assetId: '1', symbol: 'BTC', name: 'Bitcoin' }],
          perps: [{ symbol: 'BTC-USD', name: 'Bitcoin' }],
          predictions: [],
          sites: [],
        },
        isLoading: {
          tokens: false,
          perps: false,
          predictions: false,
          sites: false,
        },
        sectionsOrder: ['tokens', 'perps', 'predictions', 'sites'],
      });

      // Act
      const { queryByText } = render(
        <ExploreSearchResults searchQuery="btc" />,
      );

      // Assert - all sections hidden when basic functionality disabled
      expect(queryByText('Trending tokens')).toBeNull();
      expect(queryByText('Perps')).toBeNull();
    });
  });

  describe('section config handling', () => {
    it('handles undefined section config gracefully', () => {
      // Arrange
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
        // Include an unknown section ID
        sectionsOrder: [
          'tokens',
          'unknown' as 'tokens',
          'perps',
          'predictions',
          'sites',
        ],
      });

      // Act & Assert - should not throw
      const { getByText } = render(<ExploreSearchResults searchQuery="btc" />);
      expect(getByText('Trending tokens')).toBeDefined();
    });
  });
});
