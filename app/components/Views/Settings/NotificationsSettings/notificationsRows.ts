import { IconName } from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';

const notificationsRows = [
  {
    icon: IconName.Arrow2Upright,
    title: strings(`app_settings.notifications_opts.assets_sent_title`),
    description: strings(`app_settings.notifications_opts.assets_sent_desc`),
    disabled: false,
    value: true,
  },
  {
    icon: IconName.Received,
    title: strings(`app_settings.notifications_opts.assets_received_title`),
    description: strings(
      `app_settings.notifications_opts.assets_received_desc`,
    ),
    disabled: false,
    value: true,
  },
  {
    icon: IconName.Plant,
    title: strings(`app_settings.notifications_opts.defi_title`),
    description: strings(`app_settings.notifications_opts.defi_desc`),
    disabled: false,
    value: true,
  },
  {
    icon: IconName.SwapHorizontal,
    title: strings(`app_settings.notifications_opts.snaps_title`),
    description: strings(`app_settings.notifications_opts.snaps_desc`),
    disabled: false,
    value: true,
  },
  {
    icon: IconName.Sparkle,
    title: strings(
      `app_settings.notifications_opts.products_announcements_title`,
    ),
    description: strings(
      `app_settings.notifications_opts.products_announcements_desc`,
    ),
    disabled: false,
    value: true,
  },
];

export default notificationsRows;
