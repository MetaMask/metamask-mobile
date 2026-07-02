import React from 'react';
import { Linking } from 'react-native';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ProfileHeader from './ProfileHeader';
import { TraderProfileViewSelectorsIDs } from '../TraderProfileView.testIds';
import type { TraderProfile } from '@metamask/social-controllers';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

const baseProfile: TraderProfile = {
  profileId: 'trader-1',
  address: '0xabc',
  allAddresses: ['0xabc'],
  name: 'trader1',
  imageUrl: 'https://example.com/avatar.png',
};

describe('ProfileHeader', () => {
  it('renders the header container', () => {
    renderWithProvider(<ProfileHeader profile={baseProfile} />);
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.PROFILE_HEADER),
    ).toBeOnTheScreen();
  });

  it('renders the trader name', () => {
    renderWithProvider(<ProfileHeader profile={baseProfile} />);
    expect(screen.getByText('trader1')).toBeOnTheScreen();
  });

  it('renders avatar image when imageUrl is present', () => {
    renderWithProvider(<ProfileHeader profile={baseProfile} />);
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.PROFILE_HEADER),
    ).toBeOnTheScreen();
  });

  it('does not render a podium medal badge on the profile avatar', () => {
    renderWithProvider(<ProfileHeader profile={baseProfile} />);
    expect(screen.queryByTestId('rank-medal-1')).toBeNull();
    expect(screen.queryByTestId('rank-medal-2')).toBeNull();
    expect(screen.queryByTestId('rank-medal-3')).toBeNull();
  });

  it('renders Maskicon fallback when imageUrl is falsy', () => {
    const profileNoImage = { ...baseProfile, imageUrl: '' };
    renderWithProvider(<ProfileHeader profile={profileNoImage} />);
    expect(screen.getByText('trader1')).toBeOnTheScreen();
  });

  it('does not render a follower count', () => {
    renderWithProvider(<ProfileHeader profile={baseProfile} />);
    expect(screen.queryByText(/follower/i)).toBeNull();
  });

  it('renders without a fallback letter when imageUrl is undefined', () => {
    const profileWithoutImage: TraderProfile = {
      ...baseProfile,
      imageUrl: undefined,
    };

    renderWithProvider(<ProfileHeader profile={profileWithoutImage} />);

    expect(screen.queryByText('D')).toBeNull();
    expect(screen.getByText('trader1')).toBeOnTheScreen();
  });

  it('renders without a fallback letter when imageUrl is empty string', () => {
    const profileWithoutImage: TraderProfile = {
      ...baseProfile,
      imageUrl: '',
    };

    renderWithProvider(<ProfileHeader profile={profileWithoutImage} />);

    expect(screen.queryByText('D')).toBeNull();
    expect(screen.getByText('trader1')).toBeOnTheScreen();
  });

  describe('X (Twitter) icon', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders the X icon link when twitterHandle is provided', () => {
      renderWithProvider(
        <ProfileHeader profile={baseProfile} twitterHandle="trader1" />,
      );
      expect(
        screen.getByTestId(TraderProfileViewSelectorsIDs.TWITTER_LINK),
      ).toBeOnTheScreen();
    });

    it('does not render the X icon link when twitterHandle is null', () => {
      renderWithProvider(
        <ProfileHeader profile={baseProfile} twitterHandle={null} />,
      );
      expect(
        screen.queryByTestId(TraderProfileViewSelectorsIDs.TWITTER_LINK),
      ).toBeNull();
    });

    it('does not render the X icon link when twitterHandle is undefined', () => {
      renderWithProvider(<ProfileHeader profile={baseProfile} />);
      expect(
        screen.queryByTestId(TraderProfileViewSelectorsIDs.TWITTER_LINK),
      ).toBeNull();
    });

    it('calls Linking.openURL with the correct X URL when the icon is pressed', () => {
      renderWithProvider(
        <ProfileHeader profile={baseProfile} twitterHandle="trader1" />,
      );

      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.TWITTER_LINK),
      );

      expect(Linking.openURL).toHaveBeenCalledTimes(1);
      expect(Linking.openURL).toHaveBeenCalledWith('https://x.com/trader1');
    });
  });
});
