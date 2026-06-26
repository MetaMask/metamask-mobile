import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { StackActions } from '@react-navigation/native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import StorageWrapper from '../../../../store/storage-wrapper';
import { SOCIAL_LEADERBOARD_ONBOARDING_SHOWN } from '../../../../constants/storage';
// eslint-disable-next-line import-x/no-restricted-paths
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
import SocialLeaderboardOnboarding from './SocialLeaderboardOnboarding';
import { SocialLeaderboardOnboardingSelectorsIDs } from './SocialLeaderboardOnboarding.testIds';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

jest.mock('react-native-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: View,
  };
});

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
      dispatch: mockDispatch,
    }),
  };
});

// Render only the active page so footer logic per slide is exercised.
jest.mock('@tommasini/react-native-scrollable-tab-view', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: MockReact.forwardRef(
      (
        {
          children,
          onChangeTab,
          initialPage,
        }: {
          children: React.ReactNode;
          onChangeTab?: (obj: { i: number }) => void;
          initialPage?: number;
        },
        ref: React.Ref<{ goToPage: (page: number) => void }>,
      ) => {
        const [currentPage, setCurrentPage] = MockReact.useState(
          initialPage || 0,
        );
        MockReact.useImperativeHandle(ref, () => ({
          goToPage: (page: number) => {
            setCurrentPage(page);
            onChangeTab?.({ i: page });
          },
        }));
        const childrenArray = MockReact.Children.toArray(children);
        return <View>{childrenArray[currentPage]}</View>;
      },
    ),
  };
});

const mockTrack = jest.fn();
jest.mock('../analytics', () => {
  const actual = jest.requireActual('../analytics');
  return {
    ...actual,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardPerpsEnabled: () => false,
  }),
);

let mockIsNotificationsEnabled = false;
let mockIsPushEnabled = false;
jest.mock('../../../../selectors/notifications', () => ({
  selectIsMetamaskNotificationsEnabled: () => mockIsNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled: () => mockIsPushEnabled,
}));

let mockNotificationsFeatureEnabled = true;
jest.mock('../../../../util/notifications/constants/config', () => ({
  isNotificationsFeatureEnabled: () => mockNotificationsFeatureEnabled,
}));

const mockRequestPushPermission = jest.fn().mockResolvedValue(true);
const mockEnableNotificationsInBackground = jest.fn();
jest.mock(
  '../../../../util/notifications/hooks/usePushPermissionNotificationSetup',
  () => ({
    usePushPermissionNotificationSetup: () => ({
      requestPushPermission: mockRequestPushPermission,
      enableNotificationsInBackground: mockEnableNotificationsInBackground,
    }),
  }),
);

const mockToggleFollow = jest.fn().mockResolvedValue(undefined);
let mockTraders: TopTrader[] = [];
let mockIsLoading = false;
jest.mock('../../Homepage/Sections/TopTraders/hooks', () => ({
  useTopTraders: () => ({
    traders: mockTraders,
    isLoading: mockIsLoading,
    isFetching: false,
    error: null,
    refresh: jest.fn(),
    toggleFollow: mockToggleFollow,
  }),
}));

const makeTrader = (overrides: Partial<TopTrader> = {}): TopTrader => ({
  id: 'profile-1',
  address: '0xabc',
  rank: 1,
  overallRank: 1,
  username: 'dutchiono',
  avatarUri: undefined,
  percentageChange: 12,
  pnlValue: 456900,
  pnlPerChain: {},
  isFollowing: false,
  ...overrides,
});

describe('SocialLeaderboardOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTraders = [
      makeTrader({ id: 'a', username: 'dutchiono', pnlValue: 456900 }),
      makeTrader({ id: 'b', username: 'raggedand', pnlValue: 324660, rank: 2 }),
      makeTrader({ id: 'c', username: 'aparjey', pnlValue: 120364, rank: 3 }),
    ];
    mockIsLoading = false;
    mockIsNotificationsEnabled = false;
    mockIsPushEnabled = false;
    mockNotificationsFeatureEnabled = true;
  });

  const renderComponent = () =>
    renderWithProvider(<SocialLeaderboardOnboarding />, {});

  const goToFollowSlide = () => {
    fireEvent.press(
      screen.getByTestId(SocialLeaderboardOnboardingSelectorsIDs.NEXT_BUTTON),
    );
  };

  it('renders the first slide with a Next button and tracks screen viewed', () => {
    renderComponent();

    expect(
      screen.getByTestId(SocialLeaderboardOnboardingSelectorsIDs.NEXT_BUTTON),
    ).toBeOnTheScreen();
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_SCREEN_VIEWED,
      expect.objectContaining({ screen: 'trade', source: 'nux' }),
    );
  });

  it('advances to the follow slide and renders top-three trader cards', () => {
    renderComponent();
    goToFollowSlide();

    expect(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.FOLLOW_TOP_THREE_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('dutchiono')).toBeOnTheScreen();
    expect(screen.getByText('raggedand')).toBeOnTheScreen();
    expect(screen.getByText('aparjey')).toBeOnTheScreen();
  });

  it('follows the not-yet-followed top traders and advances to the final slide', async () => {
    mockTraders[1] = makeTrader({
      id: 'b',
      username: 'raggedand',
      isFollowing: true,
    });
    renderComponent();
    goToFollowSlide();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          SocialLeaderboardOnboardingSelectorsIDs.FOLLOW_TOP_THREE_BUTTON,
        ),
      );
    });

    // Only the two non-following traders are toggled.
    expect(mockToggleFollow).toHaveBeenCalledTimes(2);
    expect(mockToggleFollow).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ source: 'nux' }),
    );
    expect(mockToggleFollow).not.toHaveBeenCalledWith('b', expect.anything());
    expect(
      screen.getByTestId(SocialLeaderboardOnboardingSelectorsIDs.GOT_IT_BUTTON),
    ).toBeOnTheScreen();
  });

  it('skips following when Maybe later is pressed', () => {
    renderComponent();
    goToFollowSlide();

    fireEvent.press(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.MAYBE_LATER_BUTTON,
      ),
    );

    expect(mockToggleFollow).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(SocialLeaderboardOnboardingSelectorsIDs.GOT_IT_BUTTON),
    ).toBeOnTheScreen();
  });

  it('disables Follow the top three while traders are loading', () => {
    mockIsLoading = true;
    mockTraders = [];
    renderComponent();
    goToFollowSlide();

    expect(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.FOLLOW_TOP_THREE_BUTTON,
      ),
    ).toBeDisabled();
  });

  it('shows the Allow notifications CTA when notifications are disabled', () => {
    renderComponent();
    goToFollowSlide();
    fireEvent.press(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.MAYBE_LATER_BUTTON,
      ),
    );

    expect(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.ALLOW_NOTIFICATIONS_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it('hides the Allow notifications CTA when notifications are already enabled', () => {
    mockIsNotificationsEnabled = true;
    mockIsPushEnabled = true;
    renderComponent();
    goToFollowSlide();
    fireEvent.press(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.MAYBE_LATER_BUTTON,
      ),
    );

    expect(
      screen.queryByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.ALLOW_NOTIFICATIONS_BUTTON,
      ),
    ).toBeNull();
  });

  it('enables notifications in background and exits to the leaderboard', async () => {
    renderComponent();
    goToFollowSlide();
    fireEvent.press(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.MAYBE_LATER_BUTTON,
      ),
    );

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(
          SocialLeaderboardOnboardingSelectorsIDs.ALLOW_NOTIFICATIONS_BUTTON,
        ),
      );
    });

    expect(mockRequestPushPermission).toHaveBeenCalled();
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true);
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, { source: 'nux' }),
    );
  });

  it('marks onboarding seen and replaces with the leaderboard on Got it', () => {
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
    renderComponent();
    goToFollowSlide();
    fireEvent.press(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.MAYBE_LATER_BUTTON,
      ),
    );
    fireEvent.press(
      screen.getByTestId(SocialLeaderboardOnboardingSelectorsIDs.GOT_IT_BUTTON),
    );

    expect(setItemSpy).toHaveBeenCalledWith(
      SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
      'true',
      { emitEvent: false },
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, { source: 'nux' }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_COMPLETED,
      expect.objectContaining({ source: 'nux' }),
    );
  });

  it('dismisses to wallet and marks seen when the close button is pressed', () => {
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
    renderComponent();

    fireEvent.press(
      screen.getByTestId(SocialLeaderboardOnboardingSelectorsIDs.CLOSE_BUTTON),
    );

    expect(setItemSpy).toHaveBeenCalledWith(
      SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
      'true',
      { emitEvent: false },
    );
    expect(mockGoBack).toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_DISMISSED,
      expect.objectContaining({ source: 'nux', screen: 'trade' }),
    );
  });
});
