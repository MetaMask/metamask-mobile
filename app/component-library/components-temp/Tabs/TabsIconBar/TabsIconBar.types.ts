// Third party dependencies.
import React from 'react';
import { Animated } from 'react-native';

// External dependencies.
import { Box } from '@metamask/design-system-react-native';

// TODO: @MetaMask/design-system-engineers
// Use the concrete Box component props here instead of BoxProps.
// https://github.com/MetaMask/metamask-design-system/issues/1115
type BoxComponentProps = React.ComponentProps<typeof Box>;

// Internal dependencies.
import { IconName } from '../../../components/Icons/Icon/Icon.types';

/**
 * Individual tab item data interface for the icon tab bar.
 * Icon is required — use the base TabsBar for text-only tabs.
 */
export interface TabsIconItem {
  key: string;
  label: string;
  content: React.ReactNode;
  iconName: IconName;
  isDisabled?: boolean;
  testID?: string;
}

/**
 * TabsIconBar component props
 */
export interface TabsIconBarProps extends BoxComponentProps {
  /**
   * Array of tab items — each must include an iconName
   */
  tabs: TabsIconItem[];
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
  /**
   * When true, each tab stretches equally to fill the full container width.
   * Disables horizontal scrolling and gap spacing. Defaults to false.
   */
  fillWidth?: boolean;
  /**
   * Optional Animated.Value (0=visible, 1=hidden) that collapses the tab row height to zero.
   * Requires useNativeDriver: false on the driving animation.
   */
  collapseAnim?: Animated.Value;
  /**
   * When provided alongside `collapseAnim`, the tab row collapses BY this many pixels at the
   * fully-hidden state (1.0) instead of collapsing all the way to 0. Use this to shrink the
   * row by just the icon area (for example) while keeping labels visible.
   */
  collapseBy?: number;
}
