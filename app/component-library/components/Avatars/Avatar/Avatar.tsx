/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import AvatarIcon from './variants/AvatarIcon';
import AvatarImage from './variants/AvatarImage';
import AvatarInitial from './variants/AvatarInitial';
import AvatarJazzIcon from './variants/AvatarJazzIcon';

// Internal dependencies.
import { AvatarProps, AvatarVariants } from './Avatar.types';

const Avatar = (avatarProps: AvatarProps) => {
  switch (avatarProps.variant) {
    case AvatarVariants.Icon:
      return <AvatarIcon {...avatarProps} />;
    case AvatarVariants.Image:
      return <AvatarImage {...avatarProps} />;
    case AvatarVariants.Initial:
      return <AvatarInitial {...avatarProps} />;
    case AvatarVariants.JazzIcon:
      return <AvatarJazzIcon {...avatarProps} />;
    default:
      throw new Error('Invalid Avatar Variant');
  }
};

export default Avatar;
