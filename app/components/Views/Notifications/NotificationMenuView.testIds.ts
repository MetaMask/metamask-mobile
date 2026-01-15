import enContent from '../../../../locales/languages/en.json';

export const NotificationMenuViewSelectorsText = {
  ALL_TAB: enContent.notifications.list[0],
  WALLET_TAB: enContent.notifications.list[1],
  ANNOUNCEMENTS_TAB: enContent.notifications.list[2],
};

export const NotificationMenuViewSelectorsIDs = {
  TITLE: 'notification-menu-view-title',
  COG_WHEEL: 'notification-menu-view-cog-wheel',
  ITEM: (id: string) => `notification-menu-view-item-${id}`,
  ITEM_LIST_SCROLLVIEW: 'notification-menu-scroll-view',
};
