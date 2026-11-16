import { renderHook } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { SocialEvent } from './socialEvents';
import {
  useSocialScreenAnalytics,
  useSocialAnalytics,
} from './useSocialV1Analytics';
const { Interaction, Outcome, Screen, Tab } = SocialEvent;
const mockTrack = jest.fn();
let mockIsFocused = true;
let mockIsTreatment = true;
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockIsFocused,
}));
jest.mock('react-redux', () => ({
  useSelector: () => mockIsTreatment,
}));
jest.mock('./useSocialLeaderboardAnalytics', () => ({
  useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
}));
describe('useSocialAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = true;
    mockIsTreatment = true;
  });
  it('omits new events when the Social V1 treatment is inactive', () => {
    mockIsTreatment = false;
    const { result } = renderHook(() => useSocialAnalytics());
    result.current.trackInteraction({
      interaction_type: Interaction.TAP,
      screen_name: Screen.TRENDING,
    });
    expect(mockTrack).not.toHaveBeenCalled();
  });
  it.each([Outcome.CONTENT, Outcome.EMPTY, Outcome.ERROR] as const)(
    'tracks the %s terminal state once per activation',
    (outcome) => {
      const { rerender } = renderHook(
        ({ active, terminal }) =>
          useSocialScreenAnalytics(Screen.TRENDING, {
            tabName: Tab.TRENDING,
            outcome: terminal,
            isActive: active,
          }),
        {
          initialProps: {
            active: true,
            terminal: null as typeof outcome | null,
          },
        },
      );
      rerender({ active: true, terminal: outcome });
      rerender({ active: true, terminal: outcome });
      expect(mockTrack).toHaveBeenCalledTimes(1);
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_SCREEN_VIEWED,
        expect.objectContaining({ outcome }),
      );
    },
  );
  it('tracks again after tab reactivation and refocus', () => {
    const { rerender } = renderHook(
      ({ active }) =>
        useSocialScreenAnalytics(Screen.FOLLOWING, {
          tabName: Tab.FOLLOWING,
          outcome: Outcome.CONTENT,
          isActive: active,
        }),
      { initialProps: { active: true } },
    );
    rerender({ active: false });
    rerender({ active: true });
    expect(mockTrack).toHaveBeenCalledTimes(2);
    mockIsFocused = false;
    rerender({ active: true });
    mockIsFocused = true;
    rerender({ active: true });
    expect(mockTrack).toHaveBeenCalledTimes(3);
  });
  it('reports the feed source on Social Screen Viewed and omits it when unset', () => {
    renderHook(() =>
      useSocialScreenAnalytics(Screen.POST_TRADE_SHARE_SHEET, {
        source: SocialEvent.Source.SOCIAL_TRENDING,
        outcome: Outcome.CONTENT,
      }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_SCREEN_VIEWED,
      {
        screen_name: Screen.POST_TRADE_SHARE_SHEET,
        source: 'social_trending',
        outcome: Outcome.CONTENT,
      },
    );

    mockTrack.mockClear();
    renderHook(() =>
      useSocialScreenAnalytics(Screen.POST_COMPOSER, {
        outcome: Outcome.CONTENT,
      }),
    );
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_SCREEN_VIEWED,
      {
        screen_name: Screen.POST_COMPOSER,
        outcome: Outcome.CONTENT,
      },
    );
  });

  it('adds terms_version only on terms-step interactions', () => {
    const { result } = renderHook(() =>
      useSocialScreenAnalytics(Screen.PROFILE_ONBOARDING, {
        step: SocialEvent.Step.TERMS,
        outcome: null,
      }),
    );
    result.current(Interaction.BUTTON_CLICKED, Outcome.SUCCESS);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_UI_INTERACTION,
      {
        interaction_type: Interaction.BUTTON_CLICKED,
        screen_name: Screen.PROFILE_ONBOARDING,
        step: SocialEvent.Step.TERMS,
        outcome: Outcome.SUCCESS,
        terms_version: 'v1',
      },
    );

    mockTrack.mockClear();
    const username = renderHook(() =>
      useSocialScreenAnalytics(Screen.PROFILE_ONBOARDING, {
        step: SocialEvent.Step.USERNAME,
        outcome: null,
      }),
    );
    username.result.current(Interaction.USERNAME_SHUFFLED);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_UI_INTERACTION,
      {
        interaction_type: Interaction.USERNAME_SHUFFLED,
        screen_name: Screen.PROFILE_ONBOARDING,
        step: SocialEvent.Step.USERNAME,
      },
    );
    expect(mockTrack.mock.calls[0]?.[1]).not.toHaveProperty('terms_version');
  });

  it('sends share_destination only with post_shared', () => {
    const { result } = renderHook(() =>
      useSocialScreenAnalytics(Screen.POST_COMPOSER, {
        source: SocialEvent.Source.SOCIAL_FOLLOWING,
        outcome: null,
      }),
    );
    result.current(Interaction.POST_SHARED, {
      share_destination: SocialEvent.ShareDestination.METAMASK_POST,
    });
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_UI_INTERACTION,
      {
        interaction_type: Interaction.POST_SHARED,
        screen_name: Screen.POST_COMPOSER,
        source: 'social_following',
        share_destination: 'metamask_post',
      },
    );

    mockTrack.mockClear();
    result.current(Interaction.POST_SHARED);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_UI_INTERACTION,
      {
        interaction_type: Interaction.POST_SHARED,
        screen_name: Screen.POST_COMPOSER,
        source: 'social_following',
      },
    );
    expect(mockTrack.mock.calls[0]?.[1]).not.toHaveProperty(
      'share_destination',
    );

    mockTrack.mockClear();
    result.current(Interaction.BUTTON_CLICKED, {
      outcome: Outcome.SUCCESS,
      share_destination: SocialEvent.ShareDestination.EXTERNAL,
    });
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_UI_INTERACTION,
      {
        interaction_type: Interaction.BUTTON_CLICKED,
        screen_name: Screen.POST_COMPOSER,
        source: 'social_following',
        outcome: Outcome.SUCCESS,
      },
    );
  });

  it('keeps a single screen view when blur does not reset the latch', () => {
    const { rerender } = renderHook(() =>
      useSocialScreenAnalytics(Screen.MANAGE_PROFILE, {
        outcome: Outcome.CONTENT,
        resetWhenInactive: false,
      }),
    );
    expect(mockTrack).toHaveBeenCalledTimes(1);
    mockIsFocused = false;
    rerender(undefined);
    mockIsFocused = true;
    rerender(undefined);
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});
