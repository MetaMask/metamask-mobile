// External dependencies.
import { IconSize } from '../../Icon';
import { TextProps, TextVariant } from '../Text/Text.types';

/**
 * TextEstimated component props.
 */
export type TextEstimatedProps = TextProps;

/**
 * Mapping of IconSize by TextVariant.
 */
export type TildeIconSizeByTextVariant = {
  [key in TextVariant]: IconSize;
};
