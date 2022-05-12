import { StyleProp, TextProps, TextStyle } from 'react-native';

/**
 * BaseText component variants.
 */
export enum BaseTextVariant {
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
 * BaseText component props.
 */
export interface BaseTextProps extends TextProps {
  /**
   * Enum to select between Typography variants.
   */
  variant: BaseTextVariant;
  /**
   * Escape hatch for applying extra styles. Only use if absolutely necessary.
   */
  style?: StyleProp<TextStyle>;
  /**
   * Children component of a Text component.
   */
  children?: React.ReactNode;
}

/**
 * BaseText component style sheet.
 */
export interface BaseTextStyleSheet {
  base: TextStyle;
}

/**
 * Style sheet input parameters.
 */
export type BaseTextStyleSheetVars = Pick<BaseTextProps, 'variant' | 'style'>;
