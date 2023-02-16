// External dependencies.
import { IconSize } from '../../../component-library/components/Icon';
import {
  TextProps,
  TextVariant,
} from '../../../component-library/components/Texts/Text/Text.types';

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
