import React, { useCallback } from 'react';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { NotificationSettingsViewSelectorsIDs } from '../../../../../e2e/selectors/Notifications/NotificationSettingsView.selectors';
import CustomNotificationsRow from './CustomNotificationsRow';
import { usePerpsNotificationToggle } from '../../../../util/notifications/hooks/useSwitchNotifications';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';

export function PerpsNotificationToggle() {
  const { data: isEnabled, switchPerpsNotifications } =
    usePerpsNotificationToggle();
  const { trackEvent, createEventBuilder } = useMetrics();

  const togglePerpsNotificationsEnabled = useCallback(async () => {
    const newValue = !isEnabled;
    await switchPerpsNotifications(newValue);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
        .addProperties({
          settings_type: 'perps_trading',
          old_value: isEnabled,
          new_value: newValue,
        })
        .build(),
    );
  }, [createEventBuilder, isEnabled, switchPerpsNotifications, trackEvent]);

  return (
    <CustomNotificationsRow
      title={strings('app_settings.notifications_opts.perps_title')}
      icon={IconName.Chart}
      isEnabled={isEnabled}
      toggleCustomNotificationsEnabled={togglePerpsNotificationsEnabled}
      testID={NotificationSettingsViewSelectorsIDs.PERPS_NOTIFICATIONS_TOGGLE}
    />
  );
}
