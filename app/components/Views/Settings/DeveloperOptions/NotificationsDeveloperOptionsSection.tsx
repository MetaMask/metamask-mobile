import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';
import { setDataCollectionForMarketing } from '../../../../actions/security';
import { resetPushPrePromptShown } from '../../../../util/notifications/constants/notification-storage-keys';

export default function NotificationsDeveloperOptionsSection() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const onResetPrompt = useCallback(async () => {
    await resetPushPrePromptShown();
  }, []);

  const onSetMarketingConsent = useCallback(() => {
    dispatch(setDataCollectionForMarketing(true));
  }, [dispatch]);

  const onUnsetMarketingConsent = useCallback(() => {
    dispatch(setDataCollectionForMarketing(false));
  }, [dispatch]);

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
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={onSetMarketingConsent}
        isFullWidth
        style={styles.accessory}
      >
        {strings(
          'app_settings.developer_options.notifications.set_marketing_consent',
        )}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={onUnsetMarketingConsent}
        isFullWidth
        style={styles.accessory}
      >
        {strings(
          'app_settings.developer_options.notifications.unset_marketing_consent',
        )}
      </Button>
    </>
  );
}
