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
   */
  children: React.ReactElement[];
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
