import React from 'react';
import { render, screen } from '@testing-library/react-native';
import WalletHeaderProfileAvatar from './WalletHeaderProfileAvatar';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useMyProfile } from '../../../SocialLeaderboard/MyProfileView/hooks/useMyProfile';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

jest.mock(
  '../../../SocialLeaderboard/MyProfileView/hooks/useMyProfile',
  () => ({ useMyProfile: jest.fn() }),
);

const mockUseMyProfile = jest.mocked(useMyProfile);

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

    expect(screen.getByTestId(avatarTestID)).toBeOnTheScreen();
  });
});
