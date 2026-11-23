import { renderHook } from '@testing-library/react-native';

import { MetaMetricsEvents } from '../core/Analytics';
import { SocialEvent } from '../components/Views/SocialLeaderboard/analytics/socialEvents';
import { useManageProfileAnalytics } from './useManageProfileAnalytics';

const { Interaction, Screen, Outcome } = SocialEvent;
const mockTrack = jest.fn();
let mockIsTreatment = true;

jest.mock('react-redux', () => ({
  useSelector: () => mockIsTreatment,
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

jest.mock(
  '../components/Views/SocialLeaderboard/analytics/useSocialLeaderboardAnalytics',
  () => ({
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  }),
);

describe('useManageProfileAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTreatment = true;
  });

  it('records a profile edit without a screen view', () => {
    const { result } = renderHook(() => useManageProfileAnalytics());

    expect(mockTrack).not.toHaveBeenCalled();

    result.current();

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_UI_INTERACTION,
      expect.objectContaining({
        interaction_type: Interaction.PROFILE_EDITED,
        screen_name: Screen.MANAGE_PROFILE,
        outcome: Outcome.SUCCESS,
      }),
    );
  });

  it('emits nothing when the Social V1 treatment is inactive', () => {
    mockIsTreatment = false;

    const { result } = renderHook(() => useManageProfileAnalytics());

    result.current();

    expect(mockTrack).not.toHaveBeenCalled();
  });
});
