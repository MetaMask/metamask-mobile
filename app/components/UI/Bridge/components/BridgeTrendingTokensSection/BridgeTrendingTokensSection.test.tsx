import { TrendingAsset } from '@metamask/assets-controllers';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import BridgeTrendingTokensSection from './BridgeTrendingTokensSection';
import { useTokenListFilters } from '../../../Trending/hooks/useTokenListFilters/useTokenListFilters';
import { useTrendingRequest } from '../../../Trending/hooks/useTrendingRequest/useTrendingRequest';
import { BridgeTrendingTokensSectionTestIds } from './BridgeTrendingTokensSection.testIds';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ({})),
}));

jest.mock(
  '../../../Trending/hooks/useTokenListFilters/useTokenListFilters',
  () => ({
    useTokenListFilters: jest.fn(),
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
    const ReactLib = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ token }: { token: { assetId: string } }) =>
        ReactLib.createElement(View, { testID: `row-${token.assetId}` }),
    };
  },
);

jest.mock(
  '../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => {
    const ReactLib = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => ReactLib.createElement(View, { testID: 'skeleton-row' }),
    };
  },
);

jest.mock('../../../Trending/components/TrendingTokensBottomSheet', () => ({
  TrendingTokenTimeBottomSheet: () => null,
  TrendingTokenNetworkBottomSheet: () => null,
  TrendingTokenPriceChangeBottomSheet: () => null,
  mapTimeOptionToSortBy: jest.fn(() => 'h24_trending'),
}));

const mockUseTokenListFilters = useTokenListFilters as jest.Mock;
const mockUseTrendingRequest = useTrendingRequest as jest.Mock;

const createTrendingTokens = (count: number): TrendingAsset[] =>
  Array.from({ length: count }, (_, index) => ({
    assetId: `eip155:1/erc20:0x${(index + 1).toString(16).padStart(40, '0')}`,
    symbol: `T${index + 1}`,
    name: `Token ${index + 1}`,
    decimals: 18,
    price: `${index + 1}`,
    aggregatedUsdVolume: index + 1,
    marketCap: index + 1,
    priceChangePct: {
      h24: `${index + 1}`,
      h6: `${index + 1}`,
      h1: `${index + 1}`,
      m5: `${index + 1}`,
    },
  }));

const setupMocks = (tokens: TrendingAsset[], isLoading = false) => {
  mockUseTokenListFilters.mockReturnValue({
    selectedTimeOption: '24h',
    setSelectedTimeOption: jest.fn(),
    selectedNetwork: null,
    selectedPriceChangeOption: 'price_change',
    priceChangeSortDirection: 'descending',
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
    expect(
      getByTestId(BridgeTrendingTokensSectionTestIds.SHOW_MORE),
    ).toBeTruthy();
  });

  it('appends one chunk when isNearBottom becomes true', () => {
    const { getAllByTestId, rerender } = render(
      <BridgeTrendingTokensSection />,
    );

    rerender(<BridgeTrendingTokensSection isNearBottom />);

    expect(getAllByTestId(/^row-/)).toHaveLength(24);
  });

  it('resets visible token count when dataset changes', () => {
    const { getAllByTestId, queryByTestId, rerender } = render(
      <BridgeTrendingTokensSection />,
    );

    rerender(<BridgeTrendingTokensSection isNearBottom />);
    expect(getAllByTestId(/^row-/)).toHaveLength(24);

    setupMocks(createTrendingTokens(8));
    rerender(<BridgeTrendingTokensSection />);

    expect(getAllByTestId(/^row-/)).toHaveLength(8);
    expect(
      queryByTestId(BridgeTrendingTokensSectionTestIds.SHOW_MORE),
    ).toBeNull();
  });

  it('does not append chunk while a bottom sheet is open', () => {
    const { getAllByTestId, getByTestId, rerender } = render(
      <BridgeTrendingTokensSection />,
    );

    fireEvent.press(
      getByTestId(BridgeTrendingTokensSectionTestIds.PRICE_FILTER),
    );

    rerender(<BridgeTrendingTokensSection isNearBottom />);

    expect(getAllByTestId(/^row-/)).toHaveLength(12);
  });
});
