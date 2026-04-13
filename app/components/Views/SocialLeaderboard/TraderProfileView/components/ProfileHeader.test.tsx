import React from 'react';
import { render } from '@testing-library/react-native';
import ProfileHeader from './ProfileHeader';
import type { TraderProfile } from '@metamask/social-controllers';

const baseProfile: TraderProfile = {
  profileId: 'trader-1',
  address: '0xabc',
  allAddresses: ['0xabc'],
  name: 'dutchiono',
  imageUrl: 'https://example.com/avatar.png',
};

describe('ProfileHeader', () => {
  it('renders the container with the expected testID', () => {
    const { getByTestId } = render(
      <ProfileHeader profile={baseProfile} followerCount={45} />,
    );
    expect(getByTestId('trader-profile-header')).toBeOnTheScreen();
  });

  it('displays the trader name', () => {
    const { getByText } = render(
      <ProfileHeader profile={baseProfile} followerCount={45} />,
    );
    expect(getByText('dutchiono')).toBeOnTheScreen();
  });

  it('displays the follower count', () => {
    const { getByText } = render(
      <ProfileHeader profile={baseProfile} followerCount={45} />,
    );
    expect(getByText('45 followers')).toBeOnTheScreen();
  });

  it('does not show the AvatarBase fallback letter when imageUrl is provided', () => {
    const { queryByText } = render(
      <ProfileHeader profile={baseProfile} followerCount={45} />,
    );
    // AvatarBase would show 'D' (first letter of 'dutchiono') as fallback
    expect(queryByText('D')).not.toBeOnTheScreen();
  });

  it('shows the AvatarBase fallback letter when imageUrl is not provided', () => {
    const profileNoImage: TraderProfile = {
      ...baseProfile,
      imageUrl: undefined,
    };
    const { getByText } = render(
      <ProfileHeader profile={profileNoImage} followerCount={45} />,
    );
    // AvatarBase shows the first letter of the name uppercased as fallbackText
    expect(getByText('D')).toBeOnTheScreen();
  });

  it('shows the AvatarBase fallback letter when imageUrl is an empty string', () => {
    const profileEmptyImage: TraderProfile = { ...baseProfile, imageUrl: '' };
    const { getByText } = render(
      <ProfileHeader profile={profileEmptyImage} followerCount={45} />,
    );
    expect(getByText('D')).toBeOnTheScreen();
  });

  it('displays zero followers correctly', () => {
    const { getByText } = render(
      <ProfileHeader profile={baseProfile} followerCount={0} />,
    );
    expect(getByText('0 followers')).toBeOnTheScreen();
  });

  it('displays a large follower count correctly', () => {
    const { getByText } = render(
      <ProfileHeader profile={baseProfile} followerCount={1234} />,
    );
    expect(getByText('1234 followers')).toBeOnTheScreen();
  });
});
