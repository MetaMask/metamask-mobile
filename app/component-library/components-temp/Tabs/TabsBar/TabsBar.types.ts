// Third party dependencies.
import React from 'react';

// External dependencies.
import { BoxProps } from '@metamask/design-system-react-native';

// Internal dependencies.
import { IconName } from 'app/component-library/components/Icons/Icon/Icon.types';

/**
 * Individual tab item data interface
 */
export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
  isDisabled?: boolean;
  testID?: string;
  /**
   * Optional icon rendered above the tab label.
   */
  iconName?: IconName;
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
  /**
   * Tailwind CSS classes to apply to the main container
   */
  twClassName?: string;
}
