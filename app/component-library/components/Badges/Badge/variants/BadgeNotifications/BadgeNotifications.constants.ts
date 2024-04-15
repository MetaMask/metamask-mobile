import { NotificationsKindTypes } from '../../../../../../util/notifications';
import { IconName, IconSize } from '../../../../Icons/Icon/Icon.types';

// Internal dependencies.
import { BadgeNotificationsProps } from './BadgeNotifications.types';

// Test IDs
export const BADGE_NOTIFICATIONS_TEST_ID = 'badge-notifications';
export const TEST_NOTIFICATIONS_ACTION = NotificationsKindTypes.transaction;
export const TEST_RNOTIFICATIONS_ICON_NAME = IconName.Send2;

// Defaults
export const DEFAULT_BADGENOTIFICATIONS_NOTIFICATIONSICON_SIZE = IconSize.Md;

export const SAMPLE_BADGENOTIFICATIONS_PROPS: BadgeNotificationsProps = {
  name: TEST_NOTIFICATIONS_ACTION,
  iconName: TEST_RNOTIFICATIONS_ICON_NAME,
};
