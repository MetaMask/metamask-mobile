// Third party dependencies.
import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

// External dependencies.
import {
  BoxJustifyContent,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';

/**
 * SectionHeader component props.
 *
 * @version 1 - UX Team (interim, pending Design System v2)
 */
export interface SectionHeaderProps {
  /**
   * The title text or React node to display.
   */
  title: string | ReactNode;
  /**
   * Optional callback when the header is pressed.
   * Renders a trailing icon when provided.
   */
  onPress?: () => void;
  /**
   * Controls how content is distributed along the main axis of the row.
   * Use BoxJustifyContent.Between to push the endAccessory to the far right
   * (e.g. "Your positions ···" layout). Defaults to flex-start.
   */
  justifyContent?: BoxJustifyContent;
  /**
   * Icon rendered on the trailing end when onPress is provided.
   * Defaults to IconName.ArrowRight.
   * Follows the end* naming convention from HeaderBase.
   */
  endIconName?: IconName;
  /**
   * Color of the trailing icon when onPress is provided.
   * Defaults to IconColor.IconAlternative.
   * Follows the end* naming convention from HeaderBase.
   */
  endIconColor?: IconColor;
  /**
   * Optional accessory rendered to the right of the title (e.g., info icon).
   */
  endAccessory?: ReactNode;
  /**
   * Optional style for the outer container.
   * Accepts a ViewStyle for cases where Tailwind isn't sufficient.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional Tailwind class name for the outer container.
   * Use to override padding, background, or other layout properties.
   */
  twClassName?: string;
  /**
   * Optional test ID for the component.
   */
  testID?: string;
}
