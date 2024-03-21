/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { toDataUrl } from '../../../../../../util/blockies';
import { AvatarSize } from '../../Avatar.types';

// Defaults
export const DEFAULT_AVATARBASE_SIZE = AvatarSize.Md;

// Sample consts
export const SAMPLE_AVATARBASE_SIZE = DEFAULT_AVATARBASE_SIZE;
export const SAMPLE_AVATARBASE_IMAGESOURCE: ImageSourcePropType = {
  uri: toDataUrl('0x310ff9e227946749ca32aC146215F352183F556b'),
};
