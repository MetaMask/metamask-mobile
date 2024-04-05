/* eslint-disable import/prefer-default-export */

// Internal dependencies.
import { TextColor, TextVariant, TextProps } from './Text.types';

// Defaults
export const DEFAULT_TEXT_VARIANT = TextVariant.BodyMD;
export const DEFAULT_TEXT_COLOR = TextColor.Default;

// Sample consts
export const SAMPLE_TEXT_PROPS: TextProps = {
  variant: DEFAULT_TEXT_VARIANT,
  children: 'Sample Text',
  color: DEFAULT_TEXT_COLOR,
};
