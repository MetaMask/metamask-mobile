/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import AvatarAccount from './AvatarAccount';
import AvatarFavicon from './AvatarFavicon';
import AvatarNetwork from './AvatarNetwork';
import AvatarToken from './AvatarToken';

// Internal dependencies.
import { AvatarProps, AvatarVariants } from './Avatar.types';

const Avatar = (avatarProps: AvatarProps) => {
  switch (avatarProps.variant) {
    case AvatarVariants.Account:
      return <AvatarAccount {...avatarProps} />;
    case AvatarVariants.Favicon:
      return <AvatarFavicon {...avatarProps} />;
    case AvatarVariants.Network:
      return <AvatarNetwork {...avatarProps} />;
    case AvatarVariants.Token:
      return <AvatarToken {...avatarProps} />;
    default:
      throw new Error('Invalid Avatar Variant');
  }
};

export default Avatar;
