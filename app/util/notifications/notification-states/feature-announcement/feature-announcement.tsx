import compareVersions from 'compare-versions';
import { getVersion } from 'react-native-device-info';
import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import {
  ModalFieldType,
  ModalFooterType,
  ModalHeaderType,
} from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import { getNotificationBadge } from '../../methods/common';
import METAMASK_FOX from '../../../../images/branding/fox.png';

// TODO - this is to be replaced by CORE
const hasMinRequiredVersion = (minRequiredVersion: string) => {
  if (!minRequiredVersion) return false;
  const currentVersion = getVersion();
  return compareVersions.compare(currentVersion, minRequiredVersion, '>');
};

const hasMaxRequiredVersion = (maxRequiredVersion: string) => {
  if (!maxRequiredVersion) return false;
  const currentVersion = getVersion();
  return compareVersions.compare(currentVersion, maxRequiredVersion, '<');
};

export function isValidMinimumVersion(contentfulMinimumVersionNumber?: string) {
  // Field is not set, show by default
  if (!contentfulMinimumVersionNumber) {
    return true;
  }

  try {
    return hasMinRequiredVersion(contentfulMinimumVersionNumber);
  } catch {
    // Invalid mobile version number, not showing banner
    return false;
  }
}

export function isValidMaximumVersion(contentfulMaximumVersionNumber?: string) {
  // Field is not set, show by default
  if (!contentfulMaximumVersionNumber) {
    return true;
  }

  try {
    return hasMaxRequiredVersion(contentfulMaximumVersionNumber);
  } catch {
    // Invalid mobile version number, not showing banner
    return false;
  }
}

type FeatureAnnouncementNotification =
  ExtractedNotification<TRIGGER_TYPES.FEATURES_ANNOUNCEMENT>;

const isFeatureAnnouncementNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.FEATURES_ANNOUNCEMENT,
]);

export const isFilteredFeatureAnnonucementNotification = (
  n: FeatureAnnouncementNotification,
) => {
  if (!isFeatureAnnouncementNotification(n)) {
    return false;
  }

  // Field is not set, so show by default
  if (!n.data.mobileMinimumVersionNumber) {
    return true;
  }

  try {
    const isValidMin = isValidMinimumVersion(n.data.mobileMinimumVersionNumber);
    const isValidMax = isValidMaximumVersion(n.data.mobileMaximumVersionNumber);

    return isValidMin && isValidMax;
  } catch {
    // Invalid mobile version number, not showing notification
    return false;
  }
};

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
    footer: {
      type: ModalFooterType.ANNOUNCEMENT_CTA,
      mobileLink: notification.data.mobileLink,
    },
    /**
     * TODO support mobile links
     * GH Issue: https://github.com/MetaMask/metamask-mobile/issues/10377
     * */
  }),
};

export default state;
