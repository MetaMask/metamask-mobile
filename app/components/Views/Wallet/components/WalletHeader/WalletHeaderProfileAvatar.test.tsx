import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import WalletHeaderProfileAvatar from './WalletHeaderProfileAvatar';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useMyProfile } from '../../../SocialLeaderboard/MyProfileView/hooks/useMyProfile';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

jest.mock(
  '../../../SocialLeaderboard/MyProfileView/hooks/useMyProfile',
  () => ({ useMyProfile: jest.fn() }),
);

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(() => 'WIFI'),
}));

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => 'MID'),
}));

const mockUseMyProfile = jest.mocked(useMyProfile);
const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockGetHardwareTier = jest.mocked(getHardwareTier);

const asProfileResult = (
  profile: ReturnType<typeof useMyProfile>['profile'],
): ReturnType<typeof useMyProfile> => ({
  profile,
  isLoading: false,
  error: null,
  refresh: jest.fn(),
});

describe('WalletHeaderProfileAvatar', () => {
  const avatarTestID = WalletViewSelectorsIDs.ACCOUNT_PICKER_AVATAR;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetworkTier.mockReturnValue('WIFI');
    mockGetHardwareTier.mockReturnValue('MID');
  });

  it('renders the profile API image when the profile has one', () => {
    mockUseMyProfile.mockReturnValue(
      asProfileResult({
        profileId: 'p1',
        displayName: 'Me',
        handle: 'me',
        imageUrl: 'https://example.com/me.png',
        shareUrl: 'https://metamask.io/social/me',
      }),
    );

    render(<WalletHeaderProfileAvatar />);

    expect(screen.getByTestId(avatarTestID)).toHaveProp('source', {
      uri: 'https://example.com/me.png',
    });
  });

  it('renders the saved avatar preset when the profile has no image', () => {
    mockUseMyProfile.mockReturnValue(
      asProfileResult({
        profileId: 'p1',
        displayName: 'Me',
        handle: 'me',
        imageUrl: null,
        avatarPresetId: 'zombie',
        avatarBackgroundId: 'lime',
        shareUrl: 'https://metamask.io/social/me',
      }),
    );

    render(<WalletHeaderProfileAvatar />);

    expect(screen.getByTestId(avatarTestID)).toBeOnTheScreen();
  });

  it('renders the placeholder while there is no profile', () => {
    mockUseMyProfile.mockReturnValue(asProfileResult(null));

    render(<WalletHeaderProfileAvatar />);

    const placeholder = screen.getByTestId(avatarTestID);

    expect(placeholder).toBeOnTheScreen();
    expect(StyleSheet.flatten(placeholder.props.style).backgroundColor).toBe(
      'transparent',
    );
  });

  it('refreshes the profile when the network is usable and memory is not low', () => {
    mockUseNetworkTier.mockReturnValue(null);
    mockGetHardwareTier.mockReturnValue(null);
    mockUseMyProfile.mockReturnValue(asProfileResult(null));

    render(<WalletHeaderProfileAvatar />);

    expect(mockUseMyProfile).toHaveBeenCalledWith({ enabled: true });
  });

  it.each(['NONE' as const, 'LOW' as const])(
    'keeps the stored profile and skips refresh for %s',
    (constraint) => {
      if (constraint === 'NONE') {
        mockUseNetworkTier.mockReturnValue('NONE');
      } else {
        mockGetHardwareTier.mockReturnValue('LOW');
      }
      mockUseMyProfile.mockReturnValue(asProfileResult(null));

      render(<WalletHeaderProfileAvatar />);

      expect(mockUseMyProfile).toHaveBeenCalledWith({ enabled: false });
      expect(screen.getByTestId(avatarTestID)).toBeOnTheScreen();
    },
  );
});
