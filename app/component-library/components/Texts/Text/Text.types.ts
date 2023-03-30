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
  BodyMDBold = 'sBodyMDBold',
  BodySM = 'sBodySM',
  BodySMBold = 'sBodySMBold',
  BodyXS = 'sBodyXS',
}

/**
 * Text colors
 */
export enum TextColor {
  Default = 'Default',
  Alternative = 'Alternative',
  Muted = 'Muted',
  Primary = 'Primary',
  Success = 'Success',
  Error = 'Error',
  Warning = 'Warning',
  Info = 'Info',
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
  /**
   * Optional prop to add color to text.
   */
  color?: TextColor;
}
