// External dependencies.
import React from 'react';
import { TextProps } from '../Text/Text.types';

/**
 * SensitiveText length options.
 */
export const SensitiveTextLength = {
  Short: '6',
  Medium: '9',
  Long: '12',
  ExtraLong: '20',
} as const;

/**
 * Type for SensitiveTextLength values.
 */
export type SensitiveTextLengthType =
  (typeof SensitiveTextLength)[keyof typeof SensitiveTextLength];

/**
 * Type for custom length values.
 */
export type CustomLength = string;

/**
 * SensitiveText component props.
 */
export interface SensitiveTextProps extends TextProps {
  /**
   * Boolean to determine whether the text should be hidden or visible.
   *
   * @default false
   */
  isHidden?: boolean;
  /**
   * Determines the length of the hidden text (number of asterisks).
   * Can be a predefined SensitiveTextLength or a custom string number.
   *
   * @default SensitiveTextLength.Short
   */
  length?: SensitiveTextLengthType | CustomLength;
  /**
   * The text content to be displayed or hidden.
   */
  children: React.ReactNode;
}
