/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import { ImageSourcePropType, ImagePropsBase } from 'react-native';

// Internal dependencies.
import { AvatarImageProps } from './AvatarImage.types';

// Test IDs
export const AVATAR_IMAGE_TEST_ID = 'avatar-image';
export const AVATAR_IMAGE_IMAGE_TEST_ID = 'avatar-image-image';

// Sample consts
export const SAMPLE_AVATAR_IMAGE_URI =
  'https://cryptologos.cc/logos/curve-dao-token-crv-logo.png';
/* eslint-disable-next-line */
const SAMPLE_AVATAR_IMAGE_LOCAL_IMAGE_SOURCE: ImageSourcePropType = require('../../../../../../images/fox.png');
const SAMPLE_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE: ImageSourcePropType = {
  uri: SAMPLE_AVATAR_IMAGE_URI,
};
export const SAMPLE_AVATAR_IMAGE_LOCAL_IMAGE_PROPS: ImagePropsBase = {
  source: SAMPLE_AVATAR_IMAGE_LOCAL_IMAGE_SOURCE,
};
export const SAMPLE_AVATAR_IMAGE_REMOTE_IMAGE_PROPS: ImagePropsBase = {
  source: SAMPLE_AVATAR_IMAGE_REMOTE_IMAGE_SOURCE,
};
export const SAMPLE_AVATAR_IMAGE_PROPS: AvatarImageProps = {
  imageProps: SAMPLE_AVATAR_IMAGE_REMOTE_IMAGE_PROPS,
};
