import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import SocialTradersTabsView from './SocialTradersTabsView';
import { SocialTradersTabsViewSelectorsIDs } from './SocialTradersTabsView.testIds';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);
const mockTrack = jest.fn();

jest.mock('../analytics', () => {
  const actual = jest.requireActual('../analytics');
  return {
    ...actual,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

jest.mock('react-native-pager-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockPagerView = ReactActual.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
        testID?: string;
      },
      _ref: React.Ref<unknown>,
    ) => (
      <View testID={props.testID} onPageSelected={props.onPageSelected}>
        {props.children}
      </View>
    ),
  );
  MockPagerView.displayName = 'MockPagerView';
  return { __esModule: true, default: MockPagerView };
});

jest.mock('../../../../util/haptics', () => ({
  playSelection: () => mockPlaySelection(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock(
  '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences',
  () => ({
    useNotificationStoragePreferences: () => ({
      hasNotificationPreferences: false,
      isLoading: false,
    }),
  }),
);

jest.mock('../TopTradersView', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="mock-top-traders" />,
  };
});

let mockHasSpotItem = true;
jest.mock('../FeedView', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      isActive,
      onQuickBuy,
      onSpotAvailabilityChange,
    }: {
      isActive?: boolean;
      onQuickBuy?: (target: { tokenSymbol: string }) => void;
      onSpotAvailabilityChange?: (hasSpotItem: boolean) => void;
    }) => {
      ReactActual.useEffect(() => {
        onSpotAvailabilityChange?.(mockHasSpotItem);
      }, [onSpotAvailabilityChange]);
      return (
        <View
          testID="mock-feed"
          accessibilityState={{ selected: isActive === true }}
        >
          <Pressable
            testID="mock-feed-quick-buy-trigger"
            onPress={() => onQuickBuy?.({ tokenSymbol: 'PEPE' })}
          />
        </View>
      );
    },
  };
});

const mockBuyActionOpen = jest.fn();
jest.mock('../FeedView/components/FeedSpotBuyAction', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactActual.forwardRef(
      ({ isActive }: { isActive?: boolean }, ref: React.Ref<unknown>) => {
        ReactActual.useImperativeHandle(ref, () => ({
          open: mockBuyActionOpen,
        }));
        return (
          <View
            testID="mock-spot-buy-action"
            accessibilityState={{ selected: isActive === true }}
          />
        );
      },
    ),
  };
});

describe('SocialTradersTabsView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasSpotItem = true;
  });

  it('renders the header, tabs, and both pages', () => {
    renderWithProvider(<SocialTradersTabsView />);

    expect(
      screen.getByTestId(SocialTradersTabsViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialTradersTabsViewSelectorsIDs.TABS),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialTradersTabsViewSelectorsIDs.TITLE),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('mock-top-traders')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-feed')).toBeOnTheScreen();
  });

  it('renders the tabbed screen title from the feed i18n key', () => {
    renderWithProvider(<SocialTradersTabsView />);

    expect(
      screen.getByTestId(SocialTradersTabsViewSelectorsIDs.TITLE),
    ).toHaveTextContent('social_leaderboard.feed.title');
  });

  it('plays a selection haptic when switching to a different tab', () => {
    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(
      screen.getByTestId(`${SocialTradersTabsViewSelectorsIDs.TABS}-tab-1`),
    );

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('does not play a haptic when pressing the already-active tab', () => {
    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(
      screen.getByTestId(`${SocialTradersTabsViewSelectorsIDs.TABS}-tab-0`),
    );

    expect(mockPlaySelection).not.toHaveBeenCalled();
  });

  it('passes isActive=false to FeedView while the leaderboard tab is selected', () => {
    renderWithProvider(<SocialTradersTabsView />);

    expect(
      screen.getByTestId('mock-feed').props.accessibilityState?.selected,
    ).toBe(false);
  });

  it('passes isActive=true to FeedView when the feed tab is selected', () => {
    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(
      screen.getByTestId(`${SocialTradersTabsViewSelectorsIDs.TABS}-tab-1`),
    );

    expect(
      screen.getByTestId('mock-feed').props.accessibilityState?.selected,
    ).toBe(true);
  });

  it('mounts the spot Buy orchestrator (outside the pager) when the feed offers a spot Buy', () => {
    renderWithProvider(<SocialTradersTabsView />);

    expect(screen.getByTestId('mock-spot-buy-action')).toBeOnTheScreen();
  });

  it('does not mount the spot Buy orchestrator when the feed has no spot rows', () => {
    mockHasSpotItem = false;

    renderWithProvider(<SocialTradersTabsView />);

    expect(screen.queryByTestId('mock-spot-buy-action')).not.toBeOnTheScreen();
  });

  it('routes a feed spot Buy request to the buy action orchestrator', () => {
    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(screen.getByTestId('mock-feed-quick-buy-trigger'));

    expect(mockBuyActionOpen).toHaveBeenCalledWith({ tokenSymbol: 'PEPE' });
  });

  it('tracks tab changes via Follow Trading Interaction when a different tab is pressed', () => {
    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(
      screen.getByTestId(`${SocialTradersTabsViewSelectorsIDs.TABS}-tab-1`),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      {
        interaction_type: 'tab_changed',
        tab: 'tab_feed',
        tab_change_method: 'tap',
      },
    );
  });

  it('tracks swipe tab changes via Follow Trading Interaction', () => {
    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(
      screen.getByTestId(`${SocialTradersTabsViewSelectorsIDs.TABS}-tab-1`),
    );
    mockTrack.mockClear();

    const pager = screen.getByTestId(SocialTradersTabsViewSelectorsIDs.PAGER);
    act(() => {
      pager.props.onPageSelected({ nativeEvent: { position: 0 } });
    });

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      {
        interaction_type: 'tab_changed',
        tab: 'tab_leaderboard',
        tab_change_method: 'swipe',
      },
    );
  });

  it('does not mislabel a swipe as tap after tapping the already-active tab', () => {
    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(
      screen.getByTestId(`${SocialTradersTabsViewSelectorsIDs.TABS}-tab-0`),
    );
    expect(mockTrack).not.toHaveBeenCalled();
    mockTrack.mockClear();

    const pager = screen.getByTestId(SocialTradersTabsViewSelectorsIDs.PAGER);
    act(() => {
      pager.props.onPageSelected({ nativeEvent: { position: 1 } });
    });

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_INTERACTION,
      {
        interaction_type: 'tab_changed',
        tab: 'tab_feed',
        tab_change_method: 'swipe',
      },
    );
  });
});
