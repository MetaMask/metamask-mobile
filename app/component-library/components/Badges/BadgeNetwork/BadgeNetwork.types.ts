// 3rd party dependencies.
import { ImageSourcePropType, ViewProps } from 'react-native';

/**
 * Enum that represents the position of the network badge.
 */
export enum BadgeNetworkPosition {
  TopRight = 'TopRight',
  BottomRight = 'BottomRight',
}

/**
 * BadgeNetwork component props.
 */
export interface BadgeNetworkProps extends ViewProps {
  /**
   * Type of badge.
   */
  type: 'network';
  /**
   * Name of the network.
   */
  name: string;
  /**
   * Image of the network from either a local or remote source.
   */
  imageSource: ImageSourcePropType;
  /**
   * Enum that represents the position of the network badge.
   * @defaults TopRight
   */
  position?: BadgeNetworkPosition;
}

/**
 * Style sheet input parameters.
 */
export type BadgeNetworkStyleSheetVars = Pick<
  BadgeNetworkProps,
  'style' | 'position'
>;
