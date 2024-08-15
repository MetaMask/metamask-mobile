// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Notifications team directory
import {
  ModalFieldType,
  ModalHeaderType,
  TRIGGER_TYPES,
} from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import { getNotificationBadge } from '../../methods/common';
import METAMASK_FOX from '../../../../images/fox.png';

type FeatureAnnouncementNotification =
  ExtractedNotification<TRIGGER_TYPES.FEATURES_ANNOUNCEMENT>;

const isFeatureAnnouncementNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
]);

const state: NotificationState<FeatureAnnouncementNotification> = {
  guardFn: isFeatureAnnouncementNotification,
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
