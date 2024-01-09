// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * BaseListBase component props.
 */
export interface BaseListBaseProps extends ViewProps {
  /**
   * Optional enum to replace the topAccessory.
   */
  topAccessory?: React.ReactNode;
  /**
   * Optional enum to replace the list items.
   */
  children?: React.ReactNode;
  /**
   * Optional enum to replace the bottomAccessory.
   */
  bottomAccessory?: React.ReactNode;
}

/**
 * Style sheet BaseListBase parameters.
 */
export type BaseListBaseStyleSheetVars = Pick<BaseListBaseProps, 'style'>;
