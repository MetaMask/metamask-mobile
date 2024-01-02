// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * Skeleton variants.
 */
export enum SkeletonShape {
  Rectangle = 'Rectangle',
  Pill = 'Pill',
  Circle = 'Circle',
}

/**
 * Skeleton component props.
 */
export interface SkeletonProps extends ViewProps {
  /**
   * Required prop to configure the width of the Skeleton
   */
  width: number;
  /**
   * Required prop to configure the height of the Skeleton
   */
  height: number;
  /**
   * Optional prop to configure the shape of the Skeleton
   * @default SkeletonShape.Rectangle
   */
  shape?: SkeletonShape;
}

/**
 * Style sheet Skeleton parameters.
 */
export interface SkeletonStyleSheetVars extends SkeletonProps {
  shape: SkeletonShape;
}
