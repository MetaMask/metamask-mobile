// Third party dependencies.
import { ViewProps, StyleProp, ViewStyle } from 'react-native';
import { ReactNode } from 'react';

// External dependencies.
import { ButtonIconProps } from '@metamask/design-system-react-native';

/**
 * Variant options for HeaderBase component.
 * - Compact: Center-aligned title with HeadingSm text (default)
 * - Display: Left-aligned title with HeadingLg text
 */
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
  children?: ReactNode | string;
  /**
   * Optional style for the header container.
   */
  style?: StyleProp<ViewStyle>;
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
   * Optional variant to control alignment and text size.
   * - Compact: center-aligned with HeadingSm text (default)
   * - Display: left-aligned with HeadingLg text
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
  /**
   * Optional test ID for the header container.
   */
  testID?: string;
  /**
   * Optional Tailwind class names for the header container.
   */
  twClassName?: string;
}
