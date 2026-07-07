import React, { createRef } from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { DEFAULT_SOCIAL_AI_PREFERENCES } from '@metamask/notification-services-controller/notification-services';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TopTradersSection from './TopTradersSection';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';

const mockRefetch = jest.fn().mockResolvedValue(undefined);
const mockNavigate = jest.fn();
const mockPlayErrorNotification = jest.fn(() => Promise.resolve());

jest.mock('../../../../../util/haptics', () => ({
  playErrorNotification: () => mockPlayErrorNotification(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = ReactActual.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        testID?: string;
        onClose?: () => void;
      },
      ref: React.Ref<{
        onCloseBottomSheet: (callback?: () => void) => void;
        onOpenBottomSheet: (callback?: () => void) => void;
      }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: (cb?: () => void) => {
          props.onClose?.();
          cb?.();
        },
        onOpenBottomSheet: (cb?: () => void) => {
          cb?.();
        },
      }));
      return ReactActual.createElement(
        View,
        { testID: props.testID ?? 'bottom-sheet' },
        props.children,
      );
    },
  );
  return { ...actual, BottomSheet: MockBottomSheet };
});

const mockTraders = [
  {
    id: 'trader-1',
    address: '0x0000000000000000000000000000000000000001',
    rank: 1,
    overallRank: 1,
    username: 'alice',
    percentageChange: 96.2,
    pnlValue: 963000,
    pnlPerChain: { base: 963000 },
    isFollowing: false,
  },
];

const mockUseTopTraders = jest.fn((_options?: unknown) => ({
  traders: mockTraders,
  isLoading: false,
  isFetching: false,
  error: null as string | null,
  refresh: mockRefetch,
  toggleFollow: jest.fn(),
}));

jest.mock('./hooks', () => ({
  useTopTraders: (args: unknown) => mockUseTopTraders(args),
  usePrefetchTraderProfiles: jest.fn(),
}));

const mockUsePrefetchTraderProfiles = jest.requireMock('./hooks')
  .usePrefetchTraderProfiles as jest.Mock;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

jest.mock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: jest.fn(() => true),
    selectSocialLeaderboardPerpsEnabled: jest.fn(() => true),
  }),
);

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(() => ({ onLayout: jest.fn() })),
  HomeSectionNames: {
    CASH: 'cash',
    TOKENS: 'tokens',
    WHATS_HAPPENING: 'whats_happening',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
    TOP_TRADERS: 'top_traders',
  },
}));

jest.mock('../../hooks/useSectionViewportVisible', () => ({
  __esModule: true,
  default: jest.fn(() => ({ isVisible: true, onLayout: jest.fn() })),
}));

let mockNotificationPreferences = {
  ...DEFAULT_SOCIAL_AI_PREFERENCES,
  mutedTraderProfileIds: [
    ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
  ],
};
const mockHasNotificationPreferences = jest.fn(() => true);

jest.mock('../../../SocialLeaderboard/NotificationPreferences/hooks', () => ({
  ...jest.requireActual(
    '../../../SocialLeaderboard/NotificationPreferences/hooks',
  ),
  useNotificationPreferences: () => ({
    preferences: mockNotificationPreferences,
    hasNotificationPreferences: mockHasNotificationPreferences(),
    isLoading: false,
    error: null,
    setPushNotificationsEnabled: jest.fn(),
    setInAppNotificationsEnabled: jest.fn(),
    setTxAmountLimit: jest.fn(),
    toggleTraderNotification: jest.fn(),
    isTraderNotificationEnabled: jest.fn(() => true),
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.forwardRef(
      (
        props: { children?: React.ReactNode; testID?: string },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
          onOpenBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: jest.fn(),
          onOpenBottomSheet: jest.fn(),
        }));
        return ReactActual.createElement(
          View,
          { testID: props.testID ?? 'bottom-sheet' },
          props.children,
        );
      },
    );
  },
);

const mockSelectSocialLeaderboardEnabled = jest.requireMock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
).selectSocialLeaderboardEnabled;
const mockSelectSocialLeaderboardPerpsEnabled = jest.requireMock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
).selectSocialLeaderboardPerpsEnabled;

const defaultProps = { sectionIndex: 1, totalSectionsLoaded: 3 };

const channelsDisabledPreferences = {
  ...DEFAULT_SOCIAL_AI_PREFERENCES,
  pushNotificationsEnabled: false,
  inAppNotificationsEnabled: false,
  mutedTraderProfileIds: [
    ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
  ],
};

describe('TopTradersSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectSocialLeaderboardEnabled.mockImplementation(() => true);
    mockSelectSocialLeaderboardPerpsEnabled.mockImplementation(() => true);
    mockNotificationPreferences = {
      ...DEFAULT_SOCIAL_AI_PREFERENCES,
      mutedTraderProfileIds: [
        ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
      ],
    };
    mockHasNotificationPreferences.mockReturnValue(true);
    mockUseTopTraders.mockReturnValue({
      traders: mockTraders,
      isLoading: false,
      isFetching: false,
      error: null,
      refresh: mockRefetch,
      toggleFollow: jest.fn(),
    });
  });

  it('queries with all chains so the cache key aligns with TopTradersView "All"', () => {
    renderWithProvider(<TopTradersSection {...defaultProps} />);
    expect(mockUseTopTraders).toHaveBeenCalledWith(
      expect.objectContaining({
        chains: ['base', 'solana', 'ethereum', 'hyperliquid'],
        limit: 50,
      }),
    );
  });

  it('queries with spot-only chains when social leaderboard perps are disabled', () => {
    mockSelectSocialLeaderboardPerpsEnabled.mockImplementation(() => false);

    renderWithProvider(<TopTradersSection {...defaultProps} />);

    expect(mockUseTopTraders).toHaveBeenCalledWith(
      expect.objectContaining({
        chains: ['base', 'solana', 'ethereum'],
        limit: 50,
      }),
    );
  });

  it('returns null when the API returns no traders', () => {
    mockUseTopTraders.mockReturnValue({
      traders: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refresh: mockRefetch,
      toggleFollow: jest.fn(),
    });
    renderWithProvider(<TopTradersSection {...defaultProps} />);
    expect(screen.queryByTestId('homepage-top-traders-carousel')).toBeNull();
  });

  it('renders skeletons while loading even when traders is empty', () => {
    mockUseTopTraders.mockReturnValue({
      traders: [],
      isLoading: true,
      isFetching: true,
      error: null,
      refresh: mockRefetch,
      toggleFollow: jest.fn(),
    });
    renderWithProvider(<TopTradersSection {...defaultProps} />);
    expect(
      screen.getByTestId('homepage-top-traders-carousel'),
    ).toBeOnTheScreen();
  });

  it('returns null when the feature flag is disabled', () => {
    mockSelectSocialLeaderboardEnabled.mockImplementation(() => false);
    renderWithProvider(<TopTradersSection {...defaultProps} />);
    expect(screen.queryByTestId('homepage-top-traders-carousel')).toBeNull();
  });

  it('renders the carousel when the feature flag is enabled', () => {
    renderWithProvider(<TopTradersSection {...defaultProps} />);
    expect(
      screen.getByTestId('homepage-top-traders-carousel'),
    ).toBeOnTheScreen();
  });

  it('navigates to the Top Traders view when the section header is pressed', () => {
    renderWithProvider(<TopTradersSection {...defaultProps} />);

    fireEvent.press(screen.getByText('Weekly Top Traders'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL_LEADERBOARD.VIEW, {
      source: 'home_carousel',
    });
  });

  it('navigates to the trader profile with correct params when a card is tapped', () => {
    renderWithProvider(<TopTradersSection {...defaultProps} />);

    fireEvent.press(screen.getByTestId('top-trader-card-pressable-trader-1'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.PROFILE,
      {
        traderId: 'trader-1',
        traderName: 'alice',
        traderAddress: '0x0000000000000000000000000000000000000001',
        source: 'home_carousel',
        traderRank: 1,
      },
    );
  });

  it('calls toggleFollow with the correct analytics context when the follow button is pressed', async () => {
    const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
    mockUseTopTraders.mockReturnValue({
      traders: mockTraders,
      isLoading: false,
      isFetching: false,
      error: null,
      refresh: mockRefetch,
      toggleFollow: mockToggleFollow,
    });
    renderWithProvider(<TopTradersSection {...defaultProps} />);

    await act(async () => {
      fireEvent.press(screen.getByText('Follow'));
    });

    expect(mockToggleFollow).toHaveBeenCalledWith(
      'trader-1',
      expect.objectContaining({
        source: 'home_carousel',
        traderAddress: '0x0000000000000000000000000000000000000001',
      }),
    );
  });

  it('navigates to the trading signals setup sheet when following with both channels off', async () => {
    const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
    mockNotificationPreferences = {
      ...DEFAULT_SOCIAL_AI_PREFERENCES,
      pushNotificationsEnabled: false,
      inAppNotificationsEnabled: false,
      mutedTraderProfileIds: [
        ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
      ],
    };
    mockUseTopTraders.mockReturnValue({
      traders: mockTraders,
      isLoading: false,
      isFetching: false,
      error: null,
      refresh: mockRefetch,
      toggleFollow: mockToggleFollow,
    });

    renderWithProvider(<TopTradersSection {...defaultProps} />);

    await act(async () => {
      fireEvent.press(screen.getByText('Follow'));
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.TRADING_SIGNALS_SETUP,
      expect.objectContaining({ onSetupComplete: expect.any(Function) }),
    );
  });

  it('intercepts the follow without calling toggleFollow when both channels are off', async () => {
    const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
    mockNotificationPreferences = {
      ...DEFAULT_SOCIAL_AI_PREFERENCES,
      pushNotificationsEnabled: false,
      inAppNotificationsEnabled: false,
      mutedTraderProfileIds: [
        ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
      ],
    };
    mockUseTopTraders.mockReturnValue({
      traders: mockTraders,
      isLoading: false,
      isFetching: false,
      error: null,
      refresh: mockRefetch,
      toggleFollow: mockToggleFollow,
    });

    renderWithProvider(<TopTradersSection {...defaultProps} />);

    await act(async () => {
      fireEvent.press(screen.getByText('Follow'));
    });

    expect(mockToggleFollow).not.toHaveBeenCalled();
  });

  it('fires an error haptic when the follow is intercepted', async () => {
    mockNotificationPreferences = {
      ...DEFAULT_SOCIAL_AI_PREFERENCES,
      pushNotificationsEnabled: false,
      inAppNotificationsEnabled: false,
      mutedTraderProfileIds: [
        ...DEFAULT_SOCIAL_AI_PREFERENCES.mutedTraderProfileIds,
      ],
    };

    renderWithProvider(<TopTradersSection {...defaultProps} />);

    await act(async () => {
      fireEvent.press(screen.getByText('Follow'));
    });

    expect(mockPlayErrorNotification).toHaveBeenCalledTimes(1);
  });

  it('follows immediately without a haptic when a channel is already enabled', async () => {
    const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
    mockUseTopTraders.mockReturnValue({
      traders: mockTraders,
      isLoading: false,
      isFetching: false,
      error: null,
      refresh: mockRefetch,
      toggleFollow: mockToggleFollow,
    });

    renderWithProvider(<TopTradersSection {...defaultProps} />);

    await act(async () => {
      fireEvent.press(screen.getByText('Follow'));
    });

    expect(mockToggleFollow).toHaveBeenCalledTimes(1);
    expect(mockPlayErrorNotification).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.TRADING_SIGNALS_SETUP,
      expect.anything(),
    );
  });

  it('defers the follow to the setup sheet via the onSetupComplete param', async () => {
    const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
    mockNotificationPreferences = channelsDisabledPreferences;
    mockUseTopTraders.mockReturnValue({
      traders: mockTraders,
      isLoading: false,
      isFetching: false,
      error: null,
      refresh: mockRefetch,
      toggleFollow: mockToggleFollow,
    });

    renderWithProvider(<TopTradersSection {...defaultProps} />);

    await act(async () => {
      fireEvent.press(screen.getByText('Follow'));
    });

    expect(mockToggleFollow).not.toHaveBeenCalled();

    const setupCall = mockNavigate.mock.calls.find(
      ([route]) => route === Routes.SOCIAL_LEADERBOARD.TRADING_SIGNALS_SETUP,
    );
    const { onSetupComplete } = setupCall?.[1] ?? {};

    await act(async () => {
      onSetupComplete?.();
    });

    expect(mockToggleFollow).toHaveBeenCalledTimes(1);
  });

  it('renders the error state instead of the carousel when the fetch fails', () => {
    mockUseTopTraders.mockReturnValue({
      traders: [],
      isLoading: false,
      isFetching: false,
      error: 'Network error',
      refresh: mockRefetch,
      toggleFollow: jest.fn(),
    });
    renderWithProvider(<TopTradersSection {...defaultProps} />);

    expect(screen.queryByTestId('homepage-top-traders-carousel')).toBeNull();
    expect(
      screen.getByTestId('homepage-top-traders-section-root'),
    ).toBeOnTheScreen();
  });

  it('calls refresh when the retry button in the error state is pressed', async () => {
    mockUseTopTraders.mockReturnValue({
      traders: [],
      isLoading: false,
      isFetching: false,
      error: 'Network error',
      refresh: mockRefetch,
      toggleFollow: jest.fn(),
    });
    renderWithProvider(<TopTradersSection {...defaultProps} />);

    fireEvent.press(screen.getByText('Retry'));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders skeletons instead of error state while a retry is in flight', () => {
    mockUseTopTraders.mockReturnValue({
      traders: [],
      isLoading: false,
      isFetching: true,
      error: 'Network error',
      refresh: mockRefetch,
      toggleFollow: jest.fn(),
    });
    renderWithProvider(<TopTradersSection {...defaultProps} />);

    expect(
      screen.getByTestId('homepage-top-traders-carousel'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('keeps cached traders visible when a background refetch fails', () => {
    mockUseTopTraders.mockReturnValue({
      traders: mockTraders,
      isLoading: false,
      isFetching: false,
      error: 'Network error',
      refresh: mockRefetch,
      toggleFollow: jest.fn(),
    });
    renderWithProvider(<TopTradersSection {...defaultProps} />);

    expect(screen.getByTestId('top-trader-card-trader-1')).toBeOnTheScreen();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('keeps cached traders and ViewMoreCard visible during a background refetch', () => {
    mockUseTopTraders.mockReturnValue({
      traders: mockTraders,
      isLoading: false,
      isFetching: true,
      error: null,
      refresh: mockRefetch,
      toggleFollow: jest.fn(),
    });
    renderWithProvider(<TopTradersSection {...defaultProps} />);

    expect(screen.getByTestId('top-trader-card-trader-1')).toBeOnTheScreen();
    expect(screen.getByTestId('top-traders-view-more-card')).toBeOnTheScreen();
  });

  it('exposes refresh via ref and resolves when called', async () => {
    const ref = createRef<SectionRefreshHandle>();
    renderWithProvider(<TopTradersSection ref={ref} {...defaultProps} />);

    expect(ref.current).not.toBeNull();
    await expect(ref.current?.refresh()).resolves.toBeUndefined();
  });

  it('invokes onLayout from useHomeViewedEvent when the section root lays out', () => {
    const mockOnLayout = jest.fn();
    const mockUseHomeViewedEvent = jest.requireMock(
      '../../hooks/useHomeViewedEvent',
    ).default as jest.Mock;
    mockUseHomeViewedEvent.mockReturnValueOnce({ onLayout: mockOnLayout });

    renderWithProvider(<TopTradersSection {...defaultProps} />);
    const root = screen.getByTestId('homepage-top-traders-section-root');
    fireEvent(root, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 200 } },
    });

    expect(mockOnLayout).toHaveBeenCalled();
  });

  it('wires visible trader ids into the prefetch hook from FlatList viewability', () => {
    renderWithProvider(<TopTradersSection {...defaultProps} />);

    const carousel = screen.getByTestId('homepage-top-traders-carousel');
    const onViewableItemsChanged = carousel.props.onViewableItemsChanged;

    act(() => {
      onViewableItemsChanged({
        viewableItems: [
          {
            item: { kind: 'trader', trader: mockTraders[0] },
            key: 'trader-1',
            index: 0,
          },
        ],
        changed: [],
      });
    });

    expect(mockUsePrefetchTraderProfiles).toHaveBeenLastCalledWith(
      ['trader-1'],
      expect.objectContaining({
        enabled: true,
        isSectionVisible: true,
      }),
    );
  });
});
