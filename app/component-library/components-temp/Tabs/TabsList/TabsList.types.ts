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

// Internal dependencies.
import { TabsBarProps } from '../TabsBar/TabsBar.types';
import { IconName } from '../../../components/Icons/Icon/Icon.types';

/**
 * Individual tab item data interface
 */
export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
  isDisabled?: boolean;
  testID?: string;
  iconName?: IconName;
  keepMounted?: boolean;
}

/**
 * Tab view props interface for components with tabLabel
 */
export interface TabViewProps {
  tabLabel: string;
  key?: string;
  isDisabled?: boolean;
  tabIcon?: IconName;
  keepMounted?: boolean;
  testID?: string;
}

/**
 * TabsList component props
 */
export interface TabsListProps extends BoxComponentProps {
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
