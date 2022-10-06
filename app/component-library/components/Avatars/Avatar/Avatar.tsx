/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import AvatarAccount from './variants/AvatarAccount';
import AvatarFavicon from './variants/AvatarFavicon';
import AvatarIcon from './variants/AvatarIcon';
import AvatarNetwork from './variants/AvatarNetwork';
import AvatarToken from './variants/AvatarToken';

// Internal dependencies.
import { AvatarProps, AvatarVariants } from './Avatar.types';

const Avatar = (avatarProps: AvatarProps) => {
  switch (avatarProps.variant) {
    case AvatarVariants.Account:
      return <AvatarAccount {...avatarProps} />;
    case AvatarVariants.Favicon:
      return <AvatarFavicon {...avatarProps} />;
    case AvatarVariants.Icon:
      return <AvatarIcon {...avatarProps} />;
    case AvatarVariants.Network:
      return <AvatarNetwork {...avatarProps} />;
    case AvatarVariants.Token:
      return <AvatarToken {...avatarProps} />;
    default:
      throw new Error('Invalid Avatar Variant');
  }
};

export default Avatar;
