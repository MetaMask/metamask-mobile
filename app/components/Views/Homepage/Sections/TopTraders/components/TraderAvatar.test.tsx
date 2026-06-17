import { screen } from '@testing-library/react-native';
import React from 'react';
import { Image } from 'react-native';
import { AvatarAccount } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { KNOWN_DEFAULT_AVATAR_URLS } from '../utils/avatarFallback';
import TraderAvatar from './TraderAvatar';

const REAL_AVATAR_URL = 'https://example.com/avatar.png';
const ENS_PLACEHOLDER_URL = KNOWN_DEFAULT_AVATAR_URLS[0];
const ADDRESS = '0x0000000000000000000000000000000000000001';

describe('TraderAvatar', () => {
  it('renders the image when a real image url is provided', () => {
    renderWithProvider(
      <TraderAvatar
        imageUrl={REAL_AVATAR_URL}
        address={ADDRESS}
        size={40}
        testID="trader-avatar"
      />,
    );

    expect(screen.getByTestId('trader-avatar')).toBeOnTheScreen();
    expect(screen.UNSAFE_queryByType(Image)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(AvatarAccount)).toBeNull();
  });

  it('renders the Maskicon fallback when no image url is provided', () => {
    renderWithProvider(<TraderAvatar address={ADDRESS} size={40} />);

    expect(screen.UNSAFE_queryByType(AvatarAccount)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  it('renders the Maskicon fallback for the shared ENS placeholder url', () => {
    renderWithProvider(
      <TraderAvatar
        imageUrl={ENS_PLACEHOLDER_URL}
        address={ADDRESS}
        size={32}
      />,
    );

    expect(screen.UNSAFE_queryByType(AvatarAccount)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  it('renders the Maskicon fallback without an address', () => {
    renderWithProvider(<TraderAvatar size={24} />);

    expect(screen.UNSAFE_queryByType(AvatarAccount)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });
});
