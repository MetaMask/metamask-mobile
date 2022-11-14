/* eslint-disable import/prefer-default-export */
// External dependencies.
import { TextVariants } from '../../../../Texts/Text';
import { AvatarSizes } from '../../Avatar.types';

// Internal dependencies.
import {
  AvatarInitialProps,
  TextVariantByAvatarSizes,
} from './AvatarInitial.types';

// Mappings
export const TEXT_VARIANT_BY_AVATAR_SIZE: TextVariantByAvatarSizes = {
  [AvatarSizes.Xs]: TextVariants.sBodySMBold,
  [AvatarSizes.Sm]: TextVariants.sBodySMBold,
  [AvatarSizes.Md]: TextVariants.sBodyMDBold,
  [AvatarSizes.Lg]: TextVariants.sBodyMDBold,
  [AvatarSizes.Xl]: TextVariants.sBodyMDBold,
};

// Test IDs
export const AVATAR_INITIAL_TEST_ID = 'avatar-initial';
export const AVATAR_INITIAL_TEXT_TEST_ID = 'avatar-initial-text';

// Sample consts
export const SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT = 'Sample Text';
export const SAMPLE_AVATAR_INITIAL_PROPS: AvatarInitialProps = {
  initial: SAMPLE_AVATAR_INITIAL_SAMPLE_TEXT,
};
