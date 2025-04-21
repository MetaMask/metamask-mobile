/* eslint-disable @typescript-eslint/no-shadow */
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
  BodyLGMedium = 'sBodyLGMedium',
  BodyMD = 'sBodyMD',
  BodyMDMedium = 'sBodyMDMedium',
  BodyMDBold = 'sBodyMDBold',
  BodySM = 'sBodySM',
  BodySMMedium = 'sBodySMMedium',
  BodySMBold = 'sBodySMBold',
  BodyXS = 'sBodyXS',
  BodyXSMedium = 'sBodyXSMedium',
}

/**
 * Text colors
 */
export enum TextColor {
  Default = 'Default',
  Inverse = 'Inverse',
  Alternative = 'Alternative',
  Muted = 'Muted',
  Primary = 'Primary',
  PrimaryAlternative = 'PrimaryAlternative',
  Success = 'Success',
  Error = 'Error',
  ErrorAlternative = 'ErrorAlternative',
  Warning = 'Warning',
  Info = 'Info',
  Link = 'Link',
}

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
export type FontStyle = 'normal' | 'italic';

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
  /**
   * Optional prop to add color to text.
   */
  color?: TextColor | string;
}
