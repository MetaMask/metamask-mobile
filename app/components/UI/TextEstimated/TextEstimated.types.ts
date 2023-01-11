// External dependencies.
import { IconSize } from '../../../component-library/components/Icon';
import {
  TextProps,
  TextVariants,
} from '../../../component-library/components/Texts/Text/Text.types';

/**
 * TextEstimated component props.
 */
export type TextEstimatedProps = TextProps;

/**
 * Mapping of IconSize by TextVariants.
 */
export type TildeIconSizeByTextVariants = {
  [key in TextVariants]: IconSize;
};
