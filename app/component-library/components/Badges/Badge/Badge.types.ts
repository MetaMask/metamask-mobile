// Internal dependencies.
import { BadgeNetworkProps } from './variants/BadgeNetwork/BadgeNetwork.types';
import { BadgeStatusProps } from './variants/BadgeStatus';
import { BadgeNotificationsProps } from './variants/BadgeNotifications';
/**
 * Badge variants.
 */
export enum BadgeVariant {
  Network = 'network',
  Status = 'status',
  NotificationsKinds = 'notifications-kinds',
}

/**
 * Badge Account component props.
 */
export type BadgeProps = (
  | BadgeNetworkProps
  | BadgeStatusProps
  | BadgeNotificationsProps
) & {
  /**
   * Optional prop to control the variant of Badge.
   */
  variant: BadgeVariant;
};
