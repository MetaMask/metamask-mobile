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
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { devApiEnv } from '../../../../core/devApiEnv';
import styleSheet from './DeveloperOptions.styles';

const CLEAR_AUTH_SESSION_TEST_ID = 'identity-dev-clear-auth-session-button';

const IdentityDeveloperOptionsSection = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const handleClearAuthSession = useCallback(() => {
    try {
      Engine.context.AuthenticationController.performSignOut();
    } catch (error) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'IdentityDeveloperOptionsSection: clear auth session failed',
      );
    }
  }, []);

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.identity.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.identity.description', {
          env: devApiEnv(),
        })}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleClearAuthSession}
        isFullWidth
        style={styles.accessory}
        testID={CLEAR_AUTH_SESSION_TEST_ID}
      >
        {strings(
          'app_settings.developer_options.identity.clear_auth_session_button',
        )}
      </Button>
    </>
  );
};

export default IdentityDeveloperOptionsSection;
