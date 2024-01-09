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
import AvatarSkeleton from './foundation/AvatarSkeleton/AvatarSkeleton';

// Internal dependencies.
import { AvatarProps, AvatarVariant } from './Avatar.types';

const Avatar = ({ variant, isLoading, size, ...props }: AvatarProps) => {
  if (isLoading) {
    return <AvatarSkeleton size={size} />;
  }
  switch (variant) {
    case AvatarVariant.Account:
      return <AvatarAccount size={size} {...(props as AvatarAccountProps)} />;
    case AvatarVariant.Favicon:
      return <AvatarFavicon size={size} {...(props as AvatarFaviconProps)} />;
    case AvatarVariant.Icon:
      return <AvatarIcon size={size} {...(props as AvatarIconProps)} />;
    case AvatarVariant.Network:
      return <AvatarNetwork size={size} {...(props as AvatarNetworkProps)} />;
    case AvatarVariant.Token:
      return <AvatarToken size={size} {...(props as AvatarTokenProps)} />;
    default:
      throw new Error('Invalid Avatar Variant');
  }
};

export default Avatar;
