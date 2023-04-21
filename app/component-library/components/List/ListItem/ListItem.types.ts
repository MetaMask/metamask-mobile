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
  children: React.ReactNode;
  /**
   * Content to wrap to display.
   */
  gap?: number | string | undefined;
  /**
   * Content to wrap to display.
   */
  verticalAlignment?: VerticalAlignment;
}
