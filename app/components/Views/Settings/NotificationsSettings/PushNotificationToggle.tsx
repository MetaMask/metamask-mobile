import React from 'react';
import { useTheme } from '../../../../util/theme';

import { Switch, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './NotificationsSettings.styles';
import { usePushNotificationSettingsToggle } from './PushNotificationToggle.hooks';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';

export const PUSH_NOTIFICATION_TOGGLE_TEST_ID = 'push-notification-toggle';

export const PushNotificationToggle = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const { onToggle, value, loading } = usePushNotificationSettingsToggle();

  return (
    <>
      <View
        style={styles.switchElement}
        testID={PUSH_NOTIFICATION_TOGGLE_TEST_ID}
      >
        <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
          {strings('app_settings.enable_push_notifications')}
        </Text>
        <Switch
          value={value}
          onChange={onToggle}
          disabled={loading}
          trackColor={{
            true: theme.colors.primary.default,
            false: theme.colors.border.muted,
          }}
          thumbColor={theme.brandColors.white}
          style={styles.switch}
          ios_backgroundColor={theme.colors.border.muted}
          testID={
            NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE
          }
        />
      </View>
    </>
  );
};
