import { strings } from '../../../../locales/i18n';
import type { NotificationCategoryMetadata } from './notification-categories.types';

// Maps an AUS key to the stem of its existing app_settings.notifications_opts.*
// i18n keys. Keyed by AUS key (not category_id) because category_id is
// backend-owned and may differ from the local naming.
const AUS_KEY_TO_I18N_STEM: Record<string, string> = {
  walletActivity: 'wallet_activity',
  perps: 'perps',
  agenticCli: 'agentic_cli',
  socialAI: 'social_ai',
  marketing: 'marketing',
  priceAlerts: 'price_alerts',
};

const getStem = (category: NotificationCategoryMetadata) =>
  AUS_KEY_TO_I18N_STEM[category.aus_keys[0]];

export function getCategoryTitle(category: NotificationCategoryMetadata) {
  const stem = getStem(category);
  return stem
    ? strings(`app_settings.notifications_opts.${stem}_title`)
    : category.category_id;
}

export function getCategoryDescription(category: NotificationCategoryMetadata) {
  const stem = getStem(category);
  return stem ? strings(`app_settings.notifications_opts.${stem}_desc`) : '';
}
