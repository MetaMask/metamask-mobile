import {
  INotification,
  TRIGGER_TYPES,
} from '@metamask/notification-services-controller/notification-services';
import { ModalFieldType, ModalHeaderType } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import { getNotificationBadge } from '../../methods/common';
import METAMASK_FOX from '../../../../images/branding/fox.png';
import { hasMinimumRequiredVersion } from '../../../remoteFeatureFlag';

type FeatureAnnouncementNotification =
  ExtractedNotification<TRIGGER_TYPES.FEATURES_ANNOUNCEMENT>;

const isFeatureAnnouncementNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
]);

const isFilteredFeatureAnnonucementNotification = (
  n: INotification,
): n is FeatureAnnouncementNotification => {
  if (!isFeatureAnnouncementNotification(n)) {
    return false;
  }

  // TODO - update core types add this property
  type Data = typeof n.data & { mobileMinimumVersionNumber?: string };
  const data = n.data as Data;

  // Field is not set, so show by default
  if (!data.mobileMinimumVersionNumber) {
    return true;
  }

  try {
    return hasMinimumRequiredVersion(data.mobileMinimumVersionNumber);
  } catch {
    // Invalid mobile version number, not showing notification
    return false;
  }
};

const state: NotificationState<FeatureAnnouncementNotification> = {
  guardFn: isFilteredFeatureAnnonucementNotification,
  createMenuItem: (notification) => ({
    title: notification.data.title,

    description: {
      start: notification.data.shortDescription,
    },

    image: {
      url: METAMASK_FOX,
    },

    badgeIcon: getNotificationBadge(notification.type),

    createdAt: notification.createdAt.toString(),
  }),
  createModalDetails: (notification) => ({
    title: notification.data.title,
    createdAt: notification.createdAt.toString(),
    header: {
      type: ModalHeaderType.ANNOUNCEMENT_IMAGE,
      imageUrl: `https:${notification.data.image.url}?fm=jpg&fl=progressive&w=1000&q=80`,
    },
    fields: [
      {
        type: ModalFieldType.ANNOUNCEMENT_DESCRIPTION,
        description: notification.data.longDescription,
      },
    ],
    /**
     * TODO support mobile links
     * GH Issue: https://github.com/MetaMask/metamask-mobile/issues/10377
     * */
  }),
};

export default state;
