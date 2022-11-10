/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import AvatarBlockies from './variants/AvatarBlockies';
import AvatarImage from './variants/AvatarImage';
import AvatarInitial from './variants/AvatarInitial';
import AvatarJazzIcon from './variants/AvatarJazzIcon';

// Internal dependencies.
import { AvatarProps, AvatarVariants } from './Avatar.types';
import {
  AVATAR_AVATAR_BLOCKIES_TEST_ID,
  AVATAR_AVATAR_IMAGE_TEST_ID,
  AVATAR_AVATAR_INITIAL_TEST_ID,
  AVATAR_AVATAR_JAZZICON_TEST_ID,
} from './Avatar.constants';

const Avatar = (avatarProps: AvatarProps) => {
  switch (avatarProps.variant) {
    case AvatarVariants.Blockies:
      return (
        <AvatarBlockies
          {...avatarProps}
          testID={AVATAR_AVATAR_BLOCKIES_TEST_ID}
        />
      );
    case AvatarVariants.Image:
      return (
        <AvatarImage {...avatarProps} testID={AVATAR_AVATAR_IMAGE_TEST_ID} />
      );
    case AvatarVariants.Initial:
      return (
        <AvatarInitial
          {...avatarProps}
          testID={AVATAR_AVATAR_INITIAL_TEST_ID}
        />
      );
    case AvatarVariants.JazzIcon:
      return (
        <AvatarJazzIcon
          {...avatarProps}
          testID={AVATAR_AVATAR_JAZZICON_TEST_ID}
        />
      );
    default:
      throw new Error('Invalid Avatar Variant');
  }
};

export default Avatar;
