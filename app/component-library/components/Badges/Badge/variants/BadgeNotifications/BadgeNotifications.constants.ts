import { NotificationTypes } from '../../../../../../util/notifications';
import { IconName } from '../../../../Icons/Icon/Icon.types';

// Internal dependencies.
import { BadgeNotificationsProps } from './BadgeNotifications.types';

// Test IDs
export const TEST_NOTIFICATIONS_ACTION = NotificationTypes.TRANSACTION;
export const TEST_NOTIFICATIONS_ICON_NAME = IconName.Send;

export const SAMPLE_BADGENOTIFICATIONS_PROPS: BadgeNotificationsProps = {
  iconName: TEST_NOTIFICATIONS_ICON_NAME,
};
