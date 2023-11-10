/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import AvatarAccount from './variants/AvatarAccount';
import AvatarFavicon from './variants/AvatarFavicon';
import AvatarIcon from './variants/AvatarIcon';
import AvatarNetwork from './variants/AvatarNetwork';
import AvatarToken from './variants/AvatarToken';

// Internal dependencies.
import { AvatarProps, AvatarVariant } from './Avatar.types';

const Avatar = (avatarProps: AvatarProps) => {
  switch (avatarProps.variant) {
    case AvatarVariant.Account:
      return <AvatarAccount {...avatarProps} />;
    case AvatarVariant.Favicon:
      return <AvatarFavicon {...avatarProps} />;
    case AvatarVariant.Icon:
      return <AvatarIcon {...avatarProps} />;
    case AvatarVariant.Network:
      return <AvatarNetwork {...avatarProps} />;
    case AvatarVariant.Token:
      return <AvatarToken {...avatarProps} />;
    default:
      throw new Error('Invalid Avatar Variant');
  }
};

export default Avatar;
