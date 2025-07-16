// Third party dependencies.
import React from 'react';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import { ViewStyle } from 'react-native';

/**
 * TabBar component props.
 * Extends all props from DefaultTabBar.
 */
export interface TabBarProps
  extends React.ComponentProps<typeof DefaultTabBar> {
  /**
   * Optional additional styling
   */
  style?: ViewStyle;
}
