// Third party dependencies.
import React from 'react';

// External dependencies.
import { BoxProps } from '@metamask/design-system-react-native';

/**
 * Individual tab item data interface
 */
export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
  isDisabled?: boolean;
}

/**
 * TabsBar component props
 */
export interface TabsBarProps extends BoxProps {
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
}
