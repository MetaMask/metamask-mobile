// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * Width variants.
 */
export enum WidthType {
  Auto = 'auto',
  Fill = 'fill',
}

/**
 * ListItemColumn component props.
 */
export interface ListItemColumnProps extends ViewProps {
  /**
   * Content to wrap to display.
   */
  children?: React.ReactNode;
  /**
   * Optional prop to configure the width of the column.
   */
  widthType?: WidthType;
}

/**
 * Style sheet input parameters.
 */
export type ListItemColumnStyleSheetVars = Pick<
  ListItemColumnProps,
  'style' | 'widthType'
>;
