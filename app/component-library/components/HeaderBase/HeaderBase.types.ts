// Third party dependencies.
import { ViewProps } from 'react-native';

// Enums
export enum HeaderBaseVariant {
  Display = 'display',
  Compact = 'compact',
}

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
   * Optional prop to set the variant of the header (controls alignment and text size).
   * Display: left aligned with HeadingLG text.
   * Compact: center aligned with HeadingSM text.
   * @default HeaderBaseVariant.Compact
   */
  variant?: HeaderBaseVariant;
  /**
   * Optional props to pass to the start accessory wrapper View.
   */
  startAccessoryWrapperProps?: ViewProps;
  /**
   * Optional props to pass to the end accessory wrapper View.
   */
  endAccessoryWrapperProps?: ViewProps;
}

/**
 * Style sheet input parameters.
 */
export type HeaderBaseStyleSheetVars = Pick<
  HeaderBaseProps,
  'style' | 'variant'
> & {
  startAccessorySize: { width: number; height: number } | null;
  endAccessorySize: { width: number; height: number } | null;
};
