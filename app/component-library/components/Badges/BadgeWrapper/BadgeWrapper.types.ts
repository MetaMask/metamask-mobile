// Third party dependencies.
import React from 'react';
import { ViewProps } from 'react-native';

/**
 * Badge Anchor Element Shape.
 */
export enum BadgeAnchorElementShape {
  Rectangular = 'Rectangular',
  Circular = 'Circular',
}

/**
 * Badge Position.
 */
export enum BadgePosition {
  TopRight = 'TopRight',
  BottomRight = 'BottomRight',
  BottomLeft = 'BottomLeft',
  TopLeft = 'TopLeft',
}

/**
 * Badge Position Obj.
 */
export interface BadgePositionCustom {
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
   * Optional prop to control the shape of the element the badge will anchor to.
   * @default BadgeAnchorElementShape.Circular
   */
  anchorElementShape?: BadgeAnchorElementShape;
  /**
   * Optional prop to control the position of the badge.
   * @default BadgePosition.TopRight
   */
  badgePosition?: BadgePosition | BadgePositionCustom;
  /**
   * The children element that the badge will attach itself to.
   */
  children: React.ReactNode;
  /**
   * Any element that will be placed in the position of the badge.
   */
  badgeElement: React.ReactNode;
}

/**
 * Style sheet BadgeWrapper parameters.
 */
export type BadgeWrapperStyleSheetVars = Pick<BadgeWrapperProps, 'style'> & {
  anchorElementShape: BadgeAnchorElementShape;
  badgePosition: BadgePosition | BadgePositionCustom;
  containerSize: { width: number; height: number } | null;
};
