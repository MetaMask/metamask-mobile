// External dependencies.
import { NetworkProps } from '../../../../Networks/Network/Network.types';
import { BadgeVariants } from '../../Badge.types';
import { BadgeBaseProps } from '../../foundation/BadgeBase/BadgeBase.types';

/**
 * BadgeNetwork component props.
 */
export interface BadgeNetworkProps extends Omit<BadgeBaseProps, 'children'> {
  /**
   * Variant of badge.
   */
  variant?: BadgeVariants.Network;
  /**
   * Props for the network content.
   */
  networkProps: NetworkProps;
}

/**
 * Style sheet input parameters.
 */
export type BadgeNetworkStyleSheetVars = Pick<BadgeNetworkProps, 'style'>;
