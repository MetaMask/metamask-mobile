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
