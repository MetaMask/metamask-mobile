// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * ListBase component props.
 */
export interface ListBaseProps extends ViewProps {
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
 * Style sheet ListBase parameters.
 */
export type ListBaseStyleSheetVars = Pick<ListBaseProps, 'style'>;
