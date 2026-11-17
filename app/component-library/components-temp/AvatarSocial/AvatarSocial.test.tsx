import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AvatarBaseSize } from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';

import { FoxiconVariant } from '../Foxicon';
import AvatarSocial from './AvatarSocial';
import {
  BRAND_COLOR_BY_AVATARSOCIAL_BACKGROUND_COLOR,
  FOXICON_SIZE_BY_AVATARBASE_SIZE,
} from './AvatarSocial.constants';
import { AvatarSocialBackgroundColor } from './AvatarSocial.types';

jest.mock('../Foxicon', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Text } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    ...jest.requireActual('../Foxicon'),
    __esModule: true,
    default: ({ variant, size }: { variant: string; size: number }) =>
      createElement(Text, null, `${variant} ${size}`),
  };
});

describe('AvatarSocial', () => {
  it('renders the fox for the given variant', () => {
    render(
      <AvatarSocial
        variant={FoxiconVariant.Zombie}
        backgroundColor={AvatarSocialBackgroundColor.Background1}
      />,
    );

    expect(screen.getByText(/^zombie /)).toBeOnTheScreen();
  });

  it('renders with the image accessibility role', () => {
    render(
      <AvatarSocial
        variant={FoxiconVariant.Base}
        backgroundColor={AvatarSocialBackgroundColor.Background1}
        testID="avatar-social"
      />,
    );

    expect(screen.getByTestId('avatar-social')).toHaveProp(
      'accessibilityRole',
      'image',
    );
  });

  it.each(Object.values(AvatarSocialBackgroundColor))(
    'applies the brand color for the %s background slot',
    (backgroundColor) => {
      render(
        <AvatarSocial
          variant={FoxiconVariant.Base}
          backgroundColor={backgroundColor}
          testID="avatar-social"
        />,
      );

      expect(screen.getByTestId('avatar-social')).toHaveStyle({
        backgroundColor:
          brandColor[
            BRAND_COLOR_BY_AVATARSOCIAL_BACKGROUND_COLOR[backgroundColor]
          ],
      });
    },
  );

  it.each(Object.values(AvatarBaseSize))(
    'renders the fox at the matching pixel size for size %s',
    (size) => {
      render(
        <AvatarSocial
          variant={FoxiconVariant.Base}
          backgroundColor={AvatarSocialBackgroundColor.Background1}
          size={size}
        />,
      );

      expect(
        screen.getByText(`base ${FOXICON_SIZE_BY_AVATARBASE_SIZE[size]}`),
      ).toBeOnTheScreen();
    },
  );

  it('defaults to the medium size', () => {
    render(
      <AvatarSocial
        variant={FoxiconVariant.Base}
        backgroundColor={AvatarSocialBackgroundColor.Background1}
      />,
    );

    expect(
      screen.getByText(
        `base ${FOXICON_SIZE_BY_AVATARBASE_SIZE[AvatarBaseSize.Md]}`,
      ),
    ).toBeOnTheScreen();
  });

  it('applies the provided testID', () => {
    render(
      <AvatarSocial
        variant={FoxiconVariant.Base}
        backgroundColor={AvatarSocialBackgroundColor.Background1}
        testID="custom-avatar"
      />,
    );

    expect(screen.getByTestId('custom-avatar')).toBeOnTheScreen();
  });
});
