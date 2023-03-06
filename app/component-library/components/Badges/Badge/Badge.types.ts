// Internal dependencies.
import { BadgeNetworkProps } from './variants/BadgeNetwork/BadgeNetwork.types';
import { BadgeStatusProps } from './variants/BadgeStatus';

/**
 * Badge variants.
 */
export enum BadgeVariants {
  Network = 'network',
  Status = 'status',
}

/**
 * Badge Account component props.
 */
export type BadgeProps = BadgeNetworkProps | BadgeStatusProps;
