import React from 'react';
import {
  type ButtonProps,
  type TextProps,
  Box,
} from '@metamask/design-system-react-native';

// TODO: @MetaMask/design-system-engineers
// Use the concrete Box component props here instead of BoxProps.
// In MetaMask Mobile, extending BoxProps in forwarding wrappers can fail TS checks
// because consumer code may resolve older @types/react-native callback types while
// MMDS Box resolves React Native bundled types. Deriving props from the component
// keeps wrapper props aligned with the actual JSX contract until the library-level
// typing story is unified.
// https://github.com/MetaMask/metamask-design-system/issues/1115
type BoxComponentProps = React.ComponentProps<typeof Box>;

export interface TabEmptyStateProps
  extends Omit<BoxComponentProps, 'children'> {
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
  /**
   * The class name to apply to the TabEmptyState
   */
  twClassName?: string;
}
