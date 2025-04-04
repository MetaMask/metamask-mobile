// Third party dependencies
import { ViewProps } from 'react-native';

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
}
/**
 * Style sheet input parameters.
 */
export type TagColoredStyleSheetVars = Pick<TagColoredProps, 'style'> & {
  color: TagColor;
};
