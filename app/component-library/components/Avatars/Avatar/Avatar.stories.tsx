/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SAMPLE_AVATARACCOUNT_PROPS } from './variants/AvatarAccount/AvatarAccount.constants';
import { SAMPLE_AVATARFAVICON_PROPS } from './variants/AvatarFavicon/AvatarFavicon.constants';
import { SAMPLE_AVATARICON_PROPS } from './variants/AvatarIcon/AvatarIcon.constants';
import { SAMPLE_AVATARNETWORK_PROPS } from './variants/AvatarNetwork/AvatarNetwork.constants';
import { SAMPLE_AVATARTOKEN_PROPS } from './variants/AvatarToken/AvatarToken.constants';

// Internal dependencies.
import { AvatarVariant } from './Avatar.types';
import { default as AvatarComponent } from './Avatar';

const AvatarMeta = {
  title: 'Component Library / Avatars',
  component: AvatarComponent,
  argTypes: {
    variant: {
      options: AvatarVariant,
      control: {
        type: 'select',
      },
      defaultValue: AvatarVariant.Account,
    },
  },
};
export default AvatarMeta;

export const Avatar = {
  render: (args: { variant: AvatarVariant }) => {
    switch (args.variant) {
      case AvatarVariant.Account:
        return (
          <AvatarComponent
            variant={AvatarVariant.Account}
            {...SAMPLE_AVATARACCOUNT_PROPS}
          />
        );
      case AvatarVariant.Favicon:
        return (
          <AvatarComponent
            variant={AvatarVariant.Favicon}
            {...SAMPLE_AVATARFAVICON_PROPS}
          />
        );
      case AvatarVariant.Icon:
        return (
          <AvatarComponent
            variant={AvatarVariant.Icon}
            {...SAMPLE_AVATARICON_PROPS}
          />
        );
      case AvatarVariant.Network:
        return (
          <AvatarComponent
            variant={AvatarVariant.Network}
            {...SAMPLE_AVATARNETWORK_PROPS}
          />
        );
      case AvatarVariant.Token:
        return (
          <AvatarComponent
            variant={AvatarVariant.Token}
            {...SAMPLE_AVATARTOKEN_PROPS}
          />
        );
      default:
        throw new Error('Invalid Avatar Variant');
    }
  },
};
