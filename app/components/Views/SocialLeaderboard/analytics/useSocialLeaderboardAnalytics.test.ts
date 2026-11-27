import { renderHook, act } from '@testing-library/react-native';
import { useSocialLeaderboardAnalytics } from './useSocialLeaderboardAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockCreateEventBuilder = jest.fn();
let mockLinkedAddress: string | null = null;

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: () => mockLinkedAddress,
}));

describe('useSocialLeaderboardAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLinkedAddress = null;
    mockAddProperties.mockReturnThis();
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
      build: jest.fn().mockReturnValue({ event: 'built' }),
    }));
  });

  it('returns a track function', () => {
    const { result } = renderHook(() => useSocialLeaderboardAnalytics());
    expect(typeof result.current.track).toBe('function');
  });

  it('calls trackEvent with a built event when track is called with properties', () => {
    const { result } = renderHook(() => useSocialLeaderboardAnalytics());

    act(() => {
      result.current.track(
        MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
        {
          source: 'home_carousel',
          chain_filter: 'all',
        },
      );
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      has_social_profile: false,
      source: 'home_carousel',
      chain_filter: 'all',
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'built' });
  });

  it('adds has_social_profile false when there is no linked account', () => {
    const { result } = renderHook(() => useSocialLeaderboardAnalytics());

    act(() => {
      result.current.track(
        MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
      );
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      has_social_profile: false,
    });
  });

  it('adds has_social_profile true when a linked account exists', () => {
    mockLinkedAddress = '0x1234567890abcdef1234567890abcdef12345678';
    const { result } = renderHook(() => useSocialLeaderboardAnalytics());

    act(() => {
      result.current.track(
        MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
      );
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      has_social_profile: true,
    });
  });

  it('lets a caller override has_social_profile for its own event', () => {
    const { result } = renderHook(() => useSocialLeaderboardAnalytics());

    act(() => {
      result.current.track(
        MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
        { has_social_profile: true },
      );
    });

    expect(mockAddProperties).toHaveBeenCalledWith({
      has_social_profile: true,
    });
  });
});
