/* eslint-disable @typescript-eslint/no-shadow */
// External dependencies.
import { TextColor, TextProps } from '../../Texts/Text/Text.types';

/**
 * HelpText colors
 */
export enum HelpTextSeverity {
  Default = 'Default',
  Success = 'Success',
  Error = 'Error',
}

/**
 * Mapping of TextColor by HelpTextSeverity.
 */
export type TextColorByHelpTextSeverity = {
  [key in HelpTextSeverity]: TextColor;
};

/**
 * HelpText component props.
 */
export interface HelpTextProps extends TextProps {
  /**
   * Optional prop to show the severity of the help text, which will change
   * color based on the severity.
   * @default HelpTextSeverity.Default
   */
  severity?: HelpTextSeverity;
}
