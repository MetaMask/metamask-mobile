import { act, screen } from '@testing-library/react-native';
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
import { RIVE_TRANSITION_SPEED, RIVE_TRIGGERS } from './constants';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

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

// Local Rive mock: render a plain View, capture onStateChanged/onError and the
// per-trigger callbacks so tests can drive the state machine directly.
let mockOnStateChanged:
  | ((stateMachineName: string, stateName: string) => void)
  | undefined;
let mockOnError:
  | ((error: { message: string; type: string }) => void)
  | undefined;
const mockTriggerCallbacks: Record<string, () => void | Promise<void>> = {};
const mockSetString = jest.fn();
const mockSetNumber = jest.fn();

jest.mock('rive-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: {
      testID?: string;
      onStateChanged?: (sm: string, state: string) => void;
      onError?: (error: { message: string; type: string }) => void;
    }) => {
      mockOnStateChanged = props.onStateChanged;
      mockOnError = props.onError;
      return <View testID={props.testID} />;
    },
    useRive: () => [jest.fn(), {}],
    useRiveString: () => [undefined, mockSetString],
    useRiveNumber: () => [undefined, mockSetNumber],
    useRiveTrigger: (
      _riveRef: unknown,
      path: string,
      callback: () => void | Promise<void>,
    ) => {
      mockTriggerCallbacks[path] = callback;
    },
    AutoBind: (value: boolean) => ({ type: 'autobind', value }),
    Fit: { Cover: 'cover', Layout: 'layout' },
    Alignment: { Center: 'center' },
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

const fireTrigger = async (path: string) => {
  await act(async () => {
    await mockTriggerCallbacks[path]?.();
  });
};

describe('SocialLeaderboardOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnStateChanged = undefined;
    mockOnError = undefined;
    Object.keys(mockTriggerCallbacks).forEach(
      (key) => delete mockTriggerCallbacks[key],
    );
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

  it('renders the Rive animation and tracks the first slide on mount', () => {
    renderComponent();

    expect(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.RIVE_ANIMATION,
      ),
    ).toBeOnTheScreen();
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_SCREEN_VIEWED,
      expect.objectContaining({ screen: 'trade', source: 'nux' }),
    );
  });

  it('pushes config and localized copy into the Rive bindings on load', () => {
    renderComponent();

    expect(mockSetNumber).toHaveBeenCalledWith(RIVE_TRANSITION_SPEED);
    expect(mockSetString).toHaveBeenCalled();
  });

  it('tracks the notify slide when the next trigger fires', async () => {
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_SCREEN_VIEWED,
      expect.objectContaining({ screen: 'notify', source: 'nux' }),
    );
  });

  it('enables notifications and advances to the follow slide on allowNotifications', async () => {
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.ALLOW_NOTIFICATIONS);

    expect(mockRequestPushPermission).toHaveBeenCalled();
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_NOTIFICATIONS_ENABLED,
      expect.objectContaining({ source: 'nux' }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_SCREEN_VIEWED,
      expect.objectContaining({ screen: 'follow', source: 'nux' }),
    );
    // Notify is not terminal, so the flow has not completed yet.
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not request permission when notifications are already enabled', async () => {
    mockIsNotificationsEnabled = true;
    mockIsPushEnabled = true;
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.ALLOW_NOTIFICATIONS);

    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_NOTIFICATIONS_ENABLED,
      expect.anything(),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_SCREEN_VIEWED,
      expect.objectContaining({ screen: 'follow', source: 'nux' }),
    );
  });

  it('advances to the follow slide without notifications on gotIt', async () => {
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.GOT_IT);

    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_SCREEN_VIEWED,
      expect.objectContaining({ screen: 'follow', source: 'nux' }),
    );
  });

  it('follows the not-yet-followed top traders and completes on followTopTraders', async () => {
    mockTraders[1] = makeTrader({
      id: 'b',
      username: 'raggedand',
      isFollowing: true,
    });
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.FOLLOW_TOP_TRADERS);

    expect(mockToggleFollow).toHaveBeenCalledTimes(2);
    expect(mockToggleFollow).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ source: 'nux' }),
    );
    expect(mockToggleFollow).not.toHaveBeenCalledWith('b', expect.anything());
    expect(setItemSpy).toHaveBeenCalledWith(
      SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
      'true',
      { emitEvent: false },
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_COMPLETED,
      expect.objectContaining({ source: 'nux' }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, { source: 'nux' }),
    );
  });

  it('skips following and completes on maybeLater', async () => {
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.MAYBE_LATER);

    expect(mockToggleFollow).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_COMPLETED,
      expect.objectContaining({ source: 'nux' }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, { source: 'nux' }),
    );
  });

  it('completes only once even if a terminal trigger fires twice', async () => {
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.MAYBE_LATER);
    await fireTrigger(RIVE_TRIGGERS.MAYBE_LATER);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('dismisses to wallet and marks seen on the close trigger', async () => {
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.CLOSE);

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

  it('reports the current slide in the dismissed event', async () => {
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.CLOSE);

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_DISMISSED,
      expect.objectContaining({ source: 'nux', screen: 'notify' }),
    );
  });

  it('marks seen and exits to the leaderboard on a Rive error without tracking completion', () => {
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
    renderComponent();

    act(() => {
      mockOnError?.({ message: 'boom', type: 'Malformed' });
    });

    expect(setItemSpy).toHaveBeenCalledWith(
      SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
      'true',
      { emitEvent: false },
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, { source: 'nux' }),
    );
    expect(mockTrack).not.toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_COMPLETED,
      expect.anything(),
    );
  });
});
