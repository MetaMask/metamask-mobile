import React from 'react';
import {
  type ButtonProps,
  type TextProps,
  type BoxProps,
} from '@metamask/design-system-react-native';

export interface TabEmptyStateProps extends Omit<BoxProps, 'children'> {
  /**
   * The icon to display in the empty state if this is an png/jpg image you will need to account for light and dark theme with useAssetFromTheme
   */
  icon?: React.ReactNode;
  /**
   * The description to display in the empty state
   */
  description?: string;
  /**
   * The props to pass to the description Text component
   */
  descriptionProps?: Partial<TextProps>;
  /**
   * The text to display in the action button
   */
  actionButtonText?: string;
  /**
   * The props to pass to the action button
   */
  actionButtonProps?: Partial<ButtonProps>;
  /**
   * The function to call when the action button is clicked
   */
  onAction?: () => void;
  /**
   * Any additional children to display in the TabEmptyState
   */
  children?: React.ReactNode;
}
