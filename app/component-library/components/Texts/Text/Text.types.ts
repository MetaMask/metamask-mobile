// Third party dependencies.
import { TextProps as RNTextProps } from 'react-native';

/**
 * Text component variants.
 */
export enum TextVariant {
  DisplayMD = 'sDisplayMD',
  HeadingLG = 'sHeadingLG',
  HeadingMD = 'sHeadingMD',
  HeadingSMRegular = 'sHeadingSMRegular',
  HeadingSM = 'sHeadingSM',
  BodyMD = 'sBodyMD',
  BodyMDBold = 'sBodyMDBold',
  BodySM = 'sBodySM',
  BodySMBold = 'sBodySMBold',
  BodyXS = 'sBodyXS',
}

/**
 * Text component props.
 */
export interface TextProps extends RNTextProps {
  /**
   * Optional enum to select between Typography variants.
   * @default BodyMD
   */
  variant?: TextVariant;
  /**
   * Text to be displayed.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export interface TextStyleSheetVars extends Pick<TextProps, 'style'> {
  variant: TextVariant;
}
