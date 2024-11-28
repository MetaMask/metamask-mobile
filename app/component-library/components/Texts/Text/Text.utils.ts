import { TextVariant } from './Text.types';

type FontFamilyByTextVariant = {
  [key in TextVariant]: string;
};

export type FontWeight =
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | 'normal'
  | 'bold';
type FontStyle = 'normal' | 'italic';

export const getFontStyleVariant = (
  fontWeight: FontWeight = '400',
  fontStyle: FontStyle = 'normal',
): string => {
  const weightMap: { [key in FontWeight]: string } = {
    '100': 'Regular',
    '200': 'Regular',
    '300': 'Regular',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'Medium',
    '700': 'Bold',
    '800': 'Bold',
    '900': 'Bold',
    normal: 'Regular',
    bold: 'Bold',
  };

  const styleSuffix = fontStyle === 'italic' ? 'Italic' : '';

  const fontSuffix = weightMap[fontWeight];

  return `EuclidCircularB-${fontSuffix}${styleSuffix}`;
};

export const FONTFAMILY_BY_TEXTVARIANT: FontFamilyByTextVariant = {
  [TextVariant.DisplayMD]: 'MMSans-Regular',
  [TextVariant.HeadingLG]: 'MMSans-Regular',
  [TextVariant.HeadingMD]: 'MMSans-Regular',
  [TextVariant.HeadingSMRegular]: 'MMSans-Regular',
  [TextVariant.HeadingSM]: 'MMSans-Regular',
  [TextVariant.BodyLGMedium]: 'CentraNo1-Medium',
  [TextVariant.BodyMD]: 'CentraNo1-Book',
  [TextVariant.BodyMDMedium]: 'CentraNo1-Medium',
  [TextVariant.BodyMDBold]: 'CentraNo1-Bold',
  [TextVariant.BodySM]: 'CentraNo1-Book',
  [TextVariant.BodySMMedium]: 'CentraNo1-Medium',
  [TextVariant.BodySMBold]: 'CentraNo1-Bold',
  [TextVariant.BodyXS]: 'CentraNo1-Book',
  [TextVariant.BodyXSMedium]: 'CentraNo1-Medium',
};

export const getFontStyleVariantForBrandEvolution = (
  variant: TextVariant,
): string => FONTFAMILY_BY_TEXTVARIANT[variant];
