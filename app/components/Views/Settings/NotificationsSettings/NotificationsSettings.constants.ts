import { strings } from '../../../../../locales/i18n';

export const NotificationsViewSelectorsIDs = {
  [strings('app_settings.notifications_opts.assets_sent_title')]: 'AssetsSent',
  [strings('app_settings.notifications_opts.assets_received_title')]:
    'AssetsReceived',
  [strings('app_settings.notifications_opts.defi_title')]: 'Defi',
  [strings('app_settings.notifications_opts.snaps_title')]: 'Snaps',
  [strings('app_settings.notifications_opts.products_announcements_title')]:
    'ProductsAnnouncements',
};

export enum NotificationsKinds {
  SENT = 'sent',
  RECEIVED = 'received',
  STAKED = 'staked',
  SWAPED = 'swaped',
  DEFI = 'defi',
  SNAPS = 'snaps',
  BRIDGED = 'bridged',
  BOUGHT = 'bought',
  PRODUCTS_ANNOUNCEMENTS = 'product-announcements',
}
