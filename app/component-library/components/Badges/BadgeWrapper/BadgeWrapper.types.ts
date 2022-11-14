// Third party dependencies.
import React from 'react';
import { ViewProps } from 'react-native';

// External dependencies.
import { BadgeProps } from '../Badge/Badge.types';

/**
 * Badge Position.
 */
export interface BadgePositions {
  top?: number | string | undefined;
  right?: number | string | undefined;
  bottom?: number | string | undefined;
  left?: number | string | undefined;
}

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
  /**
   * Optional enum to set the position for the Badge.
   */
  badgePositions?: BadgePositions;
  /**
   * Optional enum to set the scale for the Badge.
   */
  badgeScale?: number;
}

/**
 * Style sheet input parameters.
 */
export type BadgeWrapperStyleSheetVars = Pick<
  BadgeWrapperProps,
  'style' | 'badgePositions' | 'badgeScale'
>;
