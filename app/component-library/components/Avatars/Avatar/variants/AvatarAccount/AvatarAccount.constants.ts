/* eslint-disable import/prefer-default-export */
// External dependencies.
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import { AvatarAccountType, AvatarAccountProps } from './AvatarAccount.types';

// Defaults
export const DEFAULT_AVATARACCOUNT_TYPE = AvatarAccountType.JazzIcon;
export const DEFAULT_AVATARACCOUNT_SIZE = AvatarSize.Md;

// Sample consts
const SAMPLE_AVATARACCOUNT_ACCOUNTADDRESS =
  '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092';
export const SAMPLE_AVATARACCOUNT_PROPS: AvatarAccountProps = {
  accountAddress: SAMPLE_AVATARACCOUNT_ACCOUNTADDRESS,
  type: DEFAULT_AVATARACCOUNT_TYPE,
  size: DEFAULT_AVATARACCOUNT_SIZE,
};
