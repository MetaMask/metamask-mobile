// Third party dependencies.
import React from 'react';
import { ViewStyle } from 'react-native';

/**
 * Individual tab item data interface
 */
export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
}

/**
 * Tab view props interface for components with tabLabel
 */
export interface TabViewProps {
  tabLabel: string;
  key?: string;
}

/**
 * Tab component props
 */
export interface TabProps {
  /**
   * The label text for the tab
   */
  label: string;
  /**
   * Whether the tab is currently active
   */
  isActive: boolean;
  /**
   * Whether the tab is disabled (locked)
   */
  disabled?: boolean;
  /**
   * Callback when tab is pressed
   */
  onPress: () => void;
  /**
   * Test ID for testing
   */
  testID?: string;
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

/**
 * TabsList component props
 */
export interface TabsListProps {
  /**
   * Array of tab items or React children with tabLabel prop
   */
  children: React.ReactElement[];
  /**
   * Initial active tab index
   */
  initialPage?: number;
  /**
   * Callback when tab changes
   */
  onChangeTab?: (changeTabProperties: {
    i: number;
    ref: React.ReactNode;
  }) => void;
  /**
   * Whether the tabs are locked (disabled)
   */
  locked?: boolean;
  /**
   * Optional additional styling for the container
   */
  style?: ViewStyle;
  /**
   * Test ID for testing
   */
  testID?: string;
}

/**
 * TabsList ref interface for external control
 */
export interface TabsListRef {
  /**
   * Go to a specific page/tab
   */
  goToPage: (pageNumber: number) => void;
  /**
   * Get current active tab index
   */
  getCurrentIndex: () => number;
}
