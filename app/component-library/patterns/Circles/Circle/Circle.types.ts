// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { BadgeProps } from '../../../components/Badges/Badge';

/**
 * CirclePattern sizes.
 */
export enum CirclePatternSizes {
  Xs = '16',
  Sm = '24',
  Md = '32',
  Lg = '40',
  Xl = '48',
}

/**
 * CirclePattern Badge Position.
 */
export enum CirclePatternBadgePositions {
  TopRight = 'TopRight',
  BottomRight = 'BottomRight',
}

/**
 * CirclePattern component props.
 */
export interface CirclePatternProps extends ViewProps {
  /**
   * Optional enum to select between CirclePattern sizes.
   * @default Md
   */
  size?: CirclePatternSizes;
  /**
   * Enum for the Badge props.
   */
  badgeProps?: BadgeProps;
  /**
   * Optional enum to set the position for the Badge.
   * @default CirclePatternBadgePositions.TopRight
   */
  badgePosition?: CirclePatternBadgePositions;
}

/**
 * Style sheet input parameters.
 */
export type CirclePatternStyleSheetVars = Pick<
  CirclePatternProps,
  'style' | 'size'
>;
