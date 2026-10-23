import { renderHook } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { SocialEventValues } from './socialEvents';
import {
  useSocialScreenViewed,
  useSocialV1Analytics,
} from './useSocialV1Analytics';

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

describe('useSocialV1Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = true;
    mockIsTreatment = true;
  });

  it('omits new events when the Social V1 treatment is inactive', () => {
    mockIsTreatment = false;
    const { result } = renderHook(() => useSocialV1Analytics());

    result.current.trackInteraction({
      interaction_type: SocialEventValues.INTERACTION_TYPE.TAP,
      screen_name: SocialEventValues.SCREEN_NAME.TRENDING,
    });

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it.each([
    SocialEventValues.OUTCOME.CONTENT,
    SocialEventValues.OUTCOME.EMPTY,
    SocialEventValues.OUTCOME.ERROR,
  ] as const)('tracks the %s terminal state once per activation', (outcome) => {
    const { rerender } = renderHook(
      ({ active, terminal }) =>
        useSocialScreenViewed({
          screenName: SocialEventValues.SCREEN_NAME.TRENDING,
          tabName: SocialEventValues.TAB_NAME.TRENDING,
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
      {
        screen_name: SocialEventValues.SCREEN_NAME.TRENDING,
        tab_name: SocialEventValues.TAB_NAME.TRENDING,
        outcome,
      },
    );
  });

  it('tracks a tab again after leaving and reactivating it', () => {
    const { rerender } = renderHook(
      ({ active }) =>
        useSocialScreenViewed({
          screenName: SocialEventValues.SCREEN_NAME.FOLLOWING,
          tabName: SocialEventValues.TAB_NAME.FOLLOWING,
          outcome: SocialEventValues.OUTCOME.CONTENT,
          isActive: active,
        }),
      { initialProps: { active: true } },
    );

    rerender({ active: false });
    rerender({ active: true });

    expect(mockTrack).toHaveBeenCalledTimes(2);
  });

  it('tracks a focused screen again after a blur', () => {
    const { rerender } = renderHook(() =>
      useSocialScreenViewed({
        screenName: SocialEventValues.SCREEN_NAME.MANAGE_PROFILE,
      }),
    );

    mockIsFocused = false;
    rerender(undefined);
    mockIsFocused = true;
    rerender(undefined);

    expect(mockTrack).toHaveBeenCalledTimes(2);
    expect(mockTrack).toHaveBeenLastCalledWith(
      MetaMetricsEvents.SOCIAL_SCREEN_VIEWED,
      {
        screen_name: SocialEventValues.SCREEN_NAME.MANAGE_PROFILE,
      },
    );
  });
});
