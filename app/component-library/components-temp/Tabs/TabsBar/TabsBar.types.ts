// Third party dependencies.
import React from 'react';

// External dependencies.
import { Box } from '@metamask/design-system-react-native';

// TODO: @MetaMask/design-system-engineers
// Use the concrete Box component props here instead of BoxProps.
// In MetaMask Mobile, extending BoxProps in forwarding wrappers can fail TS checks
// because consumer code may resolve older @types/react-native callback types while
// MMDS Box resolves React Native bundled types. Deriving props from the component
// keeps wrapper props aligned with the actual JSX contract until the library-level
// typing story is unified.
// https://github.com/MetaMask/metamask-design-system/issues/1115
type BoxComponentProps = React.ComponentProps<typeof Box>;

/**
 * Individual tab item data interface
 */
export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
  isDisabled?: boolean;
  testID?: string;
}

/**
 * TabsBar component props
 */
export interface TabsBarProps extends BoxComponentProps {
  /**
   * Array of tab items
   */
  tabs: TabItem[];
  /**
   * Current active tab index
   */
  activeIndex: number;
  /**
   * Callback when a tab is selected
   */
  onTabPress: (index: number) => void;
  /**
   * Test ID for the component
   */
  testID?: string;
  /**
   * Tailwind CSS classes to apply to the main container
   */
  twClassName?: string;
}
