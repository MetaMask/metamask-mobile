import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AvatarBaseSize } from '@metamask/design-system-react-native';
import { brandColor } from '@metamask/design-tokens';

import { FoxiconVariant } from '../Foxicon';
import AvatarSocial from './AvatarSocial';
import { FOXICON_SIZE_BY_AVATARBASE_SIZE } from './AvatarSocial.constants';
import { AvatarSocialSelectorsIDs } from './AvatarSocial.testIds';
import { AvatarSocialBackgroundColor } from './AvatarSocial.types';

describe('AvatarSocial', () => {
  it('renders the avatar and the nested fox icon', () => {
    render(
      <AvatarSocial
        variant={FoxiconVariant.Base}
        backgroundColor={AvatarSocialBackgroundColor.Orange}
      />,
    );

    expect(
      screen.getByTestId(AvatarSocialSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(AvatarSocialSelectorsIDs.FOX_ICON),
    ).toBeOnTheScreen();
  });

  it('forwards the variant to the nested fox icon', () => {
    render(
      <AvatarSocial
        variant={FoxiconVariant.Pirate}
        backgroundColor={AvatarSocialBackgroundColor.Blue}
      />,
    );

    expect(
      screen.getByTestId(AvatarSocialSelectorsIDs.FOX_ICON).props.name,
    ).toBe(FoxiconVariant.Pirate);
  });

  it('applies the background color style from the brand color map', () => {
    render(
      <AvatarSocial
        variant={FoxiconVariant.Agent}
        backgroundColor={AvatarSocialBackgroundColor.Green2}
      />,
    );

    expect(screen.getByTestId(AvatarSocialSelectorsIDs.CONTAINER)).toHaveStyle({
      backgroundColor: brandColor.lime100,
    });
  });

  it.each(Object.values(AvatarBaseSize))(
    'sizes the fox icon to match the %s avatar size',
    (size) => {
      render(
        <AvatarSocial
          variant={FoxiconVariant.Zombie}
          backgroundColor={AvatarSocialBackgroundColor.Purple}
          size={size}
        />,
      );

      const foxIcon = screen.getByTestId(AvatarSocialSelectorsIDs.FOX_ICON);
      expect(foxIcon.props.width).toBe(FOXICON_SIZE_BY_AVATARBASE_SIZE[size]);
      expect(foxIcon.props.height).toBe(FOXICON_SIZE_BY_AVATARBASE_SIZE[size]);
    },
  );

  it('defaults to the medium avatar size when no size is provided', () => {
    render(
      <AvatarSocial
        variant={FoxiconVariant.Royal}
        backgroundColor={AvatarSocialBackgroundColor.Purple2}
      />,
    );

    const foxIcon = screen.getByTestId(AvatarSocialSelectorsIDs.FOX_ICON);
    expect(foxIcon.props.width).toBe(
      FOXICON_SIZE_BY_AVATARBASE_SIZE[AvatarBaseSize.Md],
    );
  });

  it('uses a custom testID when provided', () => {
    const customTestId = 'custom-avatar-social';

    render(
      <AvatarSocial
        variant={FoxiconVariant.Superhero}
        backgroundColor={AvatarSocialBackgroundColor.Blue2}
        testID={customTestId}
      />,
    );

    expect(screen.getByTestId(customTestId)).toBeOnTheScreen();
  });
});
