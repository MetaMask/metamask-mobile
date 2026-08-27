import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import SocialTradersTabsView from './SocialTradersTabsView';
import { SocialTradersTabsViewSelectorsIDs } from './SocialTradersTabsView.testIds';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import { expectHeaderIncludesTopInset } from '../shared/scrollableScreenSafeArea.testUtils';

const mockPlaySelection = jest.fn().mockResolvedValue(undefined);
const mockTrack = jest.fn();
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockOpenSystemSettings = jest.fn();
const mockHasNotificationPreferences = jest.fn(() => false);
let mockRouteParams: { showNotificationsBanner?: boolean } = {};

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

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    __esModule: true,
    default: { openSystemSettings: () => mockOpenSystemSettings() },
  }),
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  let navigation: { goBack: jest.Mock; navigate: jest.Mock } | undefined;
  return {
    ...actual,
    useNavigation: () => {
      if (!navigation) {
        navigation = { goBack: mockGoBack, navigate: mockNavigate };
      }
      return navigation;
    },
    useRoute: () => ({ params: mockRouteParams, name: 'TopTradersView' }),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock(
  '../../Settings/NotificationsSettings/hooks/useNotificationStoragePreferences',
  () => ({
    useNotificationStoragePreferences: () => ({
      hasNotificationPreferences: mockHasNotificationPreferences(),
      isLoading: false,
    }),
  }),
);

const mockUsePrefetchTraderFeeds = jest.fn();
jest.mock('../FeedView/hooks/usePrefetchTraderFeeds', () => ({
  usePrefetchTraderFeeds: (enabled?: boolean) =>
    mockUsePrefetchTraderFeeds(enabled),
}));

let mockSettleLeaderboardOnMount = false;

jest.mock('../TopTradersView', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onVisibleLeaderboardSettled,
    }: {
      onVisibleLeaderboardSettled?: () => void;
    }) => {
      ReactActual.useEffect(() => {
        if (mockSettleLeaderboardOnMount) {
          onVisibleLeaderboardSettled?.();
        }
      }, [onVisibleLeaderboardSettled]);
      return <View testID="mock-top-traders" />;
    },
  };
});

let mockHasSpotItem = true;
let mockOnSpotAvailabilityChange: ((hasSpotItem: boolean) => void) | undefined;
let mockDeferBuyActionRef = false;
let mockAttachBuyActionRef: (() => void) | null = null;

const setMockHasSpotItem = (hasSpotItem: boolean) => {
  mockHasSpotItem = hasSpotItem;
  mockOnSpotAvailabilityChange?.(hasSpotItem);
};

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
        mockOnSpotAvailabilityChange = onSpotAvailabilityChange;
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
        const [isRefAttached, setIsRefAttached] = ReactActual.useState(
          !mockDeferBuyActionRef,
        );

        mockAttachBuyActionRef = () => setIsRefAttached(true);

        ReactActual.useImperativeHandle(
          ref,
          () => (isRefAttached ? { open: mockBuyActionOpen } : null),
          [isRefAttached],
        );

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
    mockDeferBuyActionRef = false;
    mockAttachBuyActionRef = null;
    mockOnSpotAvailabilityChange = undefined;
    mockHasNotificationPreferences.mockReturnValue(false);
    mockRouteParams = {};
    mockSettleLeaderboardOnMount = false;
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

  describe('safe area layout', () => {
    it('excludes bottom safe area so the scroll list extends to the screen edge', () => {
      renderWithProvider(<SocialTradersTabsView />);

      expect(
        screen.getByTestId(SocialTradersTabsViewSelectorsIDs.CONTAINER).props
          .edges,
      ).toEqual(SCROLLABLE_SCREEN_SAFE_AREA_EDGES);
    });

    it('keeps the top inset on the header to prevent layout shift on push', () => {
      renderWithProvider(<SocialTradersTabsView />);

      expectHeaderIncludesTopInset(
        screen.getByTestId(SocialTradersTabsViewSelectorsIDs.HEADER),
      );
    });
  });

  it('renders the tabbed screen title from the feed i18n key', () => {
    renderWithProvider(<SocialTradersTabsView />);

    expect(
      screen.getByTestId(SocialTradersTabsViewSelectorsIDs.TITLE),
    ).toHaveTextContent('social_leaderboard.feed.title');
  });

  it('calls goBack when the back button is pressed', () => {
    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(
      screen.getByTestId(SocialTradersTabsViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to the socialAI notification settings section when the bell is pressed and preferences exist', () => {
    mockHasNotificationPreferences.mockReturnValue(true);

    renderWithProvider(<SocialTradersTabsView />);
    fireEvent.press(
      screen.getByTestId(SocialTradersTabsViewSelectorsIDs.NOTIFICATION_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION,
      params: {
        type: 'socialAI',
        title: 'app_settings.notifications_opts.social_ai_title',
        description: 'app_settings.notifications_opts.social_ai_desc',
      },
    });
  });

  it('navigates to notification settings when the bell is pressed and preferences do not exist yet', () => {
    mockHasNotificationPreferences.mockReturnValue(false);

    renderWithProvider(<SocialTradersTabsView />);
    fireEvent.press(
      screen.getByTestId(SocialTradersTabsViewSelectorsIDs.NOTIFICATION_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: Routes.SETTINGS.NOTIFICATIONS,
    });
  });

  describe('notifications nudge banner', () => {
    it('is hidden by default when the route param is unset', () => {
      renderWithProvider(<SocialTradersTabsView />);

      expect(
        screen.queryByTestId(
          SocialTradersTabsViewSelectorsIDs.NOTIFICATIONS_BANNER,
        ),
      ).toBeNull();
    });

    it('renders when the showNotificationsBanner route param is set', () => {
      mockRouteParams = { showNotificationsBanner: true };

      renderWithProvider(<SocialTradersTabsView />);

      expect(
        screen.getByTestId(
          SocialTradersTabsViewSelectorsIDs.NOTIFICATIONS_BANNER,
        ),
      ).toBeOnTheScreen();
    });

    it('opens system settings and dismisses when the CTA is pressed', () => {
      mockRouteParams = { showNotificationsBanner: true };

      renderWithProvider(<SocialTradersTabsView />);
      fireEvent.press(
        screen.getByText(
          'social_leaderboard.top_traders_view.notifications_banner.open_settings',
        ),
      );

      expect(mockOpenSystemSettings).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId(
          SocialTradersTabsViewSelectorsIDs.NOTIFICATIONS_BANNER,
        ),
      ).toBeNull();
    });

    it('dismisses when the close button is pressed', () => {
      mockRouteParams = { showNotificationsBanner: true };

      renderWithProvider(<SocialTradersTabsView />);
      fireEvent.press(screen.getByLabelText('Close banner'));

      expect(mockOpenSystemSettings).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId(
          SocialTradersTabsViewSelectorsIDs.NOTIFICATIONS_BANNER,
        ),
      ).toBeNull();
    });

    it('auto-dismisses after the timeout window', () => {
      jest.useFakeTimers();
      try {
        mockRouteParams = { showNotificationsBanner: true };
        renderWithProvider(<SocialTradersTabsView />);

        expect(
          screen.getByTestId(
            SocialTradersTabsViewSelectorsIDs.NOTIFICATIONS_BANNER,
          ),
        ).toBeOnTheScreen();

        act(() => {
          jest.advanceTimersByTime(20000);
        });

        expect(
          screen.queryByTestId(
            SocialTradersTabsViewSelectorsIDs.NOTIFICATIONS_BANNER,
          ),
        ).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });
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

  it('holds feed prefetch back until the visible leaderboard query settles', () => {
    renderWithProvider(<SocialTradersTabsView />);

    expect(mockUsePrefetchTraderFeeds).toHaveBeenCalledWith(false);
    expect(mockUsePrefetchTraderFeeds).not.toHaveBeenCalledWith(true);
  });

  it('enables feed prefetch after the visible leaderboard query settles', () => {
    mockSettleLeaderboardOnMount = true;

    renderWithProvider(<SocialTradersTabsView />);

    expect(mockUsePrefetchTraderFeeds).toHaveBeenCalledWith(true);
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

  it('buffers a feed spot Buy until the orchestrator mounts', () => {
    mockHasSpotItem = false;

    renderWithProvider(<SocialTradersTabsView />);

    expect(screen.queryByTestId('mock-spot-buy-action')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('mock-feed-quick-buy-trigger'));

    expect(screen.getByTestId('mock-spot-buy-action')).toBeOnTheScreen();
    expect(mockBuyActionOpen).toHaveBeenCalledWith({ tokenSymbol: 'PEPE' });
  });

  it('routes a feed spot Buy request to the buy action orchestrator', () => {
    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(screen.getByTestId('mock-feed-quick-buy-trigger'));

    expect(mockBuyActionOpen).toHaveBeenCalledWith({ tokenSymbol: 'PEPE' });
  });

  it('flushes a buffered buy when the orchestrator ref attaches after mount', () => {
    mockDeferBuyActionRef = true;
    mockHasSpotItem = false;

    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(screen.getByTestId('mock-feed-quick-buy-trigger'));

    expect(mockBuyActionOpen).not.toHaveBeenCalled();

    act(() => {
      mockAttachBuyActionRef?.();
    });

    expect(mockBuyActionOpen).toHaveBeenCalledWith({ tokenSymbol: 'PEPE' });
  });

  it('discards a buffered buy when spot availability goes false before flush', () => {
    mockDeferBuyActionRef = true;
    mockHasSpotItem = false;

    renderWithProvider(<SocialTradersTabsView />);

    fireEvent.press(screen.getByTestId('mock-feed-quick-buy-trigger'));
    expect(mockBuyActionOpen).not.toHaveBeenCalled();

    act(() => {
      setMockHasSpotItem(false);
    });
    mockBuyActionOpen.mockClear();

    act(() => {
      setMockHasSpotItem(true);
      mockAttachBuyActionRef?.();
    });

    expect(mockBuyActionOpen).not.toHaveBeenCalled();
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
