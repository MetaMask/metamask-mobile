/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import { act, renderHook } from '@testing-library/react-native';
import {
  type MySocialProfile,
  useMyProfile,
} from '../../SocialLeaderboard/MyProfileView/hooks';
import { hasRecentSocialTrade } from '../../../../util/social/socialActivityStorage';
import {
  evaluateIsSocialTopTradersEligible,
  useIsSocialTopTradersEligible,
} from './useIsSocialTopTradersEligible';

jest.mock('../../SocialLeaderboard/MyProfileView/hooks', () => ({
  useMyProfile: jest.fn(),
}));

jest.mock('../../../../util/social/socialActivityStorage', () => ({
  hasRecentSocialTrade: jest.fn(),
}));

const mockUseMyProfile = jest.mocked(useMyProfile);
const mockHasRecentSocialTrade = jest.mocked(hasRecentSocialTrade);
const mockFocusEffect = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => mockFocusEffect(callback),
}));

const NOW = 1_760_000_000_000;
const socialProfile = {
  profileId: 'profile-1',
} as MySocialProfile;

const setProfile = (profile: MySocialProfile | null) => {
  mockUseMyProfile.mockReturnValue({
    profile,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  });
};

describe('useIsSocialTopTradersEligible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setProfile(null);
    mockHasRecentSocialTrade.mockReturnValue(false);
  });

  describe('evaluateIsSocialTopTradersEligible', () => {
    it('returns true for any social profile', () => {
      const result = evaluateIsSocialTopTradersEligible(socialProfile, NOW);

      expect(result).toBe(true);
      expect(mockHasRecentSocialTrade).not.toHaveBeenCalled();
    });

    it('returns true for a recent social trade without a profile', () => {
      mockHasRecentSocialTrade.mockReturnValue(true);

      const result = evaluateIsSocialTopTradersEligible(null, NOW);

      expect(result).toBe(true);
      expect(mockHasRecentSocialTrade).toHaveBeenCalledWith(NOW);
    });

    it('returns false without a social profile or recent trade', () => {
      const result = evaluateIsSocialTopTradersEligible(null, NOW);

      expect(result).toBe(false);
    });
  });

  it('resolves eligibility during the first render', () => {
    setProfile(socialProfile);

    const { result } = renderHook(() => useIsSocialTopTradersEligible(true));

    expect(result.current).toBe(true);
  });

  it('uses a cached profile without hydrating it', () => {
    setProfile(socialProfile);

    const { result } = renderHook(() =>
      useIsSocialTopTradersEligible(true, false),
    );

    expect(result.current).toBe(true);
    expect(mockUseMyProfile).toHaveBeenCalledWith({ enabled: false });
  });

  it('does not evaluate eligibility when the experiment is disabled', () => {
    setProfile(socialProfile);
    mockHasRecentSocialTrade.mockReturnValue(true);

    const { result } = renderHook(() => useIsSocialTopTradersEligible(false));

    expect(result.current).toBe(false);
    expect(mockUseMyProfile).toHaveBeenCalledWith({ enabled: false });
    expect(mockHasRecentSocialTrade).not.toHaveBeenCalled();
  });

  it('does not re-evaluate when profile changes while the homepage is focused', () => {
    const { result, rerender } = renderHook(() =>
      useIsSocialTopTradersEligible(true),
    );
    const [focusCallback] = mockFocusEffect.mock.calls[0] as [() => void];

    setProfile(socialProfile);
    rerender({});

    expect(result.current).toBe(false);

    act(() => focusCallback());

    expect(result.current).toBe(true);
  });

  it('re-evaluates eligibility when the homepage regains focus', () => {
    const { result } = renderHook(() => useIsSocialTopTradersEligible(true));

    expect(result.current).toBe(false);

    mockHasRecentSocialTrade.mockReturnValue(true);
    const [focusCallback] = mockFocusEffect.mock.calls.at(-1) as [() => void];

    act(() => focusCallback());

    expect(result.current).toBe(true);
  });

  it('drops eligibility when the experiment is disabled', () => {
    setProfile(socialProfile);
    const { result, rerender } = renderHook(
      ({ enabled }) => useIsSocialTopTradersEligible(enabled),
      { initialProps: { enabled: true } },
    );

    rerender({ enabled: false });
    const [focusCallback] = mockFocusEffect.mock.calls.at(-1) as [() => void];
    act(() => focusCallback());

    expect(result.current).toBe(false);
  });
});
