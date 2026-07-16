import { act, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { StackActions } from '@react-navigation/native';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import StorageWrapper from '../../../../store/storage-wrapper';
import { SOCIAL_LEADERBOARD_ONBOARDING_SHOWN } from '../../../../constants/storage';
// eslint-disable-next-line import-x/no-restricted-paths
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';
import SocialLeaderboardOnboarding from './SocialLeaderboardOnboarding';
import { SocialLeaderboardOnboardingSelectorsIDs } from './SocialLeaderboardOnboarding.testIds';
import {
  REFERENCED_ASSETS_TIMEOUT_MS,
  RIVE_AVATAR_ASSET_KEYS,
  RIVE_AVATAR_PLACEHOLDERS,
  RIVE_TOKEN_ASSET_SOURCES,
  RIVE_BOOLEAN_BINDINGS,
  RIVE_TRANSITION_SPEED,
  RIVE_TRIGGERS,
  riveStepTextBinding,
  riveTraderBinding,
} from './constants';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};

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

// Local Rive mock: render a plain View, capture onError, referencedAssets and
// the per-trigger callbacks so tests can drive the state machine directly, and
// record every string/boolean binding push keyed by path.
let mockOnError:
  | ((error: { message: string; type: string }) => void)
  | undefined;
let mockReferencedAssets:
  | Record<string, { source: { uri: string } | number }>
  | undefined;
const mockTriggerCallbacks: Record<string, () => void | Promise<void>> = {};
const mockStringCalls: { path: string; value: string }[] = [];
const mockBooleanCalls: { path: string; value: boolean }[] = [];
const mockSetNumber = jest.fn();

jest.mock('rive-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: {
      testID?: string;
      onError?: (error: { message: string; type: string }) => void;
      referencedAssets?: Record<string, { source: { uri: string } | number }>;
    }) => {
      mockOnError = props.onError;
      mockReferencedAssets = props.referencedAssets;
      return <View testID={props.testID} />;
    },
    useRive: () => [jest.fn(), {}],
    useRiveString: (_riveRef: unknown, path: string) => [
      undefined,
      (value: string) => {
        mockStringCalls.push({ path, value });
      },
    ],
    useRiveNumber: () => [undefined, mockSetNumber],
    useRiveBoolean: (_riveRef: unknown, path: string) => [
      undefined,
      (value: boolean) => {
        mockBooleanCalls.push({ path, value });
      },
    ],
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
    RNRiveErrorType: {
      FileNotFound: 'FileNotFound',
      UnsupportedRuntimeVersion: 'UnsupportedRuntimeVersion',
      IncorrectRiveFileUrl: 'IncorrectRiveFileUrl',
      IncorrectAnimationName: 'IncorrectAnimationName',
      MalformedFile: 'MalformedFile',
      IncorrectArtboardName: 'IncorrectArtboardName',
      IncorrectStateMachineName: 'IncorrectStateMachineName',
      IncorrectStateMachineInput: 'IncorrectStateMachineInput',
      TextRunNotFoundError: 'TextRunNotFoundError',
      DataBindingError: 'DataBindingError',
      UnusedReferencedAssetError: 'UnusedReferencedAssetError',
    },
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

// Advance to the terminal Notify step the way the Rive would: Trade -> Follow
// (`next`) -> Notify (`followTopTraders`). Completion triggers are gated on this
// step, so tests must reach it before firing `gotIt`/`allowNotifications`.
//
// Entering the Notify slide pulses the visible button's completion trigger as it
// animates in (same as the maybe-later transition), which the component swallows
// exactly once. We reproduce that spurious pulse here so the helper leaves the
// component in the same state as the real runtime — latch consumed — and the
// caller's own `gotIt`/`allowNotifications` acts as the user's real tap.
const advanceToNotifyStep = async () => {
  await fireTrigger(RIVE_TRIGGERS.NEXT);
  await fireTrigger(RIVE_TRIGGERS.FOLLOW_TOP_TRADERS);
  // Spurious entry pulse from the follow-path Notify transition (swallowed).
  await fireTrigger(RIVE_TRIGGERS.GOT_IT);
};

const getLastStringValue = (path: string) =>
  mockStringCalls.filter((call) => call.path === path).pop()?.value;

const getLastBooleanValue = (path: string) =>
  mockBooleanCalls.filter((call) => call.path === path).pop()?.value;

describe('SocialLeaderboardOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnError = undefined;
    mockReferencedAssets = undefined;
    mockStringCalls.length = 0;
    mockBooleanCalls.length = 0;
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
    renderWithProvider(
      <ToastContext.Provider value={{ toastRef: mockToastRef }}>
        <SocialLeaderboardOnboarding />
      </ToastContext.Provider>,
      {},
    );

  it('renders the Rive animation and tracks the first slide on mount', () => {
    renderComponent();

    expect(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.RIVE_ANIMATION,
      ),
    ).toBeOnTheScreen();
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_VIEWED,
      expect.objectContaining({ nux_step: 'step_1', source: 'nux' }),
    );
  });

  it('pushes config, readiness and button labels into the Rive bindings on load', () => {
    renderComponent();

    expect(mockSetNumber).toHaveBeenCalledWith(RIVE_TRANSITION_SPEED);
    expect(getLastBooleanValue(RIVE_BOOLEAN_BINDINGS.IS_READY)).toBe(true);

    // Button labels are still Rive-owned across stepText slots 1..4 (v4 removed
    // the title/content text runs — those are rendered by RN, see below).
    expect(getLastStringValue(riveStepTextBinding(1, 'primaryButton'))).toBe(
      'Next',
    );
    expect(getLastStringValue(riveStepTextBinding(2, 'primaryButton'))).toBe(
      'Follow the top ten',
    );
    expect(getLastStringValue(riveStepTextBinding(2, 'secondaryButton'))).toBe(
      'Maybe later',
    );
    // Notifications are OFF by default in these tests, so both Notify slots (3
    // follow-path and 4 maybe-later) prompt. The artboard's run names are
    // inverted vs their roles: `primaryButton` feeds the ghost (gotIt) button
    // and `secondaryButton` feeds the solid "Allow notifications" (enables) CTA.
    expect(getLastStringValue(riveStepTextBinding(3, 'primaryButton'))).toBe(
      'Got it',
    );
    expect(getLastStringValue(riveStepTextBinding(3, 'secondaryButton'))).toBe(
      'Allow notifications',
    );
    expect(getLastStringValue(riveStepTextBinding(4, 'primaryButton'))).toBe(
      'Got it',
    );
    expect(getLastStringValue(riveStepTextBinding(4, 'secondaryButton'))).toBe(
      'Allow notifications',
    );
  });

  it('pushes single "Got it" labels for both Notify slots when notifications are already enabled', () => {
    mockIsNotificationsEnabled = true;
    mockIsPushEnabled = true;
    renderComponent();

    // No prompt needed: both Notify slots collapse to "Got it" (paired with the
    // `allowNotificationsBoolean = false` single-button layout).
    expect(getLastStringValue(riveStepTextBinding(3, 'primaryButton'))).toBe(
      'Got it',
    );
    expect(getLastStringValue(riveStepTextBinding(3, 'secondaryButton'))).toBe(
      'Got it',
    );
    expect(getLastStringValue(riveStepTextBinding(4, 'primaryButton'))).toBe(
      'Got it',
    );
    expect(getLastStringValue(riveStepTextBinding(4, 'secondaryButton'))).toBe(
      'Got it',
    );
  });

  it('renders the current step title/description in React Native and advances with next', async () => {
    renderComponent();

    expect(
      screen.getByTestId(SocialLeaderboardOnboardingSelectorsIDs.STEP_TITLE),
    ).toHaveTextContent('Trade like a pro');
    expect(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.STEP_DESCRIPTION,
      ),
    ).toHaveTextContent(
      'Track in real time when they swap or trade perps, tokens, and real-world assets.',
    );

    await fireTrigger(RIVE_TRIGGERS.NEXT);

    expect(
      screen.getByTestId(SocialLeaderboardOnboardingSelectorsIDs.STEP_TITLE),
    ).toHaveTextContent('Follow the best');
    expect(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.STEP_DESCRIPTION,
      ),
    ).toHaveTextContent(
      'Tap to follow the top ten traders who are up big this week.',
    );
  });

  it('shows the "maybe later" Notify description variant after maybe later', async () => {
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.MAYBE_LATER);

    expect(
      screen.getByTestId(SocialLeaderboardOnboardingSelectorsIDs.STEP_TITLE),
    ).toHaveTextContent('Never miss a move');
    expect(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.STEP_DESCRIPTION,
      ),
    ).toHaveTextContent(
      "When you're ready, follow a trader to get notified the moment they make a move.",
    );
  });

  it('ignores a forward tap on the Follow slide so the user must pick a button', async () => {
    // The v6 artboard does not transition Follow on `next`, so a forward
    // side-tap must be a no-op: the overlay stays on "Follow the best" instead
    // of desyncing to the Notify copy while Rive keeps showing Follow.
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT); // Trade -> Follow
    await fireTrigger(RIVE_TRIGGERS.NEXT); // Follow -> (no-op)

    expect(
      screen.getByTestId(SocialLeaderboardOnboardingSelectorsIDs.STEP_TITLE),
    ).toHaveTextContent('Follow the best');
    expect(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.STEP_DESCRIPTION,
      ),
    ).toHaveTextContent(
      'Tap to follow the top ten traders who are up big this week.',
    );

    // Still on Follow (not a terminal step): a completion trigger must not exit.
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('shows the Allow-notifications button on the follow-path Notify step when prompting', async () => {
    // `true` = "Allow notifications", `false` = "Got it".
    renderComponent();

    // "Got it" until we reach the follow-path Notify slide (step 3).
    expect(getLastBooleanValue(RIVE_BOOLEAN_BINDINGS.ALLOW_NOTIFICATIONS)).toBe(
      false,
    );

    await advanceToNotifyStep();

    // On the follow-path Notify slide with prompting, show "Allow notifications".
    expect(getLastBooleanValue(RIVE_BOOLEAN_BINDINGS.ALLOW_NOTIFICATIONS)).toBe(
      true,
    );
  });

  it('shows the Allow-notifications button on the maybe-later Notify step when prompting', async () => {
    renderComponent();

    // Notifications OFF: step 3.1 (maybe later) also prompts with the two-button
    // layout (`true` = "Allow notifications" + "Got it").
    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.MAYBE_LATER);

    expect(getLastBooleanValue(RIVE_BOOLEAN_BINDINGS.ALLOW_NOTIFICATIONS)).toBe(
      true,
    );
  });

  it('shows a single Got-it button on the maybe-later Notify step when notifications are enabled', async () => {
    mockIsNotificationsEnabled = true;
    mockIsPushEnabled = true;
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.MAYBE_LATER);

    // No prompt needed: single "Got it" (`false`).
    expect(getLastBooleanValue(RIVE_BOOLEAN_BINDINGS.ALLOW_NOTIFICATIONS)).toBe(
      false,
    );
  });

  it('shows the Got-it button when notifications are already enabled', async () => {
    // `false` = "Got it".
    mockIsNotificationsEnabled = true;
    mockIsPushEnabled = true;
    renderComponent();

    await advanceToNotifyStep();

    expect(getLastBooleanValue(RIVE_BOOLEAN_BINDINGS.ALLOW_NOTIFICATIONS)).toBe(
      false,
    );
  });

  it('pushes live trader name and full (non-abbreviated) PnL into the cards', () => {
    renderComponent();

    expect(getLastStringValue(riveTraderBinding(1, 'name'))).toBe('dutchiono');
    expect(getLastStringValue(riveTraderBinding(1, 'profitAmount'))).toBe(
      '+$456,900',
    );
    expect(getLastStringValue(riveTraderBinding(2, 'name'))).toBe('raggedand');
    expect(getLastStringValue(riveTraderBinding(2, 'profitAmount'))).toBe(
      '+$324,660',
    );
    expect(getLastStringValue(riveTraderBinding(3, 'profitAmount'))).toBe(
      '+$120,364',
    );
  });

  it('streams live avatar URLs into the referenced asset slots when available', () => {
    mockTraders = [
      makeTrader({ id: 'a', avatarUri: 'https://img.example/a.png' }),
      makeTrader({ id: 'b', avatarUri: 'https://img.example/b.png', rank: 2 }),
      makeTrader({ id: 'c', avatarUri: 'https://img.example/c.png', rank: 3 }),
    ];
    renderComponent();

    expect(mockReferencedAssets?.[RIVE_AVATAR_ASSET_KEYS[0]]).toEqual({
      source: { uri: 'https://img.example/a.png' },
    });
    expect(mockReferencedAssets?.[RIVE_AVATAR_ASSET_KEYS[2]]).toEqual({
      source: { uri: 'https://img.example/c.png' },
    });
  });

  it('wires the static token logos into their referenced asset slots', () => {
    renderComponent();

    Object.entries(RIVE_TOKEN_ASSET_SOURCES).forEach(([assetKey, source]) => {
      expect(mockReferencedAssets?.[assetKey]).toEqual({ source });
    });
  });

  it('falls back to the bundled placeholder avatar when a trader has no real image', () => {
    mockTraders = [
      makeTrader({ id: 'a', avatarUri: undefined }),
      makeTrader({
        id: 'b',
        rank: 2,
        avatarUri:
          'https://daylight-images.s3.us-east-1.amazonaws.com/ens-fallback.png',
      }),
    ];
    renderComponent();

    expect(mockReferencedAssets?.[RIVE_AVATAR_ASSET_KEYS[0]]).toEqual({
      source: RIVE_AVATAR_PLACEHOLDERS[0],
    });
    // Known shared ENS placeholder also falls through to the bundled asset.
    expect(mockReferencedAssets?.[RIVE_AVATAR_ASSET_KEYS[1]]).toEqual({
      source: RIVE_AVATAR_PLACEHOLDERS[1],
    });
    // Missing trader slot still gets a placeholder.
    expect(mockReferencedAssets?.[RIVE_AVATAR_ASSET_KEYS[2]]).toEqual({
      source: RIVE_AVATAR_PLACEHOLDERS[2],
    });
  });

  it('mounts with bundled placeholder avatars if trader data has not settled within the timeout', () => {
    // A slow/offline fetch must not leave the artboard unmounted forever; after
    // REFERENCED_ASSETS_TIMEOUT_MS it mounts with placeholders regardless.
    jest.useFakeTimers();
    mockIsLoading = true;
    mockTraders = [];
    renderComponent();

    expect(
      screen.queryByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.RIVE_ANIMATION,
      ),
    ).not.toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(REFERENCED_ASSETS_TIMEOUT_MS);
    });

    expect(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.RIVE_ANIMATION,
      ),
    ).toBeOnTheScreen();
    expect(mockReferencedAssets?.[RIVE_AVATAR_ASSET_KEYS[0]]).toEqual({
      source: RIVE_AVATAR_PLACEHOLDERS[0],
    });

    jest.useRealTimers();
  });

  it('does not re-trigger the forced mount once trader data settles naturally first', () => {
    jest.useFakeTimers();
    mockIsLoading = false;
    mockTraders = [makeTrader({ id: 'a' })];
    renderComponent();

    expect(
      screen.getByTestId(
        SocialLeaderboardOnboardingSelectorsIDs.RIVE_ANIMATION,
      ),
    ).toBeOnTheScreen();
    const settledAssets = mockReferencedAssets;

    act(() => {
      jest.advanceTimersByTime(REFERENCED_ASSETS_TIMEOUT_MS);
    });

    // Assets were frozen from the natural settle; the timeout firing afterwards
    // must not recompute or remount them.
    expect(mockReferencedAssets).toBe(settledAssets);

    jest.useRealTimers();
  });

  it('tracks the follow step when next advances the flow', async () => {
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_VIEWED,
      expect.objectContaining({ nux_step: 'step_2', source: 'nux' }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'continue',
        nux_step: 'step_1',
        source: 'nux',
      }),
    );
  });

  it('tracks step_3 once across both notify variants', async () => {
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.FOLLOW_TOP_TRADERS);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_VIEWED,
      expect.objectContaining({ nux_step: 'step_3', source: 'nux' }),
    );

    mockTrack.mockClear();
    // Going back to Follow then into the "3.1" variant reports step_3 again, but
    // consecutive same-step views must never double-count.
    await fireTrigger(RIVE_TRIGGERS.BACK);
    mockTrack.mockClear();
    await fireTrigger(RIVE_TRIGGERS.MAYBE_LATER);
    expect(
      mockTrack.mock.calls.filter(
        ([event]) =>
          event === MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_VIEWED,
      ),
    ).toHaveLength(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_VIEWED,
      expect.objectContaining({ nux_step: 'step_3', source: 'nux' }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'maybe_later',
        nux_step: 'step_2',
        source: 'nux',
      }),
    );
  });

  it('does not re-track a step that is already the current one', async () => {
    renderComponent();
    mockTrack.mockClear();

    // `back` on the first step keeps the already-current step_1.
    await fireTrigger(RIVE_TRIGGERS.BACK);

    expect(mockTrack).not.toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_VIEWED,
      expect.anything(),
    );
  });

  it('follows the not-yet-followed top traders on followTopTraders without completing', async () => {
    mockTraders[1] = makeTrader({
      id: 'b',
      username: 'raggedand',
      isFollowing: true,
    });
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.FOLLOW_TOP_TRADERS);

    expect(mockToggleFollow).toHaveBeenCalledTimes(2);
    expect(mockToggleFollow).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ source: 'nux' }),
    );
    expect(mockToggleFollow).not.toHaveBeenCalledWith('b', expect.anything());
    // Follow is not terminal: the flow continues to the Notify step.
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_COMPLETED,
      expect.anything(),
    );
  });

  it('follows up to ten traders while only binding the three displayed cards', async () => {
    // The Rive artboard only has three trader-card slots, but "Follow the top
    // ten" must follow the full fetched set. Provide ten traders and assert all
    // ten are followed while only cards 1..3 receive live name/PnL bindings.
    mockTraders = Array.from({ length: 10 }, (_, index) =>
      makeTrader({
        id: `trader-${index + 1}`,
        username: `trader${index + 1}`,
        pnlValue: 100000 - index * 1000,
        rank: index + 1,
      }),
    );
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.FOLLOW_TOP_TRADERS);

    expect(mockToggleFollow).toHaveBeenCalledTimes(10);

    // Only the three displayed cards are bound into the artboard.
    expect(getLastStringValue(riveTraderBinding(3, 'name'))).toBe('trader3');
    expect(getLastStringValue(riveTraderBinding(4, 'name'))).toBeUndefined();

    // The pre-selected count reported on completion reflects the full ten.
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_COMPLETED,
      expect.objectContaining({
        traders_followed_count: 10,
        traders_pre_selected_count: 10,
      }),
    );
  });

  it('does not navigate when a terminal trigger fires before the Notify step', async () => {
    renderComponent();

    // Simulate a mis-wired earlier button firing the completion triggers while
    // still on Trade / Follow — the flow must stay put (the reported bug).
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);
    await fireTrigger(RIVE_TRIGGERS.ALLOW_NOTIFICATIONS);
    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);

    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_COMPLETED,
      expect.anything(),
    );
  });

  it('tracks follow_top_ten interaction with the count of traders followed', async () => {
    mockTraders[1] = makeTrader({
      id: 'b',
      username: 'raggedand',
      isFollowing: true,
    });
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.FOLLOW_TOP_TRADERS);
    // Spurious entry pulse from the follow-path Notify transition (swallowed).
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);
    // The user's real "Got it" tap on the Notify step completes the flow.
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'follow_top_ten',
        nux_step: 'step_2',
        source: 'nux',
      }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_COMPLETED,
      expect.objectContaining({
        source: 'nux',
        nux_step: 'step_3',
        traders_followed_count: 2,
        traders_pre_selected_count: 3,
      }),
    );
  });

  it('swallows the follow-path completion pulse, then completes on the real tap', async () => {
    // "Follow the top ten" advances to the Notify slide, whose transition
    // pulses the visible button's completion trigger as it animates in (observed
    // on Android; iOS timing hides it). That first pulse must be ignored so the
    // user is not ejected straight to the leaderboard the moment they follow —
    // the user's real tap afterwards must still complete the flow.
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.FOLLOW_TOP_TRADERS);

    // Spurious entry pulse of the visible completion trigger is swallowed.
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_COMPLETED,
      expect.anything(),
    );

    // The user's real tap afterwards completes the flow.
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, { source: 'nux' }),
    );
  });

  it('swallows an allowNotifications entry pulse on the follow-path Notify step', async () => {
    // The follow-path Notify slide shows the two-button ("Allow notifications")
    // layout while prompting, so its entry pulse can arrive on that trigger too.
    // It must be swallowed without requesting permission or navigating.
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.FOLLOW_TOP_TRADERS);

    await fireTrigger(RIVE_TRIGGERS.ALLOW_NOTIFICATIONS);
    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();

    // The real "Allow notifications" tap afterwards still enables and completes.
    await fireTrigger(RIVE_TRIGGERS.ALLOW_NOTIFICATIONS);
    expect(mockRequestPushPermission).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, {
        source: 'nux',
        showNotificationsBanner: false,
      }),
    );
  });

  it('enables notifications and completes on allowNotifications', async () => {
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
    renderComponent();

    await advanceToNotifyStep();
    await fireTrigger(RIVE_TRIGGERS.ALLOW_NOTIFICATIONS);

    expect(mockRequestPushPermission).toHaveBeenCalled();
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'allow_notifications',
        nux_step: 'step_3',
        source: 'nux',
      }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_ONBOARDING_NOTIFICATIONS_ENABLED,
      expect.objectContaining({ source: 'nux' }),
    );
    expect(setItemSpy).toHaveBeenCalledWith(
      SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
      'true',
      { emitEvent: false },
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_COMPLETED,
      expect.objectContaining({
        source: 'nux',
        nux_step: 'step_3',
        traders_followed_count: 3,
        traders_pre_selected_count: 3,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, {
        source: 'nux',
        showNotificationsBanner: false,
      }),
    );
  });

  it('waits for the enable to finish before navigating to the leaderboard', async () => {
    let resolveEnable!: () => void;
    mockEnableNotificationsInBackground.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveEnable = resolve;
      }),
    );
    renderComponent();

    await advanceToNotifyStep();

    // Fire the trigger but don't await it settling — the handler parks on the
    // still-pending enable promise.
    let handlerPromise: Promise<void> | undefined;
    await act(async () => {
      handlerPromise = mockTriggerCallbacks[
        RIVE_TRIGGERS.ALLOW_NOTIFICATIONS
      ]?.() as Promise<void> | undefined;
    });

    await waitFor(() =>
      expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true),
    );
    // Enable is still in flight, so we must not have navigated yet.
    expect(mockDispatch).not.toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, {
        source: 'nux',
        showNotificationsBanner: false,
      }),
    );

    // Once the enable resolves, the flow completes and navigates.
    await act(async () => {
      resolveEnable();
      await handlerPromise;
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, {
        source: 'nux',
        showNotificationsBanner: false,
      }),
    );
  });

  it('shows the "notifications on" toast after allow when permission is granted', async () => {
    mockRequestPushPermission.mockResolvedValueOnce(true);
    renderComponent();

    await advanceToNotifyStep();
    await fireTrigger(RIVE_TRIGGERS.ALLOW_NOTIFICATIONS);

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: ToastVariants.Plain,
        labelOptions: [{ label: 'Notifications are on', isBold: true }],
        descriptionOptions: {
          description:
            "We'll send you transactions, price alerts, and updates.",
        },
        startAccessory: expect.any(Object),
        customBottomOffset: expect.any(Number),
        hasNoTimeout: false,
      }),
    );
  });

  it('lands on the leaderboard with the nudge banner (no toast) when permission is denied (OS off)', async () => {
    mockRequestPushPermission.mockResolvedValueOnce(false);
    renderComponent();

    await advanceToNotifyStep();
    await fireTrigger(RIVE_TRIGGERS.ALLOW_NOTIFICATIONS);

    // No toast on denial — the leaderboard shows a persistent banner instead.
    expect(mockShowToast).not.toHaveBeenCalled();
    // Still completes the flow (user is never ejected) and asks the leaderboard
    // to surface the "turn on notifications" banner.
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, {
        source: 'nux',
        showNotificationsBanner: true,
      }),
    );
  });

  it('does not show a notification toast on the gotIt path', async () => {
    mockIsNotificationsEnabled = true;
    mockIsPushEnabled = true;
    renderComponent();

    await advanceToNotifyStep();
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('completes on gotIt without requesting notification permission', async () => {
    mockIsNotificationsEnabled = true;
    mockIsPushEnabled = true;
    renderComponent();

    await advanceToNotifyStep();
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);

    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'got_it',
        nux_step: 'step_3',
        source: 'nux',
      }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_COMPLETED,
      expect.objectContaining({
        source: 'nux',
        nux_step: 'step_3',
        traders_followed_count: 3,
        traders_pre_selected_count: 3,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, { source: 'nux' }),
    );
  });

  it('completes on the second Got-it trigger (gotIt 2) without requesting notification permission', async () => {
    mockIsNotificationsEnabled = true;
    mockIsPushEnabled = true;
    renderComponent();

    await advanceToNotifyStep();
    await fireTrigger(RIVE_TRIGGERS.GOT_IT_2);

    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'got_it',
        nux_step: 'step_3',
        source: 'nux',
      }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_COMPLETED,
      expect.objectContaining({
        source: 'nux',
        nux_step: 'step_3',
        traders_followed_count: 3,
        traders_pre_selected_count: 3,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, { source: 'nux' }),
    );
  });

  it('swallows the maybe-later completion pulse for gotIt 2, then completes on the real tap', async () => {
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.MAYBE_LATER);

    // Spurious entry pulse routed through the second Got-it trigger is swallowed.
    await fireTrigger(RIVE_TRIGGERS.GOT_IT_2);
    expect(mockDispatch).not.toHaveBeenCalled();

    // The user's real tap afterwards completes the flow.
    await fireTrigger(RIVE_TRIGGERS.GOT_IT_2);
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, { source: 'nux' }),
    );
  });

  it('completes only once even if a terminal trigger fires twice', async () => {
    mockIsNotificationsEnabled = true;
    mockIsPushEnabled = true;
    renderComponent();

    await advanceToNotifyStep();
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('swallows the completion pulse from the maybe-later transition, then completes on the real Got-it tap', async () => {
    // "Maybe later" advances to the Notify "3.1" slide, which only shows "Got it"
    // and whose transition pulses that trigger as it animates in. That first
    // pulse must be ignored; the user's real tap must still complete the flow and
    // must not request notification permission.
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.MAYBE_LATER);

    // Spurious entry pulse of the visible "Got it" trigger.
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_COMPLETED,
      expect.anything(),
    );

    // The user's real tap afterwards completes the flow, without prompting.
    await fireTrigger(RIVE_TRIGGERS.GOT_IT);
    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.SOCIAL_LEADERBOARD.VIEW, { source: 'nux' }),
    );
  });

  it('never completes on the hidden Allow-notifications trigger when notifications are already enabled', async () => {
    // With notifications enabled the Notify slides show a single "Got it", so
    // the "Allow notifications" trigger must never complete the flow or request
    // permission, no matter how often it fires.
    mockIsNotificationsEnabled = true;
    mockIsPushEnabled = true;
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.MAYBE_LATER);

    await fireTrigger(RIVE_TRIGGERS.ALLOW_NOTIFICATIONS);
    await fireTrigger(RIVE_TRIGGERS.ALLOW_NOTIFICATIONS);

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockRequestPushPermission).not.toHaveBeenCalled();
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
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'dismissed',
        nux_step: 'step_1',
        source: 'nux',
      }),
    );
    expect(mockTrack).not.toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_COMPLETED,
      expect.anything(),
    );
  });

  it('reports the current step in the dismissed interaction', async () => {
    renderComponent();

    await fireTrigger(RIVE_TRIGGERS.NEXT);
    await fireTrigger(RIVE_TRIGGERS.CLOSE);

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_INTERACTION,
      expect.objectContaining({
        interaction_type: 'dismissed',
        nux_step: 'step_2',
        source: 'nux',
      }),
    );
  });

  it('marks seen and exits to the leaderboard on a fatal Rive error without tracking completion', () => {
    const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
    renderComponent();

    act(() => {
      mockOnError?.({ message: 'boom', type: 'MalformedFile' });
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
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_ONBOARDING_COMPLETED,
      expect.anything(),
    );
  });

  it('stays on the onboarding for a non-fatal Rive error (missing binding / asset)', () => {
    renderComponent();

    act(() => {
      mockOnError?.({ message: 'no such property', type: 'DataBindingError' });
    });
    act(() => {
      mockOnError?.({
        message: 'unused avatar',
        type: 'UnusedReferencedAssetError',
      });
    });

    // A missing binding or unused referenced asset must not boot the user out.
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
