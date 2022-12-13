/* eslint-disable import/prefer-default-export */
// Internal dependencies.
import { TildeIconSizeByTextVariants } from './TextEstimated.types';

// External dependencies.
import { IconSize } from '../../../component-library/components/Icon';
import { TextVariants } from '../../../component-library/components/Texts/Text/Text.types';

export const TILDE_ICON_SIZE_BY_TEXT_VARIANT: TildeIconSizeByTextVariants = {
  [TextVariants.sDisplayMD]: IconSize.Lg,
  [TextVariants.sHeadingLG]: IconSize.Md,
  [TextVariants.sHeadingMD]: IconSize.Sm,
  [TextVariants.sHeadingSMRegular]: IconSize.Xs,
  [TextVariants.sHeadingSM]: IconSize.Sm,
  [TextVariants.sBodyMD]: IconSize.Xs,
  [TextVariants.sBodyMDBold]: IconSize.Xs,
  [TextVariants.sBodySM]: IconSize.Xss,
  [TextVariants.sBodySMBold]: IconSize.Xss,
  [TextVariants.sBodyXS]: IconSize.Xss,
  [TextVariants.lDisplayMD]: IconSize.Xl,
  [TextVariants.lHeadingLG]: IconSize.Lg,
  [TextVariants.lHeadingMD]: IconSize.Sm,
  [TextVariants.lHeadingSMRegular]: IconSize.Xs,
  [TextVariants.lHeadingSM]: IconSize.Xs,
  [TextVariants.lBodyMD]: IconSize.Xs,
  [TextVariants.lBodyMDBold]: IconSize.Sm,
  [TextVariants.lBodySM]: IconSize.Xs,
  [TextVariants.lBodySMBold]: IconSize.Xs,
  [TextVariants.lBodyXS]: IconSize.Xss,
};

export const TEST_SAMPLE_TEXT = 'Sample Text';

export const TEXT_ESTIMATED_TEST_ID = 'text-estimated';
