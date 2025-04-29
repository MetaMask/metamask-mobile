// @ts-check
import enContent from '../../../locales/languages/en.json';

export const NotificationMenuViewSelectorsText = {
  ALL_TAB: enContent.notifications.list[0],
  WALLET_TAB: enContent.notifications.list[1],
  ANNOUNCEMENTS_TAB: enContent.notifications.list[2],
};

export const NotificationMenuViewSelectorsIDs = {
  TITLE: 'notification-menu-view-title',
  COG_WHEEL: 'notification-menu-view-cog-wheel',
  ITEM: (
    /** @type {string} */
    id,
  ) => `notification-menu-view-item-${id}`,
};
