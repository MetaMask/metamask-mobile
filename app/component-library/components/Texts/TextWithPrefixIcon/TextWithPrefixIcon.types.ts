// External dependencies.
import { TextProps } from '../Text/Text.types';
import { IconProps } from '../../Icon';

/**
 * TextWithPrefixIcon component props.
 */
export interface TextWithPrefixIconProps extends TextProps {
  /**
   * Props of the Icon used.
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
