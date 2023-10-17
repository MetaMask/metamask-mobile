// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { BadgeVariant } from '../../Badge.types';
import { BadgeBaseProps } from '../../foundation/BadgeBase/BadgeBase.types';

/**
 * BadgeNetwork component props.
 */
export interface BadgeNetworkProps extends Omit<BadgeBaseProps, 'children'> {
  /**
   * Optional prop to control the variant of badge.
   */
  variant: BadgeVariant.Network;
  /**
   * Optional prop for name of the network.
   */
  name?: string;
  /**
   * Optional prop to control the image source of the network
   * from either a local or remote source.
   */
  imageSource?: ImageSourcePropType;
}

/**
 * Style sheet BadgeNetwork parameters.
 */
export type BadgeNetworkStyleSheetVars = Pick<BadgeNetworkProps, 'style'> & {
  containerSize: { width: number; height: number } | null;
};
