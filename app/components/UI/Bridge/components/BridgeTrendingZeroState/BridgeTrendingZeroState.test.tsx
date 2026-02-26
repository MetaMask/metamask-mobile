import { TrendingAsset } from '@metamask/assets-controllers';
import { act, render } from '@testing-library/react-native';
import React, { createRef } from 'react';
import BridgeTrendingZeroState, {
  BridgeTrendingZeroStateRef,
} from './BridgeTrendingZeroState';
import BridgeTrendingTokensSection from '../BridgeTrendingTokensSection/BridgeTrendingTokensSection';
import { useBridgeTrendingTokens } from '../../hooks/useBridgeTrendingTokens/useBridgeTrendingTokens';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ({})),
}));

jest.mock(
  '../../hooks/useBridgeTrendingTokens/useBridgeTrendingTokens',
  () => ({
    useBridgeTrendingTokens: jest.fn(),
  }),
);

jest.mock('../BridgeTrendingTokensSection/BridgeTrendingTokensSection', () =>
  jest.fn(() => null),
);

jest.mock('../../../Trending/components/TrendingTokensBottomSheet', () => ({
  TrendingTokenTimeBottomSheet: () => null,
  TrendingTokenNetworkBottomSheet: () => null,
  TrendingTokenPriceChangeBottomSheet: () => null,
}));

const mockUseBridgeTrendingTokens = useBridgeTrendingTokens as jest.Mock;
const mockBridgeTrendingTokensSection =
  BridgeTrendingTokensSection as jest.Mock;

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

const buildHookResult = (trendingTokens: TrendingAsset[]) => ({
  sortBy: undefined,
  selectedTimeOption: '24h',
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
  trendingTokens,
  isLoading: false,
  handlePriceChangeSelect: jest.fn(),
  handleNetworkSelect: jest.fn(),
  handleTimeSelect: jest.fn(),
});

const getLatestSectionProps = () => {
  const latestCall = mockBridgeTrendingTokensSection.mock.calls.at(-1);
  if (!latestCall) {
    throw new Error('BridgeTrendingTokensSection was not rendered');
  }
  return latestCall[0];
};

describe('BridgeTrendingZeroState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBridgeTrendingTokens.mockReturnValue(
      buildHookResult(createTrendingTokens(30)),
    );
  });

  it('renders 12 tokens initially and reports more rows available', () => {
    render(<BridgeTrendingZeroState />);

    const props = getLatestSectionProps();
    expect(props.trendingTokens).toHaveLength(12);
    expect(props.hasMore).toBe(true);
  });

  it('loadNextChunkIfAvailable appends one chunk', () => {
    const ref = createRef<BridgeTrendingZeroStateRef>();
    render(<BridgeTrendingZeroState ref={ref} />);

    act(() => {
      ref.current?.loadNextChunkIfAvailable();
    });

    expect(getLatestSectionProps().trendingTokens).toHaveLength(24);
  });

  it('resets visible token count when dataset changes', () => {
    const ref = createRef<BridgeTrendingZeroStateRef>();
    const { rerender } = render(<BridgeTrendingZeroState ref={ref} />);

    act(() => {
      ref.current?.loadNextChunkIfAvailable();
    });
    expect(getLatestSectionProps().trendingTokens).toHaveLength(24);

    mockUseBridgeTrendingTokens.mockReturnValue(
      buildHookResult(createTrendingTokens(8)),
    );
    rerender(<BridgeTrendingZeroState ref={ref} />);

    const props = getLatestSectionProps();
    expect(props.trendingTokens).toHaveLength(8);
    expect(props.hasMore).toBe(false);
  });

  it('does not append chunk while a bottom sheet is open', () => {
    const ref = createRef<BridgeTrendingZeroStateRef>();
    render(<BridgeTrendingZeroState ref={ref} />);

    act(() => {
      getLatestSectionProps().onPriceChangePress();
    });
    expect(getLatestSectionProps().trendingTokens).toHaveLength(12);

    act(() => {
      ref.current?.loadNextChunkIfAvailable();
    });

    expect(getLatestSectionProps().trendingTokens).toHaveLength(12);
  });
});
