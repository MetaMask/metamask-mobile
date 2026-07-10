import { strings } from '../../../../../locales/i18n';

/**
 * Resolves a single i18n key (a `labelKey`) into the tracking label pair sent to
 * Segment. `label_localized` is the user's locale; `label_en` is the English copy
 * so dashboards stay readable regardless of locale. Deriving both from one key is
 * the single source of truth, so the two can never diverge.
 */
export const resolveTrackingLabel = (
  labelKey: string,
): { label_en: string; label_localized: string } => ({
  label_localized: strings(labelKey),
  label_en: strings(labelKey, { locale: 'en' }),
});
