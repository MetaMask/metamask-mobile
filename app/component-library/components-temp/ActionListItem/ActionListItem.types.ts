// Third party dependencies
import { ReactNode } from 'react';
import { PressableProps } from 'react-native';

// External dependencies
import {
  IconName,
  TextProps,
  IconProps,
} from '@metamask/design-system-react-native';

/**
 * ActionListItem component props.
 */
export interface ActionListItemProps extends Omit<PressableProps, 'disabled'> {
  /**
   * Label for the list item - can be string or React node.
   */
  label: string | ReactNode;
  /**
   * Optional description for the list item - can be string or React node.
   */
  description?: string | ReactNode;
  /**
   * Optional start accessory (left side) - React node.
   */
  startAccessory?: ReactNode;
  /**
   * Optional end accessory (right side) - React node.
   */
  endAccessory?: ReactNode;
  /**
   * Optional icon name from the design system icon library.
   * If provided, renders an icon with Md size and alternative color.
   */
  iconName?: IconName;
  /**
   * Optional props to spread to the label Text component when label is a string.
   */
  labelTextProps?: Partial<TextProps>;
  /**
   * Optional props to spread to the description Text component when description is a string.
   */
  descriptionTextProps?: Partial<TextProps>;
  /**
   * Optional props to spread to the Icon component when iconName is provided.
   */
  iconProps?: Partial<IconProps>;
  /**
   * Whether the list item is disabled.
   * When true, applies 50% opacity and disables interactions.
   */
  isDisabled?: boolean;
}
