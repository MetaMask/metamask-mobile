// Third party dependencies.
import React from 'react';

// External dependencies.
import { BoxProps } from '@metamask/design-system-react-native';

// Internal dependencies.
import { TabsBarProps } from '../TabsBar/TabsBar.types';

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
 * Tab view props interface for components with tabLabel
 */
export interface TabViewProps {
  tabLabel: string;
  key?: string;
  isDisabled?: boolean;
}

/**
 * TabsList component props
 */
export interface TabsListProps extends BoxProps {
  /**
   * Array of tab items or React children with tabLabel prop
   * Supports both single child and array of children
   */
  children: React.ReactElement | React.ReactElement[];
  /**
   * Initial active tab index
   */
  initialActiveIndex?: number;
  /**
   * Callback when tab changes
   */
  onChangeTab?: (changeTabProperties: {
    i: number;
    ref: React.ReactNode;
  }) => void;
  /**
   * Props to pass to the TabsBar component (excluding tabs, activeIndex, and onTabPress which are managed internally)
   */
  tabsBarProps?: Omit<TabsBarProps, 'tabs' | 'activeIndex' | 'onTabPress'>;
  /**
   * Tailwind CSS classes to apply to the tab content containers
   */
  tabsListContentTwClassName?: string;
}

/**
 * TabsList ref interface for external control
 */
export interface TabsListRef {
  /**
   * Go to a specific tab by index
   */
  goToTabIndex: (tabIndex: number) => void;
  /**
   * Get current active tab index
   */
  getCurrentIndex: () => number;
}
