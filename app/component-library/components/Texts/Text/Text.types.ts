// Third party dependencies.
import { TextProps as RNTextProps } from 'react-native';

/**
 * Text component variants.
 */
export enum TextVariants {
  sDisplayMD = 'sDisplayMD',
  sHeadingLG = 'sHeadingLG',
  sHeadingMD = 'sHeadingMD',
  sHeadingSMRegular = 'sHeadingSMRegular',
  sHeadingSM = 'sHeadingSM',
  sBodyMD = 'sBodyMD',
  sBodyMDBold = 'sBodyMDBold',
  sBodySM = 'sBodySM',
  sBodySMBold = 'sBodySMBold',
  sBodyXS = 'sBodyXS',
  lDisplayMD = 'lDisplayMD',
  lHeadingLG = 'lHeadingLG',
  lHeadingMD = 'lHeadingMD',
  lHeadingSMRegular = 'lHeadingSMRegular',
  lHeadingSM = 'lHeadingSM',
  lBodyMD = 'lBodyMD',
  lBodyMDBold = 'lBodyMDBold',
  lBodySM = 'lBodySM',
  lBodySMBold = 'lBodySMBold',
  lBodyXS = 'lBodyXS',
}

/**
 * Text component props.
 */
export interface TextProps extends RNTextProps {
  /**
   * Optional enum to select between Typography variants.
   * @default sBodyMD
   */
  variant?: TextVariants;
  /**
   * Text to be displayed.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export interface TextStyleSheetVars extends Pick<TextProps, 'style'> {
  variant: TextVariants;
}
