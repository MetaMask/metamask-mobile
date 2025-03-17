// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * HeaderBase component props.
 */
export interface HeaderBaseProps extends ViewProps {
  /**
   * Title of the HeaderBase.
   */
  children?: React.ReactNode | string;
  /**
   * Optional prop to include content to be displayed before the title.
   */
  startAccessory?: React.ReactNode;
  /**
   * Optional prop to include content to be displayed after the title.
   */
  endAccessory?: React.ReactNode;
  /**
   * Optional prop to include the top inset to make sure the header is visible
   * below device's knob
   * @default: false
   */
  includesTopInset?: boolean;
}

/**
 * Style sheet input parameters.
 */
export type HeaderBaseStyleSheetVars = Pick<HeaderBaseProps, 'style'> & {
  startAccessorySize: { width: number; height: number } | null;
  endAccessorySize: { width: number; height: number } | null;
};
