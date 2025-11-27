import React from 'react';
import { render } from '@testing-library/react-native';
import ExploreSearchResults from './ExploreSearchResults';
import { useExploreSearch } from './config/useExploreSearch';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('./config/useExploreSearch');
const mockUseExploreSearch = useExploreSearch as jest.MockedFunction<
  typeof useExploreSearch
>;

// Mock child components that render individual items
jest.mock(
  '../../../TrendingTokensSection/TrendingTokensList/TrendingTokenRowItem/TrendingTokenRowItem',
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
  });

  it('displays no results message when no data is available', () => {
    mockUseExploreSearch.mockReturnValue({
      data: {
        tokens: [],
        perps: [],
        predictions: [],
      },
      isLoading: {
        tokens: false,
        perps: false,
        predictions: false,
      },
    });

    const { getByTestId } = render(<ExploreSearchResults searchQuery="" />);

    expect(getByTestId('trending-search-no-results')).toBeDefined();
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
      },
      isLoading: {
        tokens: false,
        perps: false,
        predictions: false,
      },
    });

    const { getByTestId, queryByTestId } = render(
      <ExploreSearchResults searchQuery="btc" />,
    );

    expect(getByTestId('trending-search-results-list')).toBeDefined();
    expect(queryByTestId('trending-search-no-results')).toBeNull();
  });

  it('renders section headers when sections have data', () => {
    mockUseExploreSearch.mockReturnValue({
      data: {
        tokens: [{ assetId: '1', symbol: 'BTC', name: 'Bitcoin' }],
        perps: [{ symbol: 'ETH-USD', name: 'Ethereum' }],
        predictions: [],
      },
      isLoading: {
        tokens: false,
        perps: false,
        predictions: false,
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
      },
      isLoading: {
        tokens: true,
        perps: false,
        predictions: false,
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
      },
      isLoading: {
        tokens: false,
        perps: false,
        predictions: false,
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
      },
      isLoading: {
        tokens: false,
        perps: false,
        predictions: false,
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
      },
      isLoading: {
        tokens: false,
        perps: false,
        predictions: false,
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
      },
      isLoading: {
        tokens: false,
        perps: false,
        predictions: false,
      },
    });

    const { getByTestId } = render(<ExploreSearchResults searchQuery="" />);

    expect(getByTestId('trending-search-results-list')).toBeDefined();
  });
});
