import React, { useCallback } from 'react';
import { useFeatureAnnouncementToggle } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import CustomNotificationsRow from './CustomNotificationsRow';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { NotificationSettingsViewSelectorsIDs } from '../../../../../e2e/selectors/Notifications/NotificationSettingsView.selectors';

export function FeatureAnnouncementToggle() {
  const { data: isEnabled, switchFeatureAnnouncements } =
    useFeatureAnnouncementToggle();
  const { trackEvent, createEventBuilder } = useMetrics();

  const toggleCustomNotificationsEnabled = useCallback(async () => {
    await switchFeatureAnnouncements(!isEnabled);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
        .addProperties({
          settings_type: 'product_announcements',
          old_value: isEnabled,
          new_value: !isEnabled,
        })
        .build(),
    );
  }, [createEventBuilder, isEnabled, switchFeatureAnnouncements, trackEvent]);

  return (
    <CustomNotificationsRow
      title={strings(
        `app_settings.notifications_opts.products_announcements_title`,
      )}
      icon={IconName.Sparkle}
      isEnabled={isEnabled}
      toggleCustomNotificationsEnabled={toggleCustomNotificationsEnabled}
      testID={NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE}
    />
  );
}
