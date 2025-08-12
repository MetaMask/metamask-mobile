// Third party dependencies.
import { ViewProps } from 'react-native';

// Internal dependencies.
import { HeaderBaseAlign } from './HeaderBase.constants';

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
  /**
   * Optional prop to set the alignment of the header title.
   * @default: HeaderBaseAlign.Center
   */
  align?: HeaderBaseAlign;
}

/**
 * Style sheet input parameters.
 */
export type HeaderBaseStyleSheetVars = Pick<
  HeaderBaseProps,
  'style' | 'align'
> & {
  startAccessorySize: { width: number; height: number } | null;
  endAccessorySize: { width: number; height: number } | null;
};
