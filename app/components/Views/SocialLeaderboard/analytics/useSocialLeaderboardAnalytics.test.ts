import { renderHook, act } from '@testing-library/react-native';
import { useSocialLeaderboardAnalytics } from './useSocialLeaderboardAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ event: 'built' }),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

describe('useSocialLeaderboardAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a track function', () => {
    const { result } = renderHook(() => useSocialLeaderboardAnalytics());
    expect(typeof result.current.track).toBe('function');
  });

  it('calls trackEvent with a built event when track is called with properties', () => {
    const { result } = renderHook(() => useSocialLeaderboardAnalytics());

    act(() => {
      result.current.track(MetaMetricsEvents.SOCIAL_LEADERBOARD_SCREEN_VIEWED, {
        source: 'home_carousel',
        chain_filter: 'all',
      });
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_LEADERBOARD_SCREEN_VIEWED,
    );
    expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'built' });
  });

  it('calls trackEvent with an empty properties object when none are provided', () => {
    const { result } = renderHook(() => useSocialLeaderboardAnalytics());

    const builderMock = {
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ event: 'built-no-props' }),
    };
    mockCreateEventBuilder.mockReturnValueOnce(builderMock);

    act(() => {
      result.current.track(MetaMetricsEvents.SOCIAL_LEADERBOARD_SCREEN_VIEWED);
    });

    expect(builderMock.addProperties).toHaveBeenCalledWith({});
    expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'built-no-props' });
  });
});
