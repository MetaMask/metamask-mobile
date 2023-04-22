// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * Width variants.
 */
export enum WidthTypes {
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
   * Cell Width Type .
   */
  widthType?: WidthTypes;
}

/**
 * Style sheet input parameters.
 */
export type ListItemColumnStyleSheetVars = Pick<
  ListItemColumnProps,
  'style' | 'widthType'
>;
