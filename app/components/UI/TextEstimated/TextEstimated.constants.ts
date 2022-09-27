/* eslint-disable import/prefer-default-export */
// Internal dependencies.
import { TildeIconSizeByTextVariant } from './TextEstimated.types';

// External dependencies.
import { IconSize } from '../../../component-library/components/Icon';
import { TextVariant } from '../../../component-library/components/Texts/Text/Text.types';

export const TILDE_ICON_SIZE_BY_TEXT_VARIANT: TildeIconSizeByTextVariant = {
  [TextVariant.sDisplayMD]: IconSize.Lg,
  [TextVariant.sHeadingLG]: IconSize.Md,
  [TextVariant.sHeadingMD]: IconSize.Sm,
  [TextVariant.sHeadingSMRegular]: IconSize.Xs,
  [TextVariant.sHeadingSM]: IconSize.Sm,
  [TextVariant.sBodyMD]: IconSize.Xs,
  [TextVariant.sBodyMDBold]: IconSize.Xs,
  [TextVariant.sBodySM]: IconSize.Xss,
  [TextVariant.sBodySMBold]: IconSize.Xss,
  [TextVariant.sBodyXS]: IconSize.Xss,
  [TextVariant.lDisplayMD]: IconSize.Xl,
  [TextVariant.lHeadingLG]: IconSize.Lg,
  [TextVariant.lHeadingMD]: IconSize.Sm,
  [TextVariant.lHeadingSMRegular]: IconSize.Xs,
  [TextVariant.lHeadingSM]: IconSize.Xs,
  [TextVariant.lBodyMD]: IconSize.Xs,
  [TextVariant.lBodyMDBold]: IconSize.Sm,
  [TextVariant.lBodySM]: IconSize.Xs,
  [TextVariant.lBodySMBold]: IconSize.Xs,
  [TextVariant.lBodyXS]: IconSize.Xss,
};

export const TEST_SAMPLE_TEXT = 'Sample Text';

export const TEXT_ESTIMATED_TEST_ID = 'text-estimated';
