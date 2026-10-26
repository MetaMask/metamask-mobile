import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { NetworkTier } from '../../../../../util/deviceCapability/types';
import {
  DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  toFoxiconAvatarUrl,
} from '../../MyProfileView/avatarPresets';
import type { UseMyProfileResult } from '../../MyProfileView/hooks/useMyProfile';
import { SocialProfileOnboardingSelectorsIDs } from '../../ProfileOnboarding/SocialProfileOnboardingView.testIds';
import type { UseProfileControllerResult } from '../hooks/useProfileController';
import { EditProfileAvatarSelectorsIDs } from './EditProfileAvatarView.testIds';
import EditProfileAvatarView from './EditProfileAvatarView';

const mockGoBack = jest.fn();
const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);
const mockUseMyProfile = jest.fn<UseMyProfileResult, []>();
const mockUseProfileController = jest.fn<UseProfileControllerResult, []>();
const mockUseNetworkTier = jest.fn<NetworkTier | null, []>(() => 'WIFI');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockUseNetworkTier(),
}));

jest.mock('../../MyProfileView/hooks/useMyProfile', () => ({
  useMyProfile: () => mockUseMyProfile(),
}));

jest.mock('../hooks/useProfileController', () => ({
  useProfileController: () => mockUseProfileController(),
}));

const profile: NonNullable<UseMyProfileResult['profile']> = {
  profileId: 'current-user',
  displayName: 'Giga Whale',
  handle: 'giga-whale',
  imageUrl: null,
  avatarPresetId: 'vr',
  avatarBackgroundId: DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
  shareUrl: 'https://metamask.io/social/giga-whale',
};

describe('EditProfileAvatarView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockUseMyProfile.mockReturnValue({
      profile,
      isLoading: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseProfileController.mockReturnValue({
      isControllerBacked: true,
      profile: undefined,
      linkedAddresses: [],
      updateProfile: mockUpdateProfile,
      createProfile: jest.fn(),
      fetchAndUpdateProfile: jest.fn(),
      fetchAndUpdateXAccount: jest.fn(),
      disconnectX: jest.fn(),
      getXAuthorizationUrl: jest.fn(),
      checkUsernameAvailability: jest.fn(),
    });
  });

  it('saves the selected foxicon avatar and returns', async () => {
    renderWithProvider(<EditProfileAvatarView />);

    fireEvent.press(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.AVATAR_OPTION}-zombie`,
      ),
    );
    fireEvent.press(
      screen.getByTestId(EditProfileAvatarSelectorsIDs.SAVE_BUTTON),
    );

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        avatar_url: toFoxiconAvatarUrl(
          'zombie',
          DEFAULT_PROFILE_AVATAR_BACKGROUND_ID,
        ),
      });
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not write the profile while offline', () => {
    mockUseNetworkTier.mockReturnValue('NONE');

    renderWithProvider(<EditProfileAvatarView />);

    fireEvent.press(
      screen.getByTestId(EditProfileAvatarSelectorsIDs.SAVE_BUTTON),
    );

    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows the save error when the update fails', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('offline'));

    renderWithProvider(<EditProfileAvatarView />);

    fireEvent.press(
      screen.getByTestId(EditProfileAvatarSelectorsIDs.SAVE_BUTTON),
    );

    expect(
      await screen.findByText(
        strings('social_leaderboard.manage_profile.save_error'),
      ),
    ).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
