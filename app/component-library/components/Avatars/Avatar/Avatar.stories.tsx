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
import { AvatarVariant, AvatarSize } from './Avatar.types';
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
    },
    size: {
      options: AvatarSize,
      control: {
        type: 'select',
      },
    },
    isLoading: {
      control: {
        type: 'boolean',
      },
    },
  },
};
export default AvatarMeta;

export const Avatar = {
  args: {
    variant: AvatarVariant.Account,
    size: AvatarSize.Md,
    isLoading: false,
  },
  render: (args: { variant: AvatarVariant }) => {
    switch (args.variant) {
      case AvatarVariant.Account:
        return <AvatarComponent {...SAMPLE_AVATARACCOUNT_PROPS} {...args} />;
      case AvatarVariant.Favicon:
        return <AvatarComponent {...SAMPLE_AVATARFAVICON_PROPS} {...args} />;
      case AvatarVariant.Icon:
        return <AvatarComponent {...SAMPLE_AVATARICON_PROPS} {...args} />;
      case AvatarVariant.Network:
        return <AvatarComponent {...SAMPLE_AVATARNETWORK_PROPS} {...args} />;
      case AvatarVariant.Token:
        return <AvatarComponent {...SAMPLE_AVATARTOKEN_PROPS} {...args} />;
      default:
        throw new Error('Invalid Avatar Variant');
    }
  },
};
