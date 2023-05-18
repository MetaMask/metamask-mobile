// Third party dependencies.
import { ViewProps } from 'react-native';

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
  children?: React.ReactNode[] | React.ReactNode;
  /**
   * Optional prop to configure the gap between items inside the ListItem.
   */
  gap?: number | string | undefined;
  /**
   * Optional prop to configure the vertical alignment between items inside the ListItem.
   */
  verticalAlignment?: VerticalAlignment;
}

/**
 * Style sheet input parameters.
 */
export type ListItemStyleSheetVars = Pick<
  ListItemProps,
  'style' | 'verticalAlignment'
>;
