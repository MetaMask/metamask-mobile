import React, { useCallback } from 'react';
import { useTheme } from '../../../../util/theme';

import { Switch, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../component-library/hooks';
import { useMainNotificationToggle } from './MainNotificationToggle.hooks';
import styleSheet from './NotificationsSettings.styles';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import { NotificationChannel } from '../../../../core/Analytics/events/channels';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';

export const MAIN_NOTIFICATION_TOGGLE_TEST_ID = 'main-notification-toggle';

export const MainNotificationToggle = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { onToggle, value, isUpdating } = useMainNotificationToggle();

  const trackNotificationToggleEvent = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_SETTINGS_UPDATED)
        .addProperties({
          settings_type: 'master',
          notification_channel: NotificationChannel.ALL,
          enabled: !value,
        })
        .build(),
    );
  }, [value, trackEvent, createEventBuilder]);

  return (
    <>
      <Text color={TextColor.TextAlternative} variant={TextVariant.BodySm}>
        {strings('app_settings.allow_notifications_desc')}
      </Text>
      <View
        style={styles.switchElement}
        testID={MAIN_NOTIFICATION_TOGGLE_TEST_ID}
      >
        <Text
          color={TextColor.TextDefault}
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
        >
          {strings('app_settings.allow_notifications')}
        </Text>
        <Switch
          value={value}
          disabled={isUpdating}
          onValueChange={(newValue) => {
            trackNotificationToggleEvent();
            onToggle(newValue);
          }}
          trackColor={{
            true: theme.colors.primary.default,
            false: theme.colors.border.muted,
          }}
          thumbColor={theme.brandColors.white}
          style={styles.switch}
          ios_backgroundColor={theme.colors.border.muted}
          testID={NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE}
        />
      </View>
    </>
  );
};
