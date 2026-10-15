/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog */
import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  type MySocialProfile,
  useMyProfile,
} from '../../SocialLeaderboard/MyProfileView/hooks';
import {
  hasRecentSocialTrade,
  isRecentSocialActivityTimestamp,
} from '../../../../util/social/socialActivityStorage';
import {
  evaluateIsSocialTopTradersEligible,
  useIsSocialTopTradersEligible,
} from './useIsSocialTopTradersEligible';

jest.mock('../../SocialLeaderboard/MyProfileView/hooks', () => ({
  useMyProfile: jest.fn(),
}));

jest.mock('../../../../util/social/socialActivityStorage', () => ({
  ...jest.requireActual('../../../../util/social/socialActivityStorage'),
  hasRecentSocialTrade: jest.fn(),
  isRecentSocialActivityTimestamp: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseMyProfile = useMyProfile as jest.MockedFunction<
  typeof useMyProfile
>;
const mockHasRecentSocialTrade = hasRecentSocialTrade as jest.MockedFunction<
  typeof hasRecentSocialTrade
>;
const mockIsRecentSocialActivityTimestamp =
  isRecentSocialActivityTimestamp as jest.MockedFunction<
    typeof isRecentSocialActivityTimestamp
  >;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockFocusEffect = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => mockFocusEffect(callback),
}));

const walletId = 'entropy:wallet-1';
const PROFILE_CREATED_AT = new Date().toISOString();
const NOW = Date.parse(PROFILE_CREATED_AT);
const recentSocialProfile = {
  profileId: 'profile-1',
  createdAt: PROFILE_CREATED_AT,
} as MySocialProfile;
const staleSocialProfile = {
  profileId: 'profile-1',
  createdAt: new Date(NOW - 49 * 60 * 60 * 1000).toISOString(),
} as MySocialProfile;

describe('useIsSocialTopTradersEligible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMyProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockHasRecentSocialTrade.mockReturnValue(false);
    mockIsRecentSocialActivityTimestamp.mockReturnValue(false);
    mockUseSelector.mockReturnValue(walletId);
  });

  describe('evaluateIsSocialTopTradersEligible', () => {
    it('returns true for a user with a social profile', () => {
      mockIsRecentSocialActivityTimestamp.mockReturnValue(true);

      const result = evaluateIsSocialTopTradersEligible(
        recentSocialProfile,
        walletId,
        NOW,
      );

      expect(result).toBe(true);
      expect(mockHasRecentSocialTrade).not.toHaveBeenCalled();
    });

    it('returns false for a stale social profile without a recent trade', () => {
      const result = evaluateIsSocialTopTradersEligible(
        staleSocialProfile,
        walletId,
        NOW,
      );

      expect(result).toBe(false);
    });

    it('returns true for a user with a recent social trade', () => {
      mockHasRecentSocialTrade.mockReturnValue(true);

      const result = evaluateIsSocialTopTradersEligible(null, walletId, NOW);

      expect(result).toBe(true);
      expect(mockHasRecentSocialTrade).toHaveBeenCalledWith(walletId, NOW);
    });

    it('returns false without a social profile or recent trade', () => {
      const result = evaluateIsSocialTopTradersEligible(null, walletId, NOW);

      expect(result).toBe(false);
    });

    it('returns false for a profile without a creation timestamp', () => {
      const result = evaluateIsSocialTopTradersEligible(
        { profileId: 'unlinked-profile' } as MySocialProfile,
        walletId,
        NOW,
      );

      expect(result).toBe(false);
    });
  });

  it('resolves eligibility during the first render', () => {
    mockUseMyProfile.mockReturnValue({
      profile: recentSocialProfile,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockIsRecentSocialActivityTimestamp.mockReturnValue(true);

    const { result } = renderHook(() => useIsSocialTopTradersEligible());

    expect(result.current).toBe(true);
  });

  it('does not re-evaluate when profile changes while the homepage is focused', () => {
    const { result, rerender } = renderHook(() =>
      useIsSocialTopTradersEligible(),
    );
    const [initialFocusCallback] = mockFocusEffect.mock.calls[0] as [
      () => void,
    ];

    mockUseMyProfile.mockReturnValue({
      profile: recentSocialProfile,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockIsRecentSocialActivityTimestamp.mockReturnValue(true);
    rerender({});

    expect(result.current).toBe(false);
    expect(mockFocusEffect.mock.calls.at(-1)?.[0]).toBe(initialFocusCallback);

    act(() => initialFocusCallback());

    expect(result.current).toBe(true);
  });

  it('re-evaluates eligibility when the homepage regains focus', () => {
    const { result } = renderHook(() => useIsSocialTopTradersEligible());

    expect(result.current).toBe(false);

    mockHasRecentSocialTrade.mockReturnValue(true);
    const [focusCallback] = mockFocusEffect.mock.calls.at(-1) as [() => void];

    act(() => focusCallback());

    expect(result.current).toBe(true);
  });

  it('drops eligibility when the social profile and trade window are absent on focus', () => {
    mockUseMyProfile.mockReturnValue({
      profile: recentSocialProfile,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockIsRecentSocialActivityTimestamp.mockReturnValue(true);

    const { result, rerender } = renderHook(() =>
      useIsSocialTopTradersEligible(),
    );

    expect(result.current).toBe(true);

    mockUseMyProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    rerender({});
    mockIsRecentSocialActivityTimestamp.mockReturnValue(false);
    const [focusCallback] = mockFocusEffect.mock.calls.at(-1) as [() => void];

    act(() => focusCallback());

    expect(result.current).toBe(false);
  });
});
