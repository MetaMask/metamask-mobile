import { strings } from '../../../../../locales/i18n';
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-require-imports */

const notificationsIconAssetsReceived = require('../../../../images/notifications-icons/assets_received.png');
const notificationsIconAssetsSent = require('../../../../images/notifications-icons/assets_sent.png');
const notificationsIconDefi = require('../../../../images/notifications-icons/defi.png');
const notificationsIconSnaps = require('../../../../images/notifications-icons/snaps.png');
const notificationsIconProductsAnnoucements = require('../../../../images/notifications-icons/products_annoucements.png');

const notificationsOpts = [
  {
    icon: notificationsIconAssetsSent,
    title: strings(`app_settings.notifications_opts.assets_sent_title`),
    description: strings(`app_settings.notifications_opts.assets_sent_desc`),
    disabled: false,
    value: false,
  },
  {
    icon: notificationsIconAssetsReceived,
    title: strings(`app_settings.notifications_opts.assets_received_title`),
    description: strings(
      `app_settings.notifications_opts.assets_received_desc`,
    ),
    disabled: false,
    value: false,
  },
  {
    icon: notificationsIconDefi,
    title: strings(`app_settings.notifications_opts.defi_title`),
    description: strings(`app_settings.notifications_opts.defi_desc`),
    disabled: false,
    value: false,
  },
  {
    icon: notificationsIconSnaps,
    title: strings(`app_settings.notifications_opts.snaps_title`),
    description: strings(`app_settings.notifications_opts.snaps_desc`),
    disabled: false,
    value: false,
  },
  {
    icon: notificationsIconProductsAnnoucements,
    title: strings(
      `app_settings.notifications_opts.products_announcements_title`,
    ),
    description: strings(
      `app_settings.notifications_opts.products_announcements_desc`,
    ),
    disabled: false,
    value: false,
  },
];

export default notificationsOpts;
