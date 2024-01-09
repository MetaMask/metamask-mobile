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
 * BaseListItemBase component props.
 */
export interface BaseListItemBaseProps {
  /**
   * Content to wrap to display.
   */
  children?: React.ReactNode;
  /**
   * Optional prop to configure the gap between items inside the BaseListItemBase.
   */
  gap?: number | string;
  /**
   * Optional prop to configure the vertical alignment between items inside the BaseListItemBase.
   */
  verticalAlignment?: VerticalAlignment;
  /**
   * Optional prop to configure the style of the BaseListItemBase.
   */
  style?: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type BaseListItemBaseStyleSheetVars = Pick<
  BaseListItemBaseProps,
  'style' | 'verticalAlignment'
>;
