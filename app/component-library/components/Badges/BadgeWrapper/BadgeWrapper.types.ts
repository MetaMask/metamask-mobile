// Third party dependencies.
import React, { ReactElement, JSXElementConstructor } from 'react';
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
export interface BadgePositionObj {
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
   * Shape of the element the badge will anchor to.
   * @default BadgeAnchorElementShape.Circular
   */
  anchorElementShape?: BadgeAnchorElementShape;
  /**
   * Position of the badge.
   * @default BadgePosition.TopRight
   */
  badgePosition?: BadgePosition;
  /**
   * Optional position obj prop to override the badge position.
   */
  badgePositionObj?: BadgePositionObj;
  /**
   * The children element that the badge will attach itself to.
   */
  children: React.ReactNode;
  /**
   * Any element that will be placed in the position of the badge.
   */
  badge: ReactElement<any, string | JSXElementConstructor<any>>;
}
