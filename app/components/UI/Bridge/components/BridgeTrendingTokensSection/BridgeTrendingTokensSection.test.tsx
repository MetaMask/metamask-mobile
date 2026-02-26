import { TrendingAsset } from '@metamask/assets-controllers';
import { act, fireEvent, render } from '@testing-library/react-native';
import React, { createRef } from 'react';
import BridgeTrendingTokensSection, {
  BridgeTrendingTokensSectionRef,
} from './BridgeTrendingTokensSection';
import { useTrendingFilters } from '../../../Trending/hooks/useTrendingFilters/useTrendingFilters';
import { useTrendingRequest } from '../../../Trending/hooks/useTrendingRequest/useTrendingRequest';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ({})),
}));

jest.mock(
  '../../../Trending/hooks/useTrendingFilters/useTrendingFilters',
  () => ({
    useTrendingFilters: jest.fn(),
  }),
);

jest.mock(
  '../../../Trending/hooks/useTrendingRequest/useTrendingRequest',
  () => ({
    useTrendingRequest: jest.fn(),
  }),
);

jest.mock('../../../Trending/utils/sortTrendingTokens', () => ({
  sortTrendingTokens: jest.fn((tokens: TrendingAsset[]) => tokens),
}));

jest.mock(
  '../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem',
  () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ token }: { token: { assetId: string } }) =>
        React.createElement(View, { testID: `row-${token.assetId}` }),
    };
  },
);

jest.mock(
  '../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => React.createElement(View, { testID: 'skeleton-row' }),
    };
  },
);

jest.mock('../../../Trending/components/TrendingTokensBottomSheet', () => ({
  TrendingTokenTimeBottomSheet: () => null,
  TrendingTokenNetworkBottomSheet: () => null,
  TrendingTokenPriceChangeBottomSheet: () => null,
}));

const mockUseTrendingFilters = useTrendingFilters as jest.Mock;
const mockUseTrendingRequest = useTrendingRequest as jest.Mock;

const createTrendingTokens = (count: number): TrendingAsset[] =>
  Array.from({ length: count }, (_, index) => ({
    assetId: `eip155:1/erc20:0x${(index + 1).toString(16).padStart(40, '0')}`,
    symbol: `T${index + 1}`,
    name: `Token ${index + 1}`,
    decimals: 18,
    price: `${index + 1}`,
    priceChangePct: {
      h24: `${index + 1}`,
      h6: `${index + 1}`,
      h1: `${index + 1}`,
      m5: `${index + 1}`,
    },
  }));

const setupMocks = (tokens: TrendingAsset[], isLoading = false) => {
  mockUseTrendingFilters.mockReturnValue({
    selectedTimeOption: '24h',
    selectedNetwork: null,
    selectedPriceChangeOption: 'price_change',
    priceChangeSortDirection: 'descending',
    sortBy: 'h24_trending',
    selectedNetworkName: 'All networks',
    priceChangeButtonText: 'Price change',
    filterContext: {
      timeFilter: '24h',
      sortOption: 'price_change',
      networkFilter: 'all',
      isSearchResult: false,
    },
    handlePriceChangeSelect: jest.fn(),
    handleNetworkSelect: jest.fn(),
    handleTimeSelect: jest.fn(),
  });
  mockUseTrendingRequest.mockReturnValue({
    results: tokens,
    isLoading,
    error: null,
    fetch: jest.fn(),
  });
};

describe('BridgeTrendingTokensSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks(createTrendingTokens(30));
  });

  it('renders 12 tokens initially and shows the show-more button', () => {
    const { getAllByTestId, getByTestId } = render(
      <BridgeTrendingTokensSection />,
    );

    const rows = getAllByTestId(/^row-/);
    expect(rows).toHaveLength(12);
    expect(getByTestId('bridge-trending-show-more')).toBeTruthy();
  });

  it('loadNextChunkIfAvailable appends one chunk', () => {
    const ref = createRef<BridgeTrendingTokensSectionRef>();
    const { getAllByTestId } = render(
      <BridgeTrendingTokensSection ref={ref} />,
    );

    act(() => {
      ref.current?.loadNextChunkIfAvailable();
    });

    expect(getAllByTestId(/^row-/)).toHaveLength(24);
  });

  it('resets visible token count when dataset changes', () => {
    const ref = createRef<BridgeTrendingTokensSectionRef>();
    const { getAllByTestId, queryByTestId, rerender } = render(
      <BridgeTrendingTokensSection ref={ref} />,
    );

    act(() => {
      ref.current?.loadNextChunkIfAvailable();
    });
    expect(getAllByTestId(/^row-/)).toHaveLength(24);

    setupMocks(createTrendingTokens(8));
    rerender(<BridgeTrendingTokensSection ref={ref} />);

    expect(getAllByTestId(/^row-/)).toHaveLength(8);
    expect(queryByTestId('bridge-trending-show-more')).toBeNull();
  });

  it('does not append chunk while a bottom sheet is open', () => {
    const ref = createRef<BridgeTrendingTokensSectionRef>();
    const { getAllByTestId, getByTestId } = render(
      <BridgeTrendingTokensSection ref={ref} />,
    );

    fireEvent.press(getByTestId('bridge-trending-price-filter'));

    act(() => {
      ref.current?.loadNextChunkIfAvailable();
    });

    expect(getAllByTestId(/^row-/)).toHaveLength(12);
  });
});
