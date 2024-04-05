// Third party dependencies.
import { ViewStyle } from 'react-native';

/**
 * Vertical Alignment Options.
 */
export enum VerticalAlignment {
  Top = 'Top',
  Center = 'Center',
  Bottom = 'Bottom',
}

/**
 * ListItem component props.
 */
export interface ListItemProps {
  /**
   * Content to wrap to display.
   */
  children?: React.ReactNode;
  /**
   * Optional prop to configure the gap between items inside the ListItem.
   */
  gap?: number | string;
  /**
   * Optional prop to configure the vertical alignment between items inside the ListItem.
   */
  verticalAlignment?: VerticalAlignment;
  /**
   * Optional prop to configure the style of the ListItem.
   */
  style?: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type ListItemStyleSheetVars = Pick<
  ListItemProps,
  'style' | 'verticalAlignment'
>;
