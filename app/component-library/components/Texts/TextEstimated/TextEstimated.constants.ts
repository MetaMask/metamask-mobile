/* eslint-disable import/prefer-default-export */
// Internal dependencies.
import { TildeIconSizeByTextVariant } from './TextEstimated.types';

// External dependencies.
import { IconSize } from '../../Icon';
import { TextVariant } from '../Text/Text.types';

export const TILDE_ICON_SIZE_BY_TEXT_VARIANT: TildeIconSizeByTextVariant = {
  [TextVariant.sDisplayMD]: IconSize.Xl,
  [TextVariant.sHeadingLG]: IconSize.Lg,
  [TextVariant.sHeadingMD]: IconSize.Sm,
  [TextVariant.sHeadingSMRegular]: IconSize.Xs,
  [TextVariant.sHeadingSM]: IconSize.Sm,
  [TextVariant.sBodyMD]: IconSize.Xs,
  [TextVariant.sBodyMDBold]: IconSize.Xs,
  [TextVariant.sBodySM]: IconSize.Xss,
  [TextVariant.sBodySMBold]: IconSize.Xss,
  [TextVariant.sBodyXS]: IconSize.Xss,
  [TextVariant.lDisplayMD]: IconSize.Lg,
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
