/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import AvatarIcon from './variants/AvatarIcon';
import AvatarImage from './variants/AvatarImage';
import AvatarInitial from './variants/AvatarInitial';
import AvatarJazzIcon from './variants/AvatarJazzIcon';

// Internal dependencies.
import { Avatar2Props, AvatarVariants } from './Avatar2.types';

const Avatar2 = (avatar2Props: Avatar2Props) => {
  switch (avatar2Props.variant) {
    case AvatarVariants.Icon:
      return <AvatarIcon {...avatar2Props} />;
    case AvatarVariants.Image:
      return <AvatarImage {...avatar2Props} />;
    case AvatarVariants.Initial:
      return <AvatarInitial {...avatar2Props} />;
    case AvatarVariants.JazzIcon:
      return <AvatarJazzIcon {...avatar2Props} />;
    default:
      throw new Error('Invalid Avatar Variant');
  }
};

export default Avatar2;
