// Third party dependencies.
import { ViewProps } from 'react-native';
import { ReactNode } from 'react';

// External dependencies.
import { ButtonIconProps } from '@metamask/design-system-react-native';

/**
 * HeaderBase component props.
 */
export interface HeaderBaseProps {
  /**
   * Title of the HeaderBase.
   */
  children?: ReactNode | string;
  /**
   * Optional prop to include content to be displayed before the title.
   * Takes priority over startButtonIconProps if both are provided.
   */
  startAccessory?: ReactNode;
  /**
   * Optional prop to include content to be displayed after the title.
   * Takes priority over endButtonIconProps if both are provided.
   */
  endAccessory?: ReactNode;
  /**
   * Optional ButtonIcon props to render a ButtonIcon as the start accessory.
   * Only used if startAccessory is not provided.
   * @default size: ButtonIconSize.Md
   */
  startButtonIconProps?: ButtonIconProps;
  /**
   * Optional array of ButtonIcon props to render multiple ButtonIcons as end accessories.
   * Rendered in reverse order (first item appears rightmost).
   * Only used if endAccessory is not provided.
   * @default size: ButtonIconSize.Md for each
   */
  endButtonIconProps?: ButtonIconProps[];
  /**
   * Optional prop to include the top inset to make sure the header is visible
   * below device's knob.
   * @default false
   */
  includesTopInset?: boolean;
  /**
   * Optional props to pass to the start accessory wrapper View.
   */
  startAccessoryWrapperProps?: ViewProps;
  /**
   * Optional props to pass to the end accessory wrapper View.
   */
  endAccessoryWrapperProps?: ViewProps;
  /**
   * Optional test ID for the header container.
   */
  testID?: string;
}
