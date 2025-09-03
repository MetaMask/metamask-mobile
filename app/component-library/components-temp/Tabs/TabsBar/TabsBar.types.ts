// Third party dependencies.
import React from 'react';

/**
 * Individual tab item data interface
 */
export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
}

/**
 * TabsBar component props
 */
export interface TabsBarProps {
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
   * Whether the tabs are locked (disabled)
   */
  locked?: boolean;
  /**
   * Test ID for testing
   */
  testID?: string;
}
