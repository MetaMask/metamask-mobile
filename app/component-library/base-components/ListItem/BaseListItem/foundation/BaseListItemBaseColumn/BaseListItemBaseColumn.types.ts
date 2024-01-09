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
 * BaseListItemBaseColumn component props.
 */
export interface BaseListItemBaseColumnProps extends ViewProps {
  /**
   * Optional prop for content to wrap to display.
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
export type BaseListItemBaseColumnStyleSheetVars = Pick<
  BaseListItemBaseColumnProps,
  'style' | 'widthType'
>;
