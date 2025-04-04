// Third party dependencies.
import { ViewStyle, ViewProps } from 'react-native';

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
export interface ListItemProps extends ViewProps {
  /**
   * Content to wrap to display.
   */
  children?: React.ReactNode;
  /**
   * Optional prop to include content to be displayed above the ListItem.
   */
  topAccessory?: React.ReactNode;
  /**
   * Optional prop to include content to be displayed below the ListItem.
   */
  bottomAccessory?: React.ReactNode;
  /**
   * Optional prop to configure the gap between the topAccessory and the ListItem.
   */
  topAccessoryGap?: number;
  /**
   * Optional prop to configure the gap between the bottomAccessory and the ListItem.
   */
  bottomAccessoryGap?: number;
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
  'style' | 'verticalAlignment' | 'topAccessoryGap' | 'bottomAccessoryGap'
>;
