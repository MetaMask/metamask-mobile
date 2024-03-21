/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import AvatarAccount from './variants/AvatarAccount';
import { AvatarAccountProps } from './variants/AvatarAccount/AvatarAccount.types';
import AvatarFavicon from './variants/AvatarFavicon';
import { AvatarFaviconProps } from './variants/AvatarFavicon/AvatarFavicon.types';
import AvatarIcon from './variants/AvatarIcon';
import { AvatarIconProps } from './variants/AvatarIcon/AvatarIcon.types';
import AvatarNetwork from './variants/AvatarNetwork';
import { AvatarNetworkProps } from './variants/AvatarNetwork/AvatarNetwork.types';
import AvatarToken from './variants/AvatarToken';
import { AvatarTokenProps } from './variants/AvatarToken/AvatarToken.types';

// Internal dependencies.
import { AvatarProps, AvatarVariant } from './Avatar.types';

const Avatar = ({ variant, ...props }: AvatarProps) => {
  switch (variant) {
    case AvatarVariant.Account:
      return <AvatarAccount {...(props as AvatarAccountProps)} />;
    case AvatarVariant.Favicon:
      return <AvatarFavicon {...(props as AvatarFaviconProps)} />;
    case AvatarVariant.Icon:
      return <AvatarIcon {...(props as AvatarIconProps)} />;
    case AvatarVariant.Network:
      return <AvatarNetwork {...(props as AvatarNetworkProps)} />;
    case AvatarVariant.Token:
      return <AvatarToken {...(props as AvatarTokenProps)} />;
    default:
      throw new Error('Invalid Avatar Variant');
  }
};

export default Avatar;
