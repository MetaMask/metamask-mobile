// Internal dependencies.
import { BadgeNetworkProps } from './variants/BadgeNetwork/BadgeNetwork.types';
import { BadgeStatusProps } from './variants/BadgeStatus';

/**
 * Badge variants.
 */
export enum BadgeVariant {
  Network = 'network',
  Status = 'status',
}

/**
 * Badge Account component props.
 */
export type BadgeProps = (BadgeNetworkProps | BadgeStatusProps) & {
  /**
   * Optional prop to control the variant of Badge.
   */
  variant: BadgeVariant;
};
