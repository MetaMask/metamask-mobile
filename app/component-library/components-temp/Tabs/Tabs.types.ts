// Third party dependencies.
import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';

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
   * Callback when tab is pressed
   */
  onPress: () => void;
  /**
   * Optional additional styling
   */
  style?: ViewStyle;
  /**
   * Optional text style
   */
  textStyle?: TextStyle;
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
   * Whether tabs should be scrollable horizontally
   */
  scrollEnabled?: boolean;
  /**
   * Optional additional styling for the tab bar container
   */
  style?: ViewStyle;
  /**
   * Optional styling for individual tabs
   */
  tabStyle?: ViewStyle;
  /**
   * Optional styling for tab text
   */
  textStyle?: TextStyle;
  /**
   * Optional styling for the underline
   */
  underlineStyle?: ViewStyle;
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
   * Whether tabs should be scrollable horizontally
   */
  scrollEnabled?: boolean;
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
   * Optional custom tab bar renderer
   */
  renderTabBar?: (props: TabsBarProps) => React.ReactElement;
  /**
   * Optional additional styling for the container
   */
  style?: ViewStyle;
  /**
   * Optional styling for individual tabs
   */
  tabStyle?: ViewStyle;
  /**
   * Optional styling for tab text
   */
  textStyle?: TextStyle;
  /**
   * Optional styling for the underline
   */
  underlineStyle?: ViewStyle;
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
