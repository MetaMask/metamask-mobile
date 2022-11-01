// Third party dependencies.
import React from 'react';
import { StyleProp, ViewProps, ViewStyle } from 'react-native';

// External dependencies.
import { BadgeProps } from '../Badge/Badge.types';

/**
 * Badge component props.
 */
export interface BadgeWrapperProps extends ViewProps {
  /**
   * Props for the Badge component.
   */
  badgeProps: BadgeProps;
  /**
   * The children element that the badge will attach itself to.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export interface BadgeWrapperStyleSheetVars
  extends Pick<BadgeWrapperProps, 'style'> {
  badgeStyle: StyleProp<ViewStyle>;
}
