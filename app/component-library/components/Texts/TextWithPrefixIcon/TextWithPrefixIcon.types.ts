// External dependencies.
import { TextProps, TextColor } from '@component-library/components/Texts/Text/Text.types';
import { IconProps } from '@component-library/components/Icons/Icon';

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
> & {
  color: TextColor | string;
};
