// Third party dependencies.
import React from 'react';

// External dependencies.
import { Box } from '@metamask/design-system-react-native';

type BoxComponentProps = React.ComponentProps<typeof Box>;

// Internal dependencies.
import { TabsIconBarProps } from '../TabsIconBar/TabsIconBar.types';
import { IconName } from '../../../components/Icons/Icon/Icon.types';

/**
 * Individual tab item data used internally by TabsIconList
 */
export interface TabsIconItem {
  key: string;
  label: string;
  content: React.ReactNode;
  iconName: IconName;
  isDisabled?: boolean;
  testID?: string;
  keepMounted?: boolean;
}

/**
 * Props that a child tab view should declare so TabsIconList can read them
 */
export interface TabsIconViewProps {
  tabLabel: string;
  tabIcon: IconName;
  key?: string;
  isDisabled?: boolean;
  keepMounted?: boolean;
  testID?: string;
}

/**
 * TabsIconList component props
 */
export interface TabsIconListProps extends BoxComponentProps {
  /**
   * Tab content — each child must have tabLabel and tabIcon props
   */
  children: React.ReactElement | React.ReactElement[];
  /**
   * Initial active tab index
   */
  initialActiveIndex?: number;
  /**
   * Callback when the active tab changes
   */
  onChangeTab?: (changeTabProperties: {
    i: number;
    ref: React.ReactNode;
  }) => void;
  /**
   * Props forwarded to the inner TabsIconBar (tabs, activeIndex, onTabPress are managed internally)
   */
  tabsBarProps?: Omit<TabsIconBarProps, 'tabs' | 'activeIndex' | 'onTabPress'>;
  /**
   * Extra Tailwind classes applied to the content container
   */
  tabsListContentTwClassName?: string;
}

/**
 * Ref interface for external control of TabsIconList
 */
export interface TabsIconListRef {
  /**
   * Navigate to a specific tab by index
   */
  goToTabIndex: (tabIndex: number) => void;
  /**
   * Get the current active tab index
   */
  getCurrentIndex: () => number;
}
