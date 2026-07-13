import { strings } from '../../../../locales/i18n';

// Maps a categoryId to the stem of its existing app_settings.notifications_opts.*
// i18n keys. Keeps the mock catalog's label/description fields as structural
// placeholders while translated copy keeps coming from the existing locale keys.
const CATEGORY_ID_TO_I18N_STEM: Record<string, string> = {
  walletActivity: 'wallet_activity',
  perps: 'perps',
  agenticCli: 'agentic_cli',
  socialAI: 'social_ai',
  marketing: 'marketing',
  priceAlerts: 'price_alerts',
};

export function getCategoryTitle(categoryId: string): string {
  const stem = CATEGORY_ID_TO_I18N_STEM[categoryId];
  return stem
    ? strings(`app_settings.notifications_opts.${stem}_title`)
    : categoryId;
}

export function getCategoryDescription(categoryId: string): string {
  const stem = CATEGORY_ID_TO_I18N_STEM[categoryId];
  return stem
    ? strings(`app_settings.notifications_opts.${stem}_desc`)
    : '';
}
