/* eslint-disable import/prefer-default-export */
// External dependencies.
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import {
  AvatarAccountType,
  AvatarAccountProps,
  BorderRadiusByAvatarSize,
} from './AvatarAccount.types';

// Mappings
export const BORDERRADIUS_BY_AVATARSIZE: BorderRadiusByAvatarSize = {
  [AvatarSize.Xs]: 4,
  [AvatarSize.Sm]: 6,
  [AvatarSize.Md]: 8,
  [AvatarSize.Lg]: 10,
  [AvatarSize.Xl]: 12,
};

// Defaults
export const DEFAULT_AVATARACCOUNT_TYPE = AvatarAccountType.Maskicon;
export const DEFAULT_AVATARACCOUNT_SIZE = AvatarSize.Md;

// Sample consts
const SAMPLE_AVATARACCOUNT_ACCOUNTADDRESS =
  '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092';
export const SAMPLE_AVATARACCOUNT_PROPS: AvatarAccountProps = {
  accountAddress: SAMPLE_AVATARACCOUNT_ACCOUNTADDRESS,
  type: DEFAULT_AVATARACCOUNT_TYPE,
  size: DEFAULT_AVATARACCOUNT_SIZE,
};
