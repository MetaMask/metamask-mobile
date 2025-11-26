import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ExploreSearchResults from './ExploreSearchResults';
import { useExploreSearch } from './config/useExploreSearch';
import { useSelector } from 'react-redux';
import { selectBasicFunctionalityEnabled } from '../../../../../../selectors/settings';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
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

  it('renders list when data is available', () => {
    mockUseExploreSearch.mockReturnValue({
      data: {
        tokens: [
          { assetId: '1', symbol: 'BTC', name: 'Bitcoin' },
          { assetId: '2', symbol: 'ETH', name: 'Ethereum' },
        ],
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

    const { getByTestId } = render(<ExploreSearchResults searchQuery="btc" />);

    expect(getByTestId('trending-search-results-list')).toBeDefined();
  });

  it('renders section headers when sections have data', () => {
    mockUseExploreSearch.mockReturnValue({
      data: {
        tokens: [{ assetId: '1', symbol: 'BTC', name: 'Bitcoin' }],
        perps: [{ symbol: 'ETH-USD', name: 'Ethereum' }],
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

    const { getByText } = render(<ExploreSearchResults searchQuery="" />);

    expect(getByText('Tokens')).toBeDefined();
    expect(getByText('Perps')).toBeDefined();
  });

  it('displays skeleton loaders when loading', () => {
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
    });

    const { getByTestId, getByText } = render(
      <ExploreSearchResults searchQuery="" />,
    );

    expect(getByTestId('trending-search-results-list')).toBeDefined();
    expect(getByText('Tokens')).toBeDefined();
  });

  it('renders multiple sections with data simultaneously', () => {
    mockUseExploreSearch.mockReturnValue({
      data: {
        tokens: [
          { assetId: '1', symbol: 'BTC', name: 'Bitcoin' },
          { assetId: '2', symbol: 'ETH', name: 'Ethereum' },
        ],
        perps: [{ symbol: 'BTC-USD', name: 'Bitcoin' }],
        predictions: [{ id: '1', title: 'Will Bitcoin reach 100k?' }],
        sites: [],
      },
      isLoading: {
        tokens: false,
        perps: false,
        predictions: false,
        sites: false,
      },
    });

    const { getByText } = render(<ExploreSearchResults searchQuery="btc" />);

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

  it('handles empty query by displaying top results', () => {
    mockUseExploreSearch.mockReturnValue({
      data: {
        tokens: [
          { assetId: '1', symbol: 'BTC', name: 'Bitcoin' },
          { assetId: '2', symbol: 'ETH', name: 'Ethereum' },
          { assetId: '3', symbol: 'SOL', name: 'Solana' },
        ],
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

    const { getByTestId } = render(<ExploreSearchResults searchQuery="" />);

    expect(getByTestId('trending-search-results-list')).toBeDefined();
  });

  describe('Footer', () => {
    it('displays Google search option when search query is provided and loading is finished', () => {
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

      const { getByTestId, getByText } = render(
        <ExploreSearchResults searchQuery="bitcoin" />,
      );

      expect(getByTestId('trending-search-footer-google-link')).toBeDefined();
      expect(getByText('bitcoin')).toBeDefined();
      expect(getByText(/on Google/)).toBeDefined();
    });

    it('displays direct URL link when search query looks like a URL', () => {
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

      const { getByTestId, getAllByText } = render(
        <ExploreSearchResults searchQuery="example.com" />,
      );

      expect(getByTestId('trending-search-footer-url-link')).toBeDefined();
      expect(getByTestId('trending-search-footer-google-link')).toBeDefined();
      expect(getAllByText('example.com').length).toBeGreaterThan(0);
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

      const { queryByText } = render(<ExploreSearchResults searchQuery="" />);

      expect(queryByText('Search for')).toBeNull();
      expect(queryByText('on Google')).toBeNull();
    });

    it('does not display footer when still loading', () => {
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
      });

      const { queryByText } = render(
        <ExploreSearchResults searchQuery="bitcoin" />,
      );

      expect(queryByText('Search for')).toBeNull();
      expect(queryByText('on Google')).toBeNull();
    });

    it('navigates to Google search when Google search option is pressed', () => {
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

      const { getByTestId } = render(
        <ExploreSearchResults searchQuery="ethereum" />,
      );

      const googleSearchButton = getByTestId(
        'trending-search-footer-google-link',
      );

      fireEvent.press(googleSearchButton);

      expect(mockNavigate).toHaveBeenCalledWith('TrendingBrowser', {
        newTabUrl: 'https://www.google.com/search?q=ethereum',
        timestamp: expect.any(Number),
        fromTrending: true,
      });
    });

    it('navigates to URL when direct URL link is pressed', () => {
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

      const { getByTestId } = render(
        <ExploreSearchResults searchQuery="example.com" />,
      );

      const urlButton = getByTestId('trending-search-footer-url-link');

      fireEvent.press(urlButton);

      expect(mockNavigate).toHaveBeenCalledWith('TrendingBrowser', {
        newTabUrl: 'example.com',
        timestamp: expect.any(Number),
        fromTrending: true,
      });
    });
  });
});
