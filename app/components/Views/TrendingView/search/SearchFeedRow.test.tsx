import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import type { SiteData } from '../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import SearchFeedRow, {
  SearchFeedSkeleton,
  CryptoMoversFeedSearchRow,
} from './SearchFeedRow';
import { trackExploreEvent } from './analytics';

const MockPressable = Pressable;
const MockText = Text;

jest.mock('./TapView', () => ({
  __esModule: true,
  default: ({
    children,
    onTap,
  }: {
    children: React.ReactNode;
    onTap?: () => void;
  }) => (
    <MockPressable testID="search-feed-tap" onPress={onTap}>
      {children}
    </MockPressable>
  ),
}));

jest.mock('./analytics', () => ({
  trackExploreEvent: jest.fn(),
}));

jest.mock('../feeds/tokens/TokenRowItem', () => ({
  TokenSearchRowItem: ({ token }: { token: TrendingAsset }) => (
    <MockText testID="stub-token-row">{token.assetId}</MockText>
  ),
  CryptoMoversSearchRowItem: ({ token }: { token: TrendingAsset }) => (
    <MockText testID="stub-crypto-movers-search">{token.assetId}</MockText>
  ),
}));

jest.mock('../feeds/perps/PerpsRowItem', () => ({
  __esModule: true,
  default: ({ market }: { market: PerpsMarketData }) => (
    <MockText testID="stub-perps-row">{market.symbol}</MockText>
  ),
}));

jest.mock('../feeds/predictions/PredictionRowItem', () => ({
  PredictionSearchRowItem: ({ market }: { market: PredictMarketType }) => (
    <MockText testID="stub-predict-row">{market.id}</MockText>
  ),
}));

jest.mock('../feeds/sites/SiteRowItem', () => ({
  SiteRowItem: ({ site }: { site: SiteData }) => (
    <MockText testID="stub-site-row">{site.url}</MockText>
  ),
}));

jest.mock(
  '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => ({
    __esModule: true,
    default: () => (
      <MockText testID="stub-trending-token-skeleton">sk</MockText>
    ),
  }),
);

jest.mock('../../../UI/Sites/components/SiteSkeleton/SiteSkeleton', () => ({
  __esModule: true,
  default: () => <MockText testID="stub-site-skeleton">sk</MockText>,
}));

const mockTrackExploreEvent = trackExploreEvent as jest.MockedFunction<
  typeof trackExploreEvent
>;

describe('SearchFeedRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['tokens', 'asset-1', 'stub-token-row'],
    ['stocks', 'asset-2', 'stub-token-row'],
    ['perps', 'ETH', 'stub-perps-row'],
    ['predictions', 'pred-9', 'stub-predict-row'],
    ['sites', 'https://example.com', 'stub-site-row'],
  ] as const)(
    'renders the row for feedId %s and sends analytics with the correct item id on tap',
    (feedId, itemClicked, rowTestId) => {
      const token = { assetId: 'asset-1' } as TrendingAsset;
      const perpsMarket = { symbol: 'ETH' } as PerpsMarketData;
      const predict = { id: 'pred-9' } as PredictMarketType;
      const site = { url: 'https://example.com' } as SiteData;

      const itemByFeed = {
        tokens: token,
        stocks: { assetId: 'asset-2' } as TrendingAsset,
        perps: perpsMarket,
        predictions: predict,
        sites: site,
      }[feedId];

      const { getByTestId } = render(
        <SearchFeedRow
          feedId={feedId}
          item={itemByFeed}
          index={0}
          searchQuery="q"
          sectionTitle="Tokens"
          interactionType="row_tap"
        />,
      );

      expect(getByTestId(rowTestId)).toBeTruthy();
      fireEvent.press(getByTestId('search-feed-tap'));

      expect(mockTrackExploreEvent).toHaveBeenCalledWith(
        MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED,
        expect.objectContaining({
          interaction_type: 'row_tap',
          search_query: 'q',
          section_name: 'Tokens',
          item_clicked: itemClicked,
        }),
      );
    },
  );

  it('uses latest searchQuery from ref when tap fires', () => {
    const token = { assetId: 'x' } as TrendingAsset;
    const { getByTestId, rerender } = render(
      <SearchFeedRow
        feedId="tokens"
        item={token}
        index={0}
        searchQuery="first"
        sectionTitle="S"
        interactionType="t"
      />,
    );

    rerender(
      <SearchFeedRow
        feedId="tokens"
        item={token}
        index={0}
        searchQuery="second"
        sectionTitle="S"
        interactionType="t"
      />,
    );

    fireEvent.press(getByTestId('search-feed-tap'));

    expect(mockTrackExploreEvent).toHaveBeenCalledWith(
      MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED,
      expect.objectContaining({ search_query: 'second' }),
    );
  });
});

describe('SearchFeedSkeleton', () => {
  it('uses site skeleton for sites and predictions', () => {
    const { getByTestId, rerender } = render(
      <SearchFeedSkeleton feedId="sites" />,
    );
    expect(getByTestId('stub-site-skeleton')).toBeTruthy();

    rerender(<SearchFeedSkeleton feedId="predictions" />);
    expect(getByTestId('stub-site-skeleton')).toBeTruthy();
  });

  it('uses token skeleton for tokens, stocks, and perps', () => {
    const { getByTestId, rerender } = render(
      <SearchFeedSkeleton feedId="tokens" />,
    );
    expect(getByTestId('stub-trending-token-skeleton')).toBeTruthy();

    rerender(<SearchFeedSkeleton feedId="stocks" />);
    expect(getByTestId('stub-trending-token-skeleton')).toBeTruthy();

    rerender(<SearchFeedSkeleton feedId="perps" />);
    expect(getByTestId('stub-trending-token-skeleton')).toBeTruthy();
  });
});

describe('CryptoMoversFeedSearchRow', () => {
  it('renders CryptoMoversSearchRowItem with token and index', () => {
    const token = { assetId: 'btc', symbol: 'BTC' } as TrendingAsset;
    const { getByTestId } = render(
      <CryptoMoversFeedSearchRow token={token} index={2} />,
    );

    expect(getByTestId('stub-crypto-movers-search').props.children).toBe('btc');
  });
});
