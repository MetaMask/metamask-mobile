// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { BadgeVariants } from '../../Badge.types';
import { BadgeBaseProps } from '../../foundation/BadgeBase/BadgeBase.types';

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
export interface BadgeNetworkProps extends Omit<BadgeBaseProps, 'children'> {
  /**
   * Variant of badge.
   */
  variant: BadgeVariants.Network;
  /**
   * Name of the network.
   */
  name: string;
  /**
   * Image of the network from either a local or remote source.
   */
  imageSource?: ImageSourcePropType;
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
