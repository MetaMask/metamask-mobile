import React, { useCallback } from 'react';
import { useTheme } from '../../../../util/theme';

import { Linking, Switch, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import AppConstants from '../../../../core/AppConstants';
import { useMainNotificationToggle } from './MainNotificationToggle.hooks';
import styleSheet from './NotificationsSettings.styles';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';

export const MAIN_NOTIFICATION_TOGGLE_TEST_ID = 'main-notification-toggle';
export const MAIN_NOTIFICATION_TOGGLE_LEARN_MORE_TEST_ID =
  'main-notification-toggle--learn-more-button';

export const MainNotificationToggle = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const { onToggle, value } = useMainNotificationToggle();

  const goToLearnMore = useCallback(() => {
    Linking.openURL(AppConstants.URLS.PROFILE_SYNC);
  }, []);

  return (
    <>
      <View
        style={styles.switchElement}
        testID={MAIN_NOTIFICATION_TOGGLE_TEST_ID}
      >
        <Text color={TextColor.Default} variant={TextVariant.BodyLGMedium}>
          {strings('app_settings.allow_notifications')}
        </Text>
        <Switch
          value={value}
          onChange={onToggle}
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
      <View style={styles.setting}>
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {strings('app_settings.allow_notifications_desc')}{' '}
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Info}
            onPress={goToLearnMore}
            testID={MAIN_NOTIFICATION_TOGGLE_LEARN_MORE_TEST_ID}
          >
            {strings('notifications.activation_card.learn_more')}
          </Text>
        </Text>
      </View>
    </>
  );
};
