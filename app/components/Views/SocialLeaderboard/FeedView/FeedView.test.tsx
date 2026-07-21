import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import FeedView from './FeedView';
import {
  FeedViewSelectorsIDs,
  getFeedAudienceOptionTestId,
  getFeedTradeButtonTestId,
  getFeedTradeCardTestId,
  getFeedTraderTestId,
} from './FeedView.testIds';
import {
  TypeFilterSelectorsIDs,
  getTypeFilterOptionTestId,
} from '../components/TypeFilter';
import type { FeedItem, FeedSection, FeedTypeFilter } from './types';
import type { UseTraderFeedResult } from './hooks/useTraderFeed';

const mockNavigate = jest.fn();
const mockPlayImpact = jest.fn().mockResolvedValue(undefined);
const mockLoadMore = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(undefined);

const spotItem: FeedItem = {
  id: 'feed-1',
  type: 'spot',
  traderId: 'trader-1',
  username: 'dutchiono',
  traderAddress: '0x1111111111111111111111111111111111111111',
  action: 'bought',
  timestamp: Date.now() - 1000,
  subHeader: '$120K',
  valueLabel: '$123,000.5',
  pnlLabel: '+12%',
  hasValueData: true,
  hasPnlData: true,
  isPnlPositive: true,
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chain: 'eip155:1',
  chainIdHex: '0x1',
  tokenAvatar: {
    positionId: 'pos-feed-1',
    chain: 'ethereum',
    tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
    tokenImageUrl: null,
    tokenSymbol: 'PEPE',
  },
};

const perpItem: FeedItem = {
  id: 'feed-2',
  type: 'perps',
  traderId: 'trader-2',
  username: 'aparjey',
  traderAddress: '0x2222222222222222222222222222222222222222',
  action: 'closed',
  timestamp: Date.now() - 2000,
  subHeader: '$88K',
  valueLabel: '$88,000.5',
  pnlLabel: '+12%',
  hasValueData: true,
  hasPnlData: true,
  isPnlPositive: true,
  marketSymbol: 'ETH',
  marketName: 'Ethereum',
  tradeSymbol: 'ETH',
  direction: 'long',
  leverage: 8,
  tokenAvatar: {
    positionId: 'pos-feed-2',
    chain: 'hyperliquid',
    tokenAddress: '',
    tokenImageUrl: null,
    tokenSymbol: 'ETH',
  },
};

const buildResult = (
  overrides: Partial<UseTraderFeedResult> = {},
): UseTraderFeedResult => {
  const items = overrides.items ?? [spotItem, perpItem];
  const sections: FeedSection[] =
    overrides.sections ??
    (items.length ? [{ dateLabel: 'Today', data: items }] : []);
  return {
    items,
    sections,
    hasLoadedItems:
      overrides.hasLoadedItems ??
      (overrides.items ?? [spotItem, perpItem]).length > 0,
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: mockLoadMore,
    error: null,
    refresh: mockRefresh,
    ...overrides,
  };
};

let mockFeedResult: UseTraderFeedResult = buildResult();

jest.mock('./hooks/useTraderFeed', () => ({
  useTraderFeed: () => mockFeedResult,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../util/haptics', () => ({
  playImpact: () => mockPlayImpact(),
  playSelection: jest.fn().mockResolvedValue(undefined),
  ImpactMoment: { PrimaryCTA: 'primaryCta' },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockTrack = jest.fn();
jest.mock('../analytics', () => {
  const actual = jest.requireActual('../analytics');
  return {
    ...actual,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

let handleTypeFilterChange: ((value: FeedTypeFilter) => void) | undefined;

jest.mock('../components/TypeFilter', () => {
  const ReactActual = jest.requireActual('react');
  const Actual = jest.requireActual('../components/TypeFilter');
  return {
    ...Actual,
    TypeFilterSheet: (
      props: React.ComponentProps<typeof Actual.TypeFilterSheet>,
    ) => {
      handleTypeFilterChange = props.onChange;
      return ReactActual.createElement(Actual.TypeFilterSheet, props);
    },
  };
});

describe('FeedView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeedResult = buildResult();
    handleTypeFilterChange = undefined;
  });

  it('renders the type selector, audience toggle, and feed list when items exist', () => {
    renderWithProvider(<FeedView />);

    expect(
      screen.getByTestId(TypeFilterSelectorsIDs.SELECTOR),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(FeedViewSelectorsIDs.AUDIENCE_TOGGLE),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(FeedViewSelectorsIDs.LIST)).toBeOnTheScreen();
  });

  it('shows the skeleton loading state on the initial fetch', () => {
    mockFeedResult = buildResult({ items: [], isLoading: true });

    renderWithProvider(<FeedView />);

    expect(screen.getByTestId(FeedViewSelectorsIDs.LOADING)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(FeedViewSelectorsIDs.LIST),
    ).not.toBeOnTheScreen();
  });

  it('shows the empty state inside the (still pullable) list when there are no items', () => {
    mockFeedResult = buildResult({ items: [] });

    renderWithProvider(<FeedView />);

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    // The list stays mounted so pull-to-refresh works even when empty.
    expect(screen.getByTestId(FeedViewSelectorsIDs.LIST)).toBeOnTheScreen();
  });

  it('shows an error state with a retry that refetches', () => {
    mockFeedResult = buildResult({ items: [], error: 'boom' });

    renderWithProvider(<FeedView />);

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.ERROR_STATE),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(FeedViewSelectorsIDs.RETRY_BUTTON));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('requests QuickBuy with a CTA haptic when a spot Trade is pressed', () => {
    const onQuickBuy = jest.fn();
    renderWithProvider(<FeedView onQuickBuy={onQuickBuy} />);

    fireEvent.press(screen.getByTestId(getFeedTradeButtonTestId('feed-1')));

    expect(mockPlayImpact).toHaveBeenCalledTimes(1);
    expect(onQuickBuy).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenAddress: spotItem.tokenAddress,
        tokenSymbol: spotItem.tokenSymbol,
        tokenName: spotItem.tokenName,
        chain: spotItem.chain,
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_TRADER_FEED_ITEM_TRADE_CLICKED,
      expect.objectContaining({
        source: 'trader_feed',
        trader_address: spotItem.traderAddress,
        trader_username: spotItem.username,
        trade_type: 'spot',
        feed_action: 'bought',
        asset_name: 'PEPE',
        feed_audience: 'following',
        feed_type_filter: 'all',
        caip19: expect.stringContaining('eip155:1/erc20:'),
      }),
    );
  });

  it('navigates to the Perps market detail page when a perps Trade is pressed', () => {
    renderWithProvider(<FeedView />);

    fireEvent.press(screen.getByTestId(getFeedTradeButtonTestId('feed-2')));

    expect(mockPlayImpact).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.PERPS.ROOT,
      expect.objectContaining({
        screen: Routes.PERPS.MARKET_DETAILS,
        params: expect.objectContaining({ source: 'trader_feed' }),
      }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_TRADER_FEED_ITEM_TRADE_CLICKED,
      expect.objectContaining({
        source: 'trader_feed',
        trader_address: perpItem.traderAddress,
        trader_username: perpItem.username,
        trade_type: 'perps',
        feed_action: 'closed',
        asset_name: 'ETH',
        perps_market: 'ETH',
        feed_audience: 'following',
        feed_type_filter: 'all',
      }),
    );
  });

  it('tracks audience filter changes via Trader Feed Interaction', () => {
    renderWithProvider(<FeedView />);

    fireEvent.press(screen.getByTestId(getFeedAudienceOptionTestId('all')));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_TRADER_FEED_INTERACTION,
      {
        interaction_type: 'audience_filter_changed',
        feed_audience: 'all',
      },
    );
  });

  it('tracks type filter changes via Trader Feed Interaction', () => {
    renderWithProvider(<FeedView />);

    fireEvent.press(screen.getByTestId(TypeFilterSelectorsIDs.SELECTOR));
    fireEvent.press(screen.getByTestId(getTypeFilterOptionTestId('tokens')));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_TRADER_FEED_INTERACTION,
      {
        interaction_type: 'type_filter_changed',
        feed_type_filter: 'tokens',
        previous_feed_type_filter: 'all',
      },
    );
  });

  it('navigates to the trader profile when the trader identity is pressed', () => {
    renderWithProvider(<FeedView />);

    fireEvent.press(screen.getByTestId(getFeedTraderTestId('feed-1')));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.PROFILE,
      expect.objectContaining({
        traderId: 'trader-1',
        traderName: 'dutchiono',
        traderAddress: '0x1111111111111111111111111111111111111111',
        source: 'trader_feed',
      }),
    );
  });

  it('navigates to TraderPositionView when a spot position card is pressed', () => {
    renderWithProvider(<FeedView />);

    fireEvent.press(screen.getByTestId(getFeedTradeCardTestId('feed-1')));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.POSITION,
      {
        positionId: 'pos-feed-1',
        traderId: 'trader-1',
        traderAddress: '0x1111111111111111111111111111111111111111',
        source: 'trader_feed',
        originalEntryPoint: 'trader_feed',
      },
    );
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('navigates to TraderPositionView when a perps position card is pressed', () => {
    renderWithProvider(<FeedView />);

    fireEvent.press(screen.getByTestId(getFeedTradeCardTestId('feed-2')));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.POSITION,
      {
        positionId: 'pos-feed-2',
        traderId: 'trader-2',
        traderAddress: '0x2222222222222222222222222222222222222222',
        source: 'trader_feed',
        originalEntryPoint: 'trader_feed',
      },
    );
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('tracks chained type filter changes with the correct previous value', () => {
    renderWithProvider(<FeedView />);

    act(() => {
      handleTypeFilterChange?.('tokens');
      handleTypeFilterChange?.('perps');
    });

    expect(mockTrack).toHaveBeenCalledTimes(2);
    expect(mockTrack).toHaveBeenNthCalledWith(
      2,
      MetaMetricsEvents.SOCIAL_TRADER_FEED_INTERACTION,
      {
        interaction_type: 'type_filter_changed',
        feed_type_filter: 'perps',
        previous_feed_type_filter: 'tokens',
      },
    );
  });

  it('requests the next page when the list reaches its end', () => {
    mockFeedResult = buildResult({ hasNextPage: true });

    renderWithProvider(<FeedView />);

    const list = screen.getByTestId(FeedViewSelectorsIDs.LIST);
    act(() => {
      list.props.onEndReached();
    });

    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('exposes a RefreshControl on the list whose onRefresh triggers a refresh', async () => {
    jest.useFakeTimers();
    try {
      renderWithProvider(<FeedView />);

      const list = screen.getByTestId(FeedViewSelectorsIDs.LIST);
      const { refreshControl } = list.props;
      expect(refreshControl).toBeTruthy();
      expect(refreshControl.props.refreshing).toBe(false);
      expect(typeof refreshControl.props.onRefresh).toBe('function');

      await act(async () => {
        refreshControl.props.onRefresh();
      });

      expect(mockRefresh).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.runAllTimers();
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the audience empty state when the raw feed has no loaded items', () => {
    mockFeedResult = buildResult({ items: [], hasLoadedItems: false });

    renderWithProvider(<FeedView />);

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(FeedViewSelectorsIDs.TYPE_EMPTY_STATE),
    ).not.toBeOnTheScreen();
  });

  it('shows the type-filter empty state with Load more when filtered rows are empty but pages remain', () => {
    mockFeedResult = buildResult({
      items: [],
      sections: [],
      hasLoadedItems: true,
      hasNextPage: true,
    });

    renderWithProvider(<FeedView />);

    fireEvent.press(screen.getByTestId(TypeFilterSelectorsIDs.SELECTOR));
    fireEvent.press(screen.getByTestId(getTypeFilterOptionTestId('tokens')));

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.TYPE_EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(FeedViewSelectorsIDs.LOAD_MORE_BUTTON),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(FeedViewSelectorsIDs.LOAD_MORE_BUTTON));
    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not show the footer spinner while paginating an empty filtered list', () => {
    mockFeedResult = buildResult({
      items: [],
      sections: [],
      hasLoadedItems: true,
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    renderWithProvider(<FeedView />);

    fireEvent.press(screen.getByTestId(TypeFilterSelectorsIDs.SELECTOR));
    fireEvent.press(screen.getByTestId(getTypeFilterOptionTestId('perps')));

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.TYPE_EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(FeedViewSelectorsIDs.FOOTER_LOADING),
    ).not.toBeOnTheScreen();
  });

  it('shows the terminal type-filter empty state when the feed is exhausted', () => {
    mockFeedResult = buildResult({
      items: [],
      sections: [],
      hasLoadedItems: true,
      hasNextPage: false,
    });

    renderWithProvider(<FeedView />);

    fireEvent.press(screen.getByTestId(TypeFilterSelectorsIDs.SELECTOR));
    fireEvent.press(screen.getByTestId(getTypeFilterOptionTestId('perps')));

    expect(
      screen.getByTestId(FeedViewSelectorsIDs.TYPE_EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.empty_type.perps.title'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(FeedViewSelectorsIDs.LOAD_MORE_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('exposes a RefreshControl on the skeleton loading state', () => {
    mockFeedResult = buildResult({ items: [], isLoading: true });

    renderWithProvider(<FeedView />);

    const loading = screen.getByTestId(FeedViewSelectorsIDs.LOADING);
    expect(loading.props.refreshControl).toBeTruthy();
    expect(typeof loading.props.refreshControl.props.onRefresh).toBe(
      'function',
    );
  });
});
