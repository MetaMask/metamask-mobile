import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { TimeOption } from '../../../Trending/components/TrendingTokensBottomSheet';
import Routes from '../../../../../constants/navigation/Routes';
import SwapDiscoveryFeed from './SwapDiscoveryFeed';
import { SwapDiscoveryFeedTestIds } from './SwapDiscoveryFeed.testIds';

const mockNavigate = jest.fn();
const mockTrackExploreInteracted = jest.fn();
const mockUseTokensFeed = jest.fn();
const mockUseStocksFeed = jest.fn();
const mockExploreSectionList = jest.fn();
const mockCryptoMoversPillItem = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../Views/TrendingView/search/analytics', () => ({
  trackExploreInteracted: (...args: unknown[]) =>
    mockTrackExploreInteracted(...args),
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

jest.mock('../../../../Views/TrendingView/components/PillScrollList', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      data,
      renderItem,
    }: {
      data: TrendingAsset[];
      renderItem: (item: TrendingAsset, index: number) => React.ReactNode;
    }) =>
      ReactActual.createElement(
        View,
        null,
        data.map((item, index) =>
          ReactActual.createElement(
            View,
            { key: item.assetId ?? String(index) },
            renderItem(item, index),
          ),
        ),
      ),
  };
});

jest.mock('../../../../Views/TrendingView/components/CardList', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock(
  '../../../../Views/TrendingView/feeds/tokens/CryptoMoversPillItem',
  () => ({
    __esModule: true,
    default: (props: {
      token: TrendingAsset;
      index: number;
      onCardPress?: () => void;
    }) => {
      mockCryptoMoversPillItem(props);
      return null;
    },
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

const hotToken = {
  assetId: 'eip155:1/erc20:0xhot',
  symbol: 'HOT',
} as unknown as TrendingAsset;

const trendingToken = {
  assetId: 'eip155:1/erc20:0xtrend',
  symbol: 'TRND',
} as unknown as TrendingAsset;

const stockToken = {
  assetId: 'eip155:1/erc20:0xstock',
  symbol: 'STK',
} as unknown as TrendingAsset;

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
) =>
  render(
    <NavigationContainer>
      <SwapDiscoveryFeed {...props} />
    </NavigationContainer>,
  );

describe('SwapDiscoveryFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTokensFeed.mockReset();
    mockUseStocksFeed.mockReset();
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

  it('navigates view-all and tracks item taps with swap source and no tab', () => {
    const { getByTestId } = renderFeed({ mode: 'discovery_feed' });

    fireEvent.press(getByTestId(SwapDiscoveryFeedTestIds.HOT_TOKENS_VIEW_ALL));
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      { initialTimeOption: TimeOption.OneHour },
    );
    expect(mockTrackExploreInteracted).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_type: 'section_see_all_tapped',
        section_name: 'tokens_movers',
        source: 'swaps',
      }),
    );
    expect(mockTrackExploreInteracted.mock.calls[0][0]).not.toHaveProperty(
      'tab_name',
    );

    const pillProps = mockCryptoMoversPillItem.mock.calls[0][0];
    pillProps.onCardPress();

    expect(mockTrackExploreInteracted).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_type: 'section_item_tapped',
        section_name: 'tokens_movers',
        asset_type: 'token',
        position: 0,
        token_symbol: hotToken.symbol,
        item_clicked: hotToken.assetId,
        source: 'swaps',
      }),
    );
    expect(mockTrackExploreInteracted.mock.calls[1][0]).not.toHaveProperty(
      'tab_name',
    );
  });
});
