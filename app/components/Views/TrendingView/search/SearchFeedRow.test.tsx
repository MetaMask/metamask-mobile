import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import type { SiteData } from '../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import type { EarnSearchItem } from '../feeds/earn/earnSearchTypes';
import SearchFeedRow, {
  SearchFeedSkeleton,
  PERPS_ROW_WRAPPER_TEST_ID,
  getItemId,
  getTokenIdentityProperties,
  getPredictMarketProperties,
} from './SearchFeedRow';
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

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => false),
}));

jest.mock('./analytics', () => ({
  getSearchQueryLength: jest.requireActual('./analytics').getSearchQueryLength,
  trackExploreSearchEvent: jest.fn(),
}));

const mockOnQuickTrade = jest.fn();
const mockEarnSearchRow = jest.fn(
  ({
    item,
  }: {
    item: EarnSearchItem;
    position: number;
    resultCount?: number;
  }) => (
    <MockText
      testID={
        item.kind === 'money-account'
          ? 'stub-earn-money-row'
          : 'stub-earn-search-asset-row'
      }
    >
      {item.id}
    </MockText>
  ),
);

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

const mockSiteRowItemProps = jest.fn();
jest.mock('../feeds/sites/SiteRowItem', () => ({
  SiteRowItem: (props: { site: SiteData; entryPoint?: string }) => {
    mockSiteRowItemProps(props);
    return <MockText testID="stub-site-row">{props.site.url}</MockText>;
  },
}));

jest.mock('./EarnSearchRow', () => ({
  __esModule: true,
  default: (props: {
    item: EarnSearchItem;
    position: number;
    resultCount?: number;
  }) => mockEarnSearchRow(props),
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

const createEarnItem = (itemId: string): EarnSearchItem =>
  (itemId === 'money-account'
    ? { kind: 'money-account', id: itemId }
    : {
        kind: 'asset',
        id: itemId,
        asset: {},
      }) as unknown as EarnSearchItem;

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

      fireEvent.press(getByTestId('search-feed-tap'));

      expect(mockTrackExploreSearchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          interaction_type: 'result_clicked',
          search_query: 'q',
          section_name: feedId,
          tab_name: 'all',
          item_clicked: itemClicked,
          position: 2,
          query_length: 1,
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

  it('sends the trimmed query length at tap time on result_clicked', () => {
    const token = { assetId: 'asset-1' } as TrendingAsset;
    const { getByTestId, rerender } = render(
      <SearchFeedRow
        feedId="tokens"
        item={token}
        index={0}
        searchQuery="et"
        tabName="all"
      />,
    );

    rerender(
      <SearchFeedRow
        feedId="tokens"
        item={token}
        index={0}
        searchQuery="  eth  "
        tabName="all"
      />,
    );
    fireEvent.press(getByTestId('search-feed-tap'));

    expect(mockTrackExploreSearchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction_type: 'result_clicked',
        search_query: '  eth  ',
        query_length: 3,
      }),
    );
  });

  it.each([
    ['money-account', 'stub-earn-money-row'],
    ['eip155:1/erc20:usdc', 'stub-earn-search-asset-row'],
  ] as const)('renders Earn item %s', (itemId, rowTestId) => {
    const item = createEarnItem(itemId);

    const { getByTestId } = render(
      <SearchFeedRow
        feedId="earn"
        item={item}
        index={1}
        searchQuery="usdc"
        tabName="all"
      />,
    );

    expect(getByTestId(rowTestId)).toBeOnTheScreen();
  });

  it.each(['money-account', 'eip155:1/erc20:usdc'] as const)(
    'returns the stable item ID for Earn item %s',
    (itemId) => {
      const item = createEarnItem(itemId);

      expect(getItemId('earn', item)).toBe(itemId);
    },
  );

  it.each(['money-account', 'eip155:1/erc20:usdc'] as const)(
    'tracks the item ID when Earn item %s is tapped',
    (itemId) => {
      const item = createEarnItem(itemId);

      const { getByTestId } = render(
        <SearchFeedRow
          feedId="earn"
          item={item}
          index={1}
          searchQuery="usdc"
          tabName="all"
        />,
      );

      fireEvent.press(getByTestId('search-feed-tap'));

      expect(mockTrackExploreSearchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          section_name: 'earn',
          item_clicked: itemId,
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

  it('passes one-based position and Earn result count to Earn rows', () => {
    const item = createEarnItem('eip155:1/erc20:usdc');

    render(
      <SearchFeedRow
        feedId="earn"
        item={item}
        index={1}
        resultCount={4}
        searchQuery="usdc"
        tabName="earn"
      />,
    );

    expect(mockEarnSearchRow).toHaveBeenCalledWith({
      item,
      position: 2,
      resultCount: 4,
    });
  });

  it('omits Earn result count outside the Earn tab', () => {
    const item = createEarnItem('eip155:1/erc20:usdc');

    render(
      <SearchFeedRow
        feedId="earn"
        item={item}
        index={1}
        resultCount={4}
        searchQuery="usdc"
        tabName="all"
      />,
    );

    expect(mockEarnSearchRow).toHaveBeenCalledWith({
      item,
      position: 2,
      resultCount: undefined,
    });
  });
});

const PREDICT_MARKET_KEYS = [
  'market_id',
  'market_slug',
  'market_tags',
  'market_title',
] as const;

describe('Predict market properties on result_clicked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes market identity props when a prediction row is tapped', () => {
    const market = {
      id: 'pred-9',
      slug: 'lakers-vs-celtics',
      title: 'Lakers vs Celtics',
      tags: ['nba', 'playoffs'],
    } as PredictMarketType;

    const { getByTestId } = render(
      <SearchFeedRow
        feedId="predictions"
        item={market}
        index={1}
        searchQuery="lakers"
        tabName="predictions"
        resultCount={4}
      />,
    );

    fireEvent.press(getByTestId('search-feed-tap'));

    expect(mockTrackExploreSearchEvent).toHaveBeenCalledWith({
      interaction_type: 'result_clicked',
      search_query: 'lakers',
      tab_name: 'predictions',
      item_clicked: 'pred-9',
      position: 1,
      result_count: 4,
      query_length: 6,
      market_id: 'pred-9',
      market_slug: 'lakers-vs-celtics',
      market_tags: ['nba', 'playoffs'],
      market_title: 'Lakers vs Celtics',
    });
  });

  it.each([
    ['tokens', { assetId: 'asset-1' } as TrendingAsset],
    ['perps', { symbol: 'ETH' } as PerpsMarketData],
    ['sites', { url: 'https://example.com' } as SiteData],
  ] as const)('omits market props when a %s row is tapped', (feedId, item) => {
    const { getByTestId } = render(
      <SearchFeedRow
        feedId={feedId}
        item={item}
        index={0}
        searchQuery="q"
        tabName="all"
      />,
    );

    fireEvent.press(getByTestId('search-feed-tap'));

    const payload = mockTrackExploreSearchEvent.mock.calls[0][0];
    PREDICT_MARKET_KEYS.forEach((key) => {
      expect(payload).not.toHaveProperty(key);
    });
  });
});

describe('getPredictMarketProperties', () => {
  it('returns market identity props for the predictions feed', () => {
    const market = {
      id: 'pred-9',
      slug: 'btc-100k',
      title: 'BTC above 100k?',
      tags: ['crypto'],
    } as PredictMarketType;

    expect(getPredictMarketProperties('predictions', market)).toStrictEqual({
      market_id: 'pred-9',
      market_slug: 'btc-100k',
      market_tags: ['crypto'],
      market_title: 'BTC above 100k?',
    });
  });

  it('omits slug and tags when the market is missing them', () => {
    const market = {
      id: 'pred-9',
      title: 'BTC above 100k?',
    } as PredictMarketType;

    expect(getPredictMarketProperties('predictions', market)).toStrictEqual({
      market_id: 'pred-9',
      market_title: 'BTC above 100k?',
    });
  });

  it.each(['tokens', 'stocks', 'perps', 'sites', 'earn'] as const)(
    'returns an empty object for the %s feed',
    (feedId) => {
      const market = {
        id: 'pred-9',
        slug: 'btc-100k',
        title: 'BTC above 100k?',
        tags: ['crypto'],
      } as PredictMarketType;

      expect(getPredictMarketProperties(feedId, market)).toStrictEqual({});
    },
  );
});

describe('perps row alignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels the list container padding so perps rows align with other feeds', () => {
    const perpsMarket = { symbol: 'ETH' } as PerpsMarketData;

    const { getByTestId } = render(
      <SearchFeedRow
        feedId="perps"
        item={perpsMarket}
        index={0}
        searchQuery="q"
        tabName="perps"
      />,
    );

    expect(getByTestId(PERPS_ROW_WRAPPER_TEST_ID)).toHaveStyle({
      marginLeft: -16,
      marginRight: -16,
    });
  });

  it.each(['tokens', 'stocks', 'predictions', 'sites'] as const)(
    'does not wrap %s rows, which rely on the container padding',
    (feedId) => {
      const itemByFeed = {
        tokens: { assetId: 'asset-1' } as TrendingAsset,
        stocks: { assetId: 'asset-2' } as TrendingAsset,
        predictions: { id: 'pred-9' } as PredictMarketType,
        sites: { url: 'https://example.com' } as SiteData,
      }[feedId];

      const { queryByTestId } = render(
        <SearchFeedRow
          feedId={feedId}
          item={itemByFeed}
          index={0}
          searchQuery="q"
          tabName={feedId}
        />,
      );

      expect(queryByTestId(PERPS_ROW_WRAPPER_TEST_ID)).toBeNull();
    },
  );
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

describe('token identity analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['tokens', 'stocks'] as const)(
    'returns token_name and token_symbol for %s',
    (feedId) => {
      const token = {
        assetId: 'asset-1',
        name: 'Ether',
        symbol: 'ETH',
      } as TrendingAsset;

      expect(getTokenIdentityProperties(feedId, token)).toStrictEqual({
        token_name: 'Ether',
        token_symbol: 'ETH',
      });
    },
  );

  it('omits token_name and token_symbol when the asset values are missing', () => {
    const token = { assetId: 'asset-1', name: '' } as TrendingAsset;

    expect(getTokenIdentityProperties('tokens', token)).toStrictEqual({});
  });

  it.each([
    ['perps', { symbol: 'ETH', name: 'Ethereum' }],
    ['predictions', { id: 'pred-9' }],
    ['sites', { url: 'https://example.com', name: 'Example' }],
    ['earn', { kind: 'money-account', id: 'money-account' }],
  ] as const)('returns an empty object for %s', (feedId, item) => {
    expect(getTokenIdentityProperties(feedId, item)).toStrictEqual({});
  });

  it.each([
    ['tokens', 'eip155:1/slip44:60', 'Ether', 'ETH'],
    ['stocks', 'eip155:1/erc20:0xaapl', 'Apple', 'AAPL'],
  ] as const)(
    'tracks token_name and token_symbol when a %s row is tapped',
    (feedId, assetId, name, symbol) => {
      const token = { assetId, name, symbol } as TrendingAsset;

      const { getByTestId } = render(
        <SearchFeedRow
          feedId={feedId}
          item={token}
          index={3}
          searchQuery="q"
          tabName="all"
          resultCount={10}
        />,
      );

      fireEvent.press(getByTestId('search-feed-tap'));

      expect(mockTrackExploreSearchEvent).toHaveBeenCalledWith({
        interaction_type: 'result_clicked',
        search_query: 'q',
        section_name: feedId,
        tab_name: 'all',
        item_clicked: assetId,
        position: 3,
        result_count: 10,
        query_length: 1,
        token_name: name,
        token_symbol: symbol,
      });
    },
  );

  it.each([
    ['perps', { symbol: 'ETH', name: 'Ethereum' } as PerpsMarketData, 'ETH'],
    ['predictions', { id: 'pred-9' } as PredictMarketType, 'pred-9'],
    [
      'sites',
      { url: 'https://example.com', name: 'Example' } as SiteData,
      'https://example.com',
    ],
  ] as const)(
    'does not track token identity when a %s row is tapped',
    (feedId, item, itemClicked) => {
      const { getByTestId } = render(
        <SearchFeedRow
          feedId={feedId}
          item={item}
          index={0}
          searchQuery="q"
          tabName="all"
        />,
      );

      fireEvent.press(getByTestId('search-feed-tap'));

      const payload = mockTrackExploreSearchEvent.mock.calls[0][0];
      expect(payload.item_clicked).toBe(itemClicked);
      expect(payload).not.toHaveProperty('token_name');
      expect(payload).not.toHaveProperty('token_symbol');
    },
  );
});

describe('SearchFeedSkeleton', () => {
  it('uses site skeleton for sites and predictions', () => {
    const { getByTestId, rerender } = render(
      <SearchFeedSkeleton feedId="sites" />,
    );
    expect(getByTestId('stub-site-skeleton')).toBeOnTheScreen();

    rerender(<SearchFeedSkeleton feedId="predictions" />);
    expect(getByTestId('stub-site-skeleton')).toBeOnTheScreen();
  });

  it('uses token skeleton for tokens, stocks, and perps', () => {
    const { getByTestId, rerender } = render(
      <SearchFeedSkeleton feedId="tokens" />,
    );
    expect(getByTestId('stub-trending-token-skeleton')).toBeOnTheScreen();

    rerender(<SearchFeedSkeleton feedId="stocks" />);
    expect(getByTestId('stub-trending-token-skeleton')).toBeOnTheScreen();

    rerender(<SearchFeedSkeleton feedId="perps" />);
    expect(getByTestId('stub-trending-token-skeleton')).toBeOnTheScreen();
  });

  it('uses the Earn row skeleton for Earn', () => {
    const { getByTestId } = render(<SearchFeedSkeleton feedId="earn" />);

    expect(getByTestId('stub-trending-token-skeleton')).toBeOnTheScreen();
  });
});

describe('SearchFeedRow site rows', () => {
  it('tags browser tabs opened from Search site rows with explore_search', () => {
    render(
      <SearchFeedRow
        feedId="sites"
        item={{ url: 'https://app.uniswap.org' }}
        index={0}
        searchQuery="uni"
        tabName="all"
      />,
    );

    expect(mockSiteRowItemProps).toHaveBeenCalledWith(
      expect.objectContaining({ entryPoint: 'explore_search' }),
    );
  });
});
