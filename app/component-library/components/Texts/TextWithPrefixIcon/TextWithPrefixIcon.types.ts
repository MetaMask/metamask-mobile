// External dependencies.
import { TextProps, TextVariant } from '../Text/Text.types';
import { IconProps, IconSize } from '../../Icon';

/**
 * TextWithPrefixIcon component props.
 */
export interface TextWithPrefixIconProps extends TextProps {
  /**
   * Props of the Icon used. The default size of icon will be mapped by IconSizeByTextVariant.
   */
  iconProps: IconProps;
}

/**
 * Style sheet input parameters.
 */
export type TextWithPrefixIconStyleSheetVars = Pick<
  TextWithPrefixIconProps,
  'style'
>;

/**
 * Mapping of IconSize by TextVariant.
 */
export type IconSizeByTextVariant = {
  [key in TextVariant]: IconSize;
};
