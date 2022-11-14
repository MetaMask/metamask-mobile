/* eslint-disable import/prefer-default-export */
// External dependencies.
import { SAMPLE_AVATAR_JAZZICON_PROPS } from './variants/AvatarJazzIcon/AvatarJazzIcon.constants';

// Internal dependencies.
import { AvatarProps, AvatarSizes, AvatarVariants } from './Avatar.types';

// Defaults
export const DEFAULT_AVATAR_SIZE = AvatarSizes.Md;

// Test IDs
export const AVATAR_AVATAR_BLOCKIES_TEST_ID = 'avatar-avatar-blockies';
export const AVATAR_AVATAR_IMAGE_TEST_ID = 'avatar-avatar-image';
export const AVATAR_AVATAR_INITIAL_TEST_ID = 'avatar-avatar-initial';
export const AVATAR_AVATAR_JAZZICON_TEST_ID = 'avatar-avatar-jazzicon';

// Sample consts
export const SAMPLE_AVATAR_PROPS: AvatarProps = {
  variant: AvatarVariants.JazzIcon,
  ...SAMPLE_AVATAR_JAZZICON_PROPS,
};
