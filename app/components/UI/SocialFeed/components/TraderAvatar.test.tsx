import { brandColor } from '@metamask/design-tokens';
import { screen } from '@testing-library/react-native';
import React from 'react';
import { Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import { AvatarAccount } from '@metamask/design-system-react-native';
import { FoxiconVariant } from '../../../../component-library/components-temp/Foxicon';
import { assetByFoxiconVariant } from '../../../../component-library/components-temp/Foxicon/Foxicon.assets';
import renderWithProvider from '../../../../util/test/renderWithProvider';
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

  it('keeps the avatar on disk so a recycled cell does not pin a decoded bitmap', () => {
    renderWithProvider(
      <TraderAvatar
        imageUrl={REAL_AVATAR_URL}
        address={ADDRESS}
        size={40}
        recyclingKey="trader-1"
        testID="trader-avatar"
      />,
    );

    const image = screen.UNSAFE_getByType(Image);
    expect(image.props.cachePolicy).toBe('disk');
    expect(image.props.recyclingKey).toBe('trader-1');
    expect(image.props.contentFit).toBe('cover');
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

  it('renders the profile preset for a foxicon avatar url', () => {
    renderWithProvider(
      <TraderAvatar
        imageUrl="foxicon://astronaut/sky"
        address={ADDRESS}
        size={40}
        testID="trader-avatar"
      />,
    );

    expect(screen.getByTestId('trader-avatar')).toHaveStyle({
      backgroundColor: brandColor.indigo200,
    });
    expect(screen.UNSAFE_getByType(RNImage).props.source).toBe(
      assetByFoxiconVariant[FoxiconVariant.Astro],
    );
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
    expect(screen.UNSAFE_queryByType(AvatarAccount)).toBeNull();
  });

  it.each(['foxicon://retired/lime', 'foxicon://royal/background1'])(
    'renders the astronaut on the sky backdrop for %s',
    (imageUrl) => {
      renderWithProvider(
        <TraderAvatar
          imageUrl={imageUrl}
          address={ADDRESS}
          size={32}
          testID="trader-avatar"
        />,
      );

      expect(screen.getByTestId('trader-avatar')).toHaveStyle({
        backgroundColor: brandColor.indigo200,
      });
      expect(screen.UNSAFE_getByType(RNImage).props.source).toBe(
        assetByFoxiconVariant[FoxiconVariant.Astro],
      );
      expect(screen.UNSAFE_queryByType(AvatarAccount)).toBeNull();
    },
  );

  it('renders the Maskicon fallback without an address', () => {
    renderWithProvider(<TraderAvatar size={24} />);

    expect(screen.UNSAFE_queryByType(AvatarAccount)).not.toBeNull();
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  it('seeds the Maskicon with the profile id even when a wallet address is set', () => {
    renderWithProvider(
      <TraderAvatar address={ADDRESS} profileId="profile-1" size={40} />,
    );

    expect(screen.UNSAFE_getByType(AvatarAccount).props.address).toBe(
      'profile-1',
    );
  });

  it('seeds the Maskicon with the wallet address when the profile id is blank', () => {
    renderWithProvider(
      <TraderAvatar address={ADDRESS} profileId="  " size={40} />,
    );

    expect(screen.UNSAFE_getByType(AvatarAccount).props.address).toBe(ADDRESS);
  });
});
