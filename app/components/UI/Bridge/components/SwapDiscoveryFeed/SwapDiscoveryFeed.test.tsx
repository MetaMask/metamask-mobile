import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { TimeOption } from '../../../Trending/components/TrendingTokensBottomSheet';
import Routes from '../../../../../constants/navigation/Routes';
import SwapDiscoveryFeed from './SwapDiscoveryFeed';
import { SwapDiscoveryFeedTestIds } from './SwapDiscoveryFeed.testIds';

const mockNavigate = jest.fn();
const mockUseTokensFeed = jest.fn();
const mockUseStocksFeed = jest.fn();
const mockExploreSectionList = jest.fn();
const mockCardList = jest.fn();
const mockPillScrollList = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../Views/TrendingView/feeds/tokens/useTokensFeed', () => ({
  useTokensFeed: () => mockUseTokensFeed(),
}));

jest.mock('../../../../Views/TrendingView/feeds/stocks/useStocksFeed', () => ({
  STOCKS_FEED_PREVIEW_PAGE_SIZE: 3,
  useStocksFeed: () => mockUseStocksFeed(),
}));

jest.mock(
  '../../../../Views/TrendingView/components/ExploreSectionList',
  () => ({
    __esModule: true,
    default: (props: {
      sections: { key: string; content: React.ReactNode }[];
    }) => {
      mockExploreSectionList(props);
      const ReactActual = jest.requireActual('react');
      const { View } = jest.requireActual('react-native');
      return ReactActual.createElement(
        View,
        null,
        props.sections[0]?.content ?? null,
      );
    },
  }),
);

jest.mock('../../../../Views/TrendingView/components/SectionHeader', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onViewAll,
      testID,
    }: {
      onViewAll: () => void;
      testID?: string;
    }) => ReactActual.createElement(Pressable, { testID, onPress: onViewAll }),
  };
});

jest.mock('../../../../Views/TrendingView/components/PillScrollList', () => ({
  __esModule: true,
  default: (props: { isLoading: boolean; listTestId?: string }) => {
    mockPillScrollList(props);
    return null;
  },
}));

jest.mock('../../../../Views/TrendingView/components/CardList', () => ({
  __esModule: true,
  default: (props: { isLoading: boolean; listTestId?: string }) => {
    mockCardList(props);
    return null;
  },
}));

jest.mock(
  '../../../../Views/TrendingView/feeds/tokens/CryptoMoversPillItem',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

jest.mock('../../../../Views/TrendingView/feeds/tokens/TokenRowItem', () => ({
  TokenRowItem: () => null,
}));

jest.mock(
  '../../../../Views/TrendingView/feeds/tokens/CryptoMoversSkeleton',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);
jest.mock(
  '../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

const feedToken = (assetId: string, symbol: string) =>
  ({ assetId, symbol }) as unknown as TrendingAsset;

const hotToken = feedToken('eip155:1/erc20:0xhot', 'HOT');
const trendingToken = feedToken('eip155:1/erc20:0xtrend', 'TRND');
const stockToken = feedToken('eip155:1/erc20:0xstock', 'STK');

const seedFeeds = () => {
  mockUseTokensFeed
    .mockReturnValueOnce({ data: [hotToken], isLoading: false })
    .mockReturnValueOnce({ data: [trendingToken], isLoading: false });
  mockUseStocksFeed.mockReturnValue({ data: [stockToken], isLoading: false });
};

const renderFeed = (
  props: React.ComponentProps<typeof SwapDiscoveryFeed> = {
    mode: 'discovery_feed',
  },
) => render(<SwapDiscoveryFeed {...props} />);

describe('SwapDiscoveryFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTokensFeed.mockReset();
    mockUseStocksFeed.mockReset();
    mockCardList.mockReset();
    mockPillScrollList.mockReset();
    seedFeeds();
  });

  it('builds ordered sections and returns null when all feeds are empty', () => {
    renderFeed({ mode: 'discovery_feed' });

    expect(mockExploreSectionList).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: [
          expect.objectContaining({ key: 'hot_tokens' }),
          expect.objectContaining({ key: 'trending' }),
          expect.objectContaining({ key: 'stocks' }),
        ],
      }),
    );

    mockUseTokensFeed.mockReset();
    mockUseTokensFeed
      .mockReturnValueOnce({ data: [], isLoading: false })
      .mockReturnValueOnce({ data: [], isLoading: false });
    mockUseStocksFeed.mockReturnValue({ data: [], isLoading: false });

    const { queryByTestId } = renderFeed({ mode: 'discovery_feed' });

    expect(queryByTestId(SwapDiscoveryFeedTestIds.ROOT)).toBeNull();
    expect(mockExploreSectionList).toHaveBeenCalledTimes(1);
  });

  it('renders a trending section with loading skeleton when feed data is empty and isLoading is true', () => {
    mockUseTokensFeed.mockReset();
    mockUseTokensFeed
      .mockReturnValueOnce({ data: [], isLoading: false })
      .mockReturnValueOnce({ data: [], isLoading: true });
    mockUseStocksFeed.mockReturnValue({ data: [], isLoading: false });

    renderFeed({ mode: 'discovery_feed' });

    expect(mockExploreSectionList).toHaveBeenCalledWith(
      expect.objectContaining({
        sections: [expect.objectContaining({ key: 'trending' })],
      }),
    );
    expect(mockCardList).toHaveBeenCalledWith(
      expect.objectContaining({
        isLoading: true,
        data: [],
        listTestId: SwapDiscoveryFeedTestIds.TRENDING_LIST,
      }),
    );
  });

  it('navigates hot tokens view-all to trending full view with one-hour filter', () => {
    const { getByTestId } = renderFeed({ mode: 'discovery_feed' });

    fireEvent.press(getByTestId(SwapDiscoveryFeedTestIds.HOT_TOKENS_VIEW_ALL));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      { initialTimeOption: TimeOption.OneHour },
    );
  });
});
