import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { strings } from '../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../component-library/hooks';
import Routes from '../../../../constants/navigation/Routes';
import { useTheme } from '../../../../util/theme';
import styleSheet from './NotificationsSettings.styles';

export const RESET_NOTIFICATIONS_BUTTON_TEST_ID = 'reset_notifications_button';

export const ResetNotificationsButton = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const onPressResetNotifications = useCallback(() => {
    navigation.navigate(Routes.SHEET.RESET_NOTIFICATIONS);
  }, [navigation]);

  return (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('app_settings.reset_notifications')}
      size={ButtonSize.Md}
      onPress={onPressResetNotifications}
      style={styles.button}
      testID={RESET_NOTIFICATIONS_BUTTON_TEST_ID}
    />
  );
};
