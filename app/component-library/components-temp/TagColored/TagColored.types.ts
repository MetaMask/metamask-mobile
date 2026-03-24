// Third party dependencies
import { ViewProps } from 'react-native';

// Internal dependencies
import { TextProps } from '../../components/Texts/Text/Text.types';

/**
 * Tag Color.
 */
export enum TagColor {
  Default = 'Default',
  Success = 'Success',
  Info = 'Info',
  Danger = 'Danger',
  Warning = 'Warning',
}

/**
 * TagColored component props.
 */
export interface TagColoredProps extends ViewProps {
  /**
   * Content to wrap to display.
   */
  children: React.ReactNode | string;
  /**
   * Optional prop to configure the color of the TagColored
   * @default TagColor.Default
   */
  color?: TagColor;
  /**
   * Optional props to pass to the label Text component.
   * Useful for overriding default text styles like textTransform.
   */
  labelProps?: Partial<TextProps>;
}
/**
 * Style sheet input parameters.
 */
export type TagColoredStyleSheetVars = Pick<TagColoredProps, 'style'> & {
  color: TagColor;
};
