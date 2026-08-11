import type { NotificationPreferenceSection } from './hooks/useNotificationStoragePreferences';

export interface FeatureNotificationsGateCopy {
  titleKey: string;
  descriptionKey: string;
  previewTitleKey: string;
  previewMessageKey: string;
  previewTimestampKey: string;
}

/**
 * Copy shown by the notifications gate for each supported feature.
 *
 * `satisfies` ensures every configured key is a notification preference
 * section, while `FeatureNotificationsGateFeature` prevents callers from
 * selecting a section that has no gate copy.
 */
export const FEATURE_NOTIFICATIONS_GATE_COPY = {
  priceAlerts: {
    titleKey: 'notifications.feature_gate.price_alerts.title',
    descriptionKey: 'notifications.feature_gate.price_alerts.description',
    previewTitleKey: 'notifications.feature_gate.price_alerts.preview.title',
    previewMessageKey:
      'notifications.feature_gate.price_alerts.preview.message',
    previewTimestampKey:
      'notifications.feature_gate.price_alerts.preview.timestamp',
  },
} as const satisfies Partial<
  Record<NotificationPreferenceSection, FeatureNotificationsGateCopy>
>;

export type FeatureNotificationsGateFeature =
  keyof typeof FEATURE_NOTIFICATIONS_GATE_COPY;
