import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import type { SiteData } from '../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import SearchFeedRow, { SearchFeedSkeleton } from './SearchFeedRow';
import { trackExploreSearchEvent } from './analytics';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';

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
  trackExploreSearchEvent: jest.fn(),
}));

const mockOnQuickTrade = jest.fn();

jest.mock('../feeds/tokens/TokenRowItem', () => ({
  TokenSearchRowItem: ({
    token,
    tokenDetailsSource,
    onQuickTrade,
  }: {
    token: TrendingAsset;
    tokenDetailsSource?: TokenDetailsSource;
    onQuickTrade?: (t: TrendingAsset) => void;
  }) => (
    <MockPressable
      testID="stub-token-row"
      accessibilityLabel={tokenDetailsSource}
      onPress={() => onQuickTrade?.(token)}
    >
      <MockText>{token.assetId}</MockText>
    </MockPressable>
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

const mockTrackExploreSearchEvent =
  trackExploreSearchEvent as jest.MockedFunction<
    typeof trackExploreSearchEvent
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
          index={2}
          searchQuery="q"
          tabName="all"
        />,
      );

      expect(getByTestId(rowTestId)).toBeTruthy();
      fireEvent.press(getByTestId('search-feed-tap'));

      expect(mockTrackExploreSearchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: 'result_clicked',
          search_query: 'q',
          section_name: feedId,
          tab_name: 'all',
          item_clicked: itemClicked,
          position: 2,
        }),
      );
    },
  );

  it.each(['tokens', 'stocks'] as const)(
    'passes explore_search tokenDetailsSource for %s feed',
    (feedId) => {
      const token = { assetId: 'asset-1' } as TrendingAsset;

      const { getByTestId } = render(
        <SearchFeedRow
          feedId={feedId}
          item={token}
          index={0}
          searchQuery="q"
          tabName="all"
        />,
      );

      expect(getByTestId('stub-token-row').props.accessibilityLabel).toBe(
        TokenDetailsSource.ExploreSearch,
      );
    },
  );

  it('omits section_name on result_clicked when not on the All tab', () => {
    const token = { assetId: 'asset-1' } as TrendingAsset;
    const { getByTestId } = render(
      <SearchFeedRow
        feedId="tokens"
        item={token}
        index={0}
        searchQuery="q"
        tabName="tokens"
      />,
    );

    fireEvent.press(getByTestId('search-feed-tap'));

    expect(mockTrackExploreSearchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_type: 'result_clicked',
        tab_name: 'tokens',
        item_clicked: 'asset-1',
        position: 0,
      }),
    );
    const payload = mockTrackExploreSearchEvent.mock.calls[0][0];
    expect(payload).not.toHaveProperty('section_name');
  });

  it('uses latest searchQuery from ref when tap fires', () => {
    const token = { assetId: 'x' } as TrendingAsset;
    const { getByTestId, rerender } = render(
      <SearchFeedRow
        feedId="tokens"
        item={token}
        index={0}
        searchQuery="first"
        tabName="all"
      />,
    );

    rerender(
      <SearchFeedRow
        feedId="tokens"
        item={token}
        index={0}
        searchQuery="second"
        tabName="all"
      />,
    );

    fireEvent.press(getByTestId('search-feed-tap'));

    expect(mockTrackExploreSearchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ search_query: 'second' }),
    );
  });
});

describe('onQuickTrade prop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards onQuickTrade to TokenSearchRowItem for the tokens feed', () => {
    const token = { assetId: 'eip155:1/erc20:0xabc' } as TrendingAsset;

    const { getByTestId } = render(
      <SearchFeedRow
        feedId="tokens"
        item={token}
        index={0}
        searchQuery="q"
        tabName="all"
        onQuickTrade={mockOnQuickTrade}
      />,
    );

    fireEvent.press(getByTestId('stub-token-row'));
    expect(mockOnQuickTrade).toHaveBeenCalledWith(token);
  });

  it('forwards onQuickTrade to TokenSearchRowItem for the stocks feed', () => {
    const token = { assetId: 'eip155:1/erc20:0xabc' } as TrendingAsset;

    const { getByTestId } = render(
      <SearchFeedRow
        feedId="stocks"
        item={token}
        index={0}
        searchQuery="q"
        tabName="all"
        onQuickTrade={mockOnQuickTrade}
      />,
    );

    fireEvent.press(getByTestId('stub-token-row'));
    expect(mockOnQuickTrade).toHaveBeenCalledWith(token);
  });

  it('renders tokens feed without onQuickTrade when prop is not provided', () => {
    const token = { assetId: 'eip155:1/erc20:0xabc' } as TrendingAsset;

    const { getByTestId } = render(
      <SearchFeedRow
        feedId="tokens"
        item={token}
        index={0}
        searchQuery="q"
        tabName="all"
      />,
    );

    // pressing does not call anything (no handler wired)
    fireEvent.press(getByTestId('stub-token-row'));
    expect(mockOnQuickTrade).not.toHaveBeenCalled();
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
