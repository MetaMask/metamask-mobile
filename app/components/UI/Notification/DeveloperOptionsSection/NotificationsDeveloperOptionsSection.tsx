import React, { useCallback } from 'react';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './NotificationsDeveloperOptionsSection.styles';
import { resetPushPrePromptShown } from '../../../../util/notifications/constants/notification-storage-keys';

export default function NotificationsDeveloperOptionsSection() {
  const { styles } = useStyles(styleSheet);

  const onResetPrompt = useCallback(async () => {
    await resetPushPrePromptShown();
  }, []);

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.notifications.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.notifications.description')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={onResetPrompt}
        isFullWidth
        style={styles.accessory}
      >
        {strings('app_settings.developer_options.notifications.reset_prompt')}
      </Button>
    </>
  );
}
