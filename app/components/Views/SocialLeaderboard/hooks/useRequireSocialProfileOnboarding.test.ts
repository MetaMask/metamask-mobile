import { renderHook } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import type { UseMyProfileResult } from '../MyProfileView/hooks';
import { useRequireSocialProfileOnboarding } from './useRequireSocialProfileOnboarding';

const mockNavigate = jest.fn();
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

const linkedProfile: UseMyProfileResult['profile'] = {
  profileId: 'current-user',
  displayName: 'Giga Whale',
  handle: 'giga-whale',
  shareUrl: 'https://metamask.io/social/giga-whale',
  linkedAccountAddress: '0x1111111111111111111111111111111111111111',
};

describe('useRequireSocialProfileOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMyProfile.mockReturnValue({
      profile: linkedProfile,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  it('returns false and navigates to onboarding when no linked wallet exists', () => {
    mockUseMyProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useRequireSocialProfileOnboarding());

    const canContinue = result.current.ensureSocialProfileOnboarding();

    expect(canContinue).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
  });

  it('returns false and navigates to onboarding when the linked wallet is blank', () => {
    mockUseMyProfile.mockReturnValue({
      profile: {
        ...linkedProfile,
        linkedAccountAddress: '  ',
      },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useRequireSocialProfileOnboarding());

    const canContinue = result.current.ensureSocialProfileOnboarding();

    expect(canContinue).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
  });

  it('returns true without navigation when a linked wallet exists', () => {
    const { result } = renderHook(() => useRequireSocialProfileOnboarding());

    const canContinue = result.current.ensureSocialProfileOnboarding();

    expect(canContinue).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
