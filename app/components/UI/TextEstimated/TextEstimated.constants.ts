/* eslint-disable import/prefer-default-export */
// Internal dependencies.
import { TildeIconSizeByTextVariant } from './TextEstimated.types';

// External dependencies.
import { IconSize } from '../../../component-library/components/Icons/Icon';
import { TextVariant } from '../../../component-library/components/Texts/Text/Text.types';

export const TILDE_ICON_SIZE_BY_TEXT_VARIANT: TildeIconSizeByTextVariant = {
  [TextVariant.DisplayMD]: IconSize.Lg,
  [TextVariant.HeadingLG]: IconSize.Md,
  [TextVariant.HeadingMD]: IconSize.Sm,
  [TextVariant.HeadingSMRegular]: IconSize.Xs,
  [TextVariant.HeadingSM]: IconSize.Sm,
  [TextVariant.BodyMD]: IconSize.Xs,
  [TextVariant.BodyMDBold]: IconSize.Xs,
  [TextVariant.BodySM]: IconSize.Xss,
  [TextVariant.BodySMBold]: IconSize.Xss,
  [TextVariant.BodyXS]: IconSize.Xss,
};

export const TEST_SAMPLE_TEXT = 'Sample Text';

export const TEXT_ESTIMATED_TEST_ID = 'text-estimated';
