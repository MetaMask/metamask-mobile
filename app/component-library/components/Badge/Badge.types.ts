import { ViewProps } from 'react-native';

/**
 * Current available positions for badge placement
 */
export enum BadgePositionVariant {
  TopRight = 'top-right',
  BottomRight = 'bottom-right',
}

export interface BadgeCustomPosition {
  /**
   * Position of the top edge of badge in relative to the top edge
   * of the children. 0 means no movement, positive values indicate a
   * downward movement, and negative values imply an upward
   * movement of the badge in relative to the children.
   * @default 'auto'
   */
  top?: number | 'auto';
  /**
   * Position of the right edge of badge in relative to the right edge
   * of the children. 0 means no movement, positive values indicate a
   * leftward movement, and negative values imply a rightward
   * movement of the badge in relative to the children.
   * @default 'auto'
   */
  right?: number | 'auto';
  /**
   * Position of the bottom edge of badge in relative to the bottom edge
   * of the children. 0 means no movement, positive values indicate an
   * upward movement, and negative values imply a downward
   * movement of the badge in relative to the children.
   * @default 'auto'
   */
  bottom?: number | 'auto';
  /**
   * Position of the left edge of badge in relative to the left edge
   * of the children. 0 means no movement, positive values indicate an
   * rightward movement, and negative values imply a leftward
   * movement of the badge in relative to the children.
   * @default 'auto'
   */
  left?: number | 'auto';
}

/**
 * Badge component props.
 */
export interface BadgeProps extends ViewProps {
  /**
   * The content of the badge itself. This can take in any component.
   */
  badgeContent: React.ReactNode;
  /**
   * The children element that the badge will attach itself to.
   */
  children: React.ReactNode;
  /**
   * Optional placement position of the badge relative to the children.
   * The value can either be a preset position, or a custom positioning object.
   * @default TopRight
   */
  position?: BadgePositionVariant | BadgeCustomPosition;
}

/**
 * Style sheet input parameters.
 */
export type BadgeStyleSheetVars = Pick<BadgeProps, 'style' | 'position'>;
