import React, { useCallback } from 'react';
import { useFeatureAnnouncementToggle } from '../../../../util/notifications/hooks/useSwitchNotifications';
import CustomNotificationsRow from './CustomNotificationsRow';
import { strings } from '../../../../../locales/i18n';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';

export function FeatureAnnouncementToggle() {
  const { data: isEnabled, switchFeatureAnnouncements } =
    useFeatureAnnouncementToggle();

  const toggleCustomNotificationsEnabled = useCallback(async () => {
    await switchFeatureAnnouncements(!isEnabled);
  }, [isEnabled, switchFeatureAnnouncements]);

  return (
    <CustomNotificationsRow
      title={strings(
        `app_settings.notifications_opts.products_announcements_title`,
      )}
      isEnabled={isEnabled}
      toggleCustomNotificationsEnabled={toggleCustomNotificationsEnabled}
      testID={NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE}
    />
  );
}
