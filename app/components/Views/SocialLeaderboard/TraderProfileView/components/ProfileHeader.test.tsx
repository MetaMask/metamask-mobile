import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ProfileHeader from './ProfileHeader';
import { TraderProfileViewSelectorsIDs } from '../TraderProfileView.testIds';
import type { TraderProfile } from '@metamask/social-controllers';

const baseProfile: TraderProfile = {
  profileId: 'trader-1',
  address: '0xabc',
  allAddresses: ['0xabc'],
  name: 'dutchiono',
  imageUrl: 'https://example.com/avatar.png',
};

describe('ProfileHeader', () => {
  it('renders the header container', () => {
    renderWithProvider(
      <ProfileHeader profile={baseProfile} followerCount={45} />,
    );
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
  });

  it('renders the trader name', () => {
    renderWithProvider(
      <ProfileHeader profile={baseProfile} followerCount={45} />,
    );
    expect(screen.getByText('dutchiono')).toBeOnTheScreen();
  });

  it('renders avatar image when imageUrl is present', () => {
    renderWithProvider(
      <ProfileHeader profile={baseProfile} followerCount={45} />,
    );
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
  });

  it('renders fallback AvatarBase when imageUrl is falsy', () => {
    const profileNoImage = { ...baseProfile, imageUrl: '' };
    renderWithProvider(
      <ProfileHeader profile={profileNoImage} followerCount={45} />,
    );
    expect(screen.getByText('dutchiono')).toBeOnTheScreen();
  });

  it('renders singular follower string when count is 1', () => {
    renderWithProvider(
      <ProfileHeader profile={baseProfile} followerCount={1} />,
    );
    expect(screen.getByText('1 follower')).toBeOnTheScreen();
  });

  it('renders plural followers string when count is greater than 1', () => {
    renderWithProvider(
      <ProfileHeader profile={baseProfile} followerCount={45} />,
    );
    expect(screen.getByText('45 followers')).toBeOnTheScreen();
  });

  it('renders plural followers string when count is 0', () => {
    renderWithProvider(
      <ProfileHeader profile={baseProfile} followerCount={0} />,
    );
    expect(screen.getByText('0 followers')).toBeOnTheScreen();
  });

  it('renders the fallback letter when imageUrl is undefined', () => {
    const profileWithoutImage: TraderProfile = {
      ...baseProfile,
      imageUrl: undefined,
    };

    renderWithProvider(
      <ProfileHeader profile={profileWithoutImage} followerCount={45} />,
    );

    expect(screen.getByText('D')).toBeOnTheScreen();
  });

  it('renders the fallback letter when imageUrl is empty', () => {
    const profileWithoutImage: TraderProfile = {
      ...baseProfile,
      imageUrl: '',
    };

    renderWithProvider(
      <ProfileHeader profile={profileWithoutImage} followerCount={45} />,
    );

    expect(screen.getByText('D')).toBeOnTheScreen();
  });
});
