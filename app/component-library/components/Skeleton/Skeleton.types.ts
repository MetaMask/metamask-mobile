// Third party dependencies.
import React from 'react';
import { ViewProps, StyleProp, ViewStyle, Animated } from 'react-native';

/**
 * Skeleton component props.
 */
export interface SkeletonProps extends ViewProps {
  /**
   * Optional prop to set the height of the Skeleton
   */
  height?: number | string;
  /**
   * Optional prop to set the width of the Skeleton
   */
  width?: number | string;
  /**
   * Optional prop to set the children of the Skeleton
   */
  children?: React.ReactNode;
  /**
   * Optional prop to hide the children of the Skeleton
   */
  hideChildren?: boolean;
  /**
   * Optional prop to set the style of the Skeleton component
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional props to pass to the children wrapper View
   */
  childrenWrapperProps?: ViewProps;
  /**
   * Optional props to pass to the animated background View
   */
  animatedViewProps?: Partial<React.ComponentProps<typeof Animated.View>>;
}

/**
 * Style sheet vars for Skeleton component.
 */
export interface SkeletonStyleSheetVars {
  /**
   * Optional height for the Skeleton
   */
  height?: number | string;
  /**
   * Optional width for the Skeleton
   */
  width?: number | string;
  /**
   * Optional custom styles
   */
  style?: StyleProp<ViewStyle>;
}
