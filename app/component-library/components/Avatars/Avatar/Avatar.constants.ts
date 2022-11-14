/* eslint-disable import/prefer-default-export */
// External dependencies.
import { TEST_AVATAR_BLOCKIES_PROPS } from './variants/AvatarBlockies/AvatarBlockies.constants';

// Internal dependencies.
import { AvatarProps, AvatarSizes, AvatarVariants } from './Avatar.types';

// Defaults
export const DEFAULT_AVATAR_SIZE = AvatarSizes.Md;

// Test IDs
export const AVATAR_AVATAR_BLOCKIES_TEST_ID = 'avatar-avatar-blockies';
export const AVATAR_AVATAR_IMAGE_TEST_ID = 'avatar-avatar-image';
export const AVATAR_AVATAR_INITIAL_TEST_ID = 'avatar-avatar-initial';
export const AVATAR_AVATAR_JAZZICON_TEST_ID = 'avatar-avatar-jazzicon';

// Test const
export const TEST_AVATAR_PROPS: AvatarProps = {
  variant: AvatarVariants.Blockies,
  ...TEST_AVATAR_BLOCKIES_PROPS,
};
