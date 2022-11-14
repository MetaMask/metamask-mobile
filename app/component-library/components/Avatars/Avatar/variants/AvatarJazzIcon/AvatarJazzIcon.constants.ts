/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import { IJazziconProps } from 'react-native-jazzicon';

// Internal dependencies.
import { AvatarJazzIconProps } from './AvatarJazzIcon.types';

// Test IDs
export const AVATAR_JAZZICON_TEST_ID = 'avatar-jazzicon';

// Sample consts
const SAMPLE_AVATAR_JAZZICON_ADDRESS =
  '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092';
export const SAMPLE_JAZZICON_PROPS: IJazziconProps = {
  address: SAMPLE_AVATAR_JAZZICON_ADDRESS,
};
export const SAMPLE_AVATAR_JAZZICON_PROPS: AvatarJazzIconProps = {
  jazzIconProps: SAMPLE_JAZZICON_PROPS,
};
