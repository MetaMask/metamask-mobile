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

export type BadgeProps =
  | (BadgeNetworkProps & { variant: BadgeVariant.Network })
  | (BadgeStatusProps & { variant: BadgeVariant.Status })
  | (BadgeNotificationsProps & { variant: BadgeVariant.NotificationsKinds });
