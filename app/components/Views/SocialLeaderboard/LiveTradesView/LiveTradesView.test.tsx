import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { SocialEntryOptionsProvider } from '../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet';
import {
  getSocialEntryOptionsTriggerTestId,
  SocialEntryOptionsBottomSheetSelectorsIDs,
} from '../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet.testIds';
import { SOCIAL_V1_FEED_ENTRY_DIVIDER_TEST_ID } from '../../../UI/SocialFeed/components/SocialV1FeedPostList.testIds';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';
import LiveTradesView from './LiveTradesView';
import { MOCK_LIVE_TRADES_ITEMS } from './mocks/liveTradesFeed.mock';
import { getLiveTradeRowTestId } from './components/LiveTradeRow.testIds';
import { LiveTradesViewSelectorsIDs } from './LiveTradesView.testIds';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

jest.mock('../../../UI/SocialFeed/components/TraderAvatar', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});

jest.mock('../../../UI/SocialFeed/components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-native-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => <View testID={testID}>{children}</View>;
});

describe('LiveTradesView', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });
  it('renders a single Live stream toggle above the mock feed list', () => {
    renderWithProvider(<LiveTradesView />);

    const scroll = within(
      screen.getByTestId(LiveTradesViewSelectorsIDs.SCROLL_VIEW),
    );

    expect(
      scroll.getByTestId(LiveTradesViewSelectorsIDs.STREAM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      scroll.getByTestId(LiveTradesViewSelectorsIDs.STREAM_STATUS_DOT),
    ).toBeOnTheScreen();
    expect(
      scroll.getByText('social_leaderboard.feed.live_stream.live'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText('social_leaderboard.feed.live_stream.paused'),
    ).not.toBeOnTheScreen();
    expect(
      scroll.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders compact live-trade rows for mocked live trades', () => {
    renderWithProvider(<LiveTradesView />);

    MOCK_LIVE_TRADES_ITEMS.forEach((item) => {
      expect(
        screen.getByTestId(getLiveTradeRowTestId(item.id)),
      ).toBeOnTheScreen();
    });
    expect(
      screen.getByTestId('social-v1-feed-entry-divider-live-trades-1'),
    ).toBeOnTheScreen();
  });

  it('drops a hidden trade and its divider together', () => {
    renderWithProvider(
      <SocialEntryOptionsProvider>
        <LiveTradesView />
      </SocialEntryOptionsProvider>,
    );

    const firstItem = MOCK_LIVE_TRADES_ITEMS[0];
    fireEvent.press(
      screen.getByTestId(getSocialEntryOptionsTriggerTestId(firstItem.id)),
    );
    fireEvent.press(
      screen.getByTestId(SocialEntryOptionsBottomSheetSelectorsIDs.HIDE_POST),
    );

    expect(
      screen.queryByTestId(getLiveTradeRowTestId(firstItem.id)),
    ).toBeNull();
    expect(
      screen.getAllByTestId(new RegExp(SOCIAL_V1_FEED_ENTRY_DIVIDER_TEST_ID)),
    ).toHaveLength(MOCK_LIVE_TRADES_ITEMS.length - 2);
  });

  it('keeps only perp rows when the perps asset filter is applied', () => {
    renderWithProvider(
      <LiveTradesView appliedFilters={{ ...DEFAULT_FILTERS, type: 'perps' }} />,
    );

    const perpRows = MOCK_LIVE_TRADES_ITEMS.filter(
      (item) => item.type === 'perps',
    );
    perpRows.forEach((item) => {
      expect(
        screen.getByTestId(getLiveTradeRowTestId(item.id)),
      ).toBeOnTheScreen();
    });
    MOCK_LIVE_TRADES_ITEMS.filter((item) => item.type === 'spot').forEach(
      (item) => {
        expect(screen.queryByTestId(getLiveTradeRowTestId(item.id))).toBeNull();
      },
    );
  });

  it('toggles from Live to Paused without calling onOpenFilters', () => {
    const onOpenFilters = jest.fn();
    renderWithProvider(<LiveTradesView onOpenFilters={onOpenFilters} />);

    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.STREAM_BUTTON),
    );

    expect(
      screen.getByText('social_leaderboard.feed.live_stream.paused'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText('social_leaderboard.feed.live_stream.live'),
    ).not.toBeOnTheScreen();
    expect(onOpenFilters).not.toHaveBeenCalled();
  });

  it('opens filters from the filter icon', () => {
    const onOpenFilters = jest.fn();
    renderWithProvider(<LiveTradesView onOpenFilters={onOpenFilters} />);

    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON),
    );

    expect(onOpenFilters).toHaveBeenCalledTimes(1);
  });

  it('highlights the filter icon when filters are active', () => {
    const { rerender } = renderWithProvider(
      <LiveTradesView isFilterActive={false} />,
    );

    const inactiveStyle = StyleSheet.flatten(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON).props.style,
    );

    rerender(<LiveTradesView isFilterActive />);

    const activeStyle = StyleSheet.flatten(
      screen.getByTestId(LiveTradesViewSelectorsIDs.FILTER_BUTTON).props.style,
    );

    expect(activeStyle?.backgroundColor).not.toBe(
      inactiveStyle?.backgroundColor,
    );
  });

  it('toggles from Paused back to Live on a second press', () => {
    renderWithProvider(<LiveTradesView />);

    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.STREAM_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(LiveTradesViewSelectorsIDs.STREAM_BUTTON),
    );

    expect(
      screen.getByText('social_leaderboard.feed.live_stream.live'),
    ).toBeOnTheScreen();
  });

  it('opens the V1 profile from a trader identity tap', () => {
    renderWithProvider(<LiveTradesView />);

    const firstItem = MOCK_LIVE_TRADES_ITEMS[0];
    fireEvent.press(screen.getByTestId(`live-trade-trader-${firstItem.id}`));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      {
        traderId: firstItem.traderId,
        traderName: firstItem.authorHandle,
        traderAddress: firstItem.traderAddress,
        ...(firstItem.authorImageUrl
          ? { traderAvatarUri: firstItem.authorImageUrl }
          : {}),
        source: 'trader_feed',
      },
      {},
    );
  });
});
