import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import Engine from '../../../../core/Engine';
import ClipboardManager from '../../../../core/ClipboardManager';
import Logger from '../../../../util/Logger';
import styleSheet from './AuthDebugging.styles';
import { AuthDebuggingSelectorsIDs } from './AuthDebugging.testIds';

interface AuthDebugInfo {
  isSignedIn: boolean;
  profileId?: string;
  bearerToken?: string;
  error?: string;
}

const loadAuthDebugInfo = async (): Promise<AuthDebugInfo> => {
  const { AuthenticationController } = Engine.context;

  if (!AuthenticationController.isSignedIn()) {
    return { isSignedIn: false };
  }

  try {
    const [profile, bearerToken] = await Promise.all([
      AuthenticationController.getSessionProfile(),
      AuthenticationController.getBearerToken(),
    ]);
    return {
      isSignedIn: true,
      profileId: profile?.profileId,
      bearerToken,
    };
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'AuthDebugging: failed to load auth debug info',
    );
    return {
      isSignedIn: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const AuthDebugging = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const [isLoading, setIsLoading] = useState(true);
  const [info, setInfo] = useState<AuthDebugInfo>({ isSignedIn: false });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await loadAuthDebugInfo();
    setInfo(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = useCallback(async (key: string, value?: string) => {
    if (!value) {
      return;
    }
    await ClipboardManager.setString(value);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 2000);
  }, []);

  const renderField = (
    key: string,
    title: string,
    value: string | undefined,
    valueTestID: string,
    copyTestID: string,
  ) => (
    <Box style={styles.section}>
      <Text variant={TextVariant.HeadingSm} style={styles.heading}>
        {title}
      </Text>
      <Box style={styles.valueBox}>
        <Text
          variant={TextVariant.BodyMd}
          color={value ? TextColor.TextDefault : TextColor.TextAlternative}
          testID={valueTestID}
        >
          {value ?? strings('app_settings.auth_debugging.not_available')}
        </Text>
      </Box>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={() => handleCopy(key, value)}
        isDisabled={!value}
        isFullWidth
        style={styles.accessory}
        testID={copyTestID}
      >
        {copiedKey === key
          ? strings('app_settings.auth_debugging.copied')
          : strings('app_settings.auth_debugging.copy')}
      </Button>
    </Box>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <ActivityIndicator
          style={styles.loader}
          color={theme.colors.icon.default}
        />
      );
    }

    if (!info.isSignedIn) {
      return (
        <Box style={styles.section}>
          <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
            {strings('app_settings.auth_debugging.not_signed_in')}
          </Text>
        </Box>
      );
    }

    return (
      <>
        {info.error ? (
          <Box style={styles.section}>
            <Text color={TextColor.ErrorDefault} variant={TextVariant.BodyMd}>
              {info.error}
            </Text>
          </Box>
        ) : (
          <>
            {renderField(
              'profileId',
              strings('app_settings.auth_debugging.profile_id_title'),
              info.profileId,
              AuthDebuggingSelectorsIDs.PROFILE_ID_VALUE,
              AuthDebuggingSelectorsIDs.PROFILE_ID_COPY_BUTTON,
            )}
            {renderField(
              'jwt',
              strings('app_settings.auth_debugging.jwt_title'),
              info.bearerToken,
              AuthDebuggingSelectorsIDs.JWT_VALUE,
              AuthDebuggingSelectorsIDs.JWT_COPY_BUTTON,
            )}
          </>
        )}
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          onPress={load}
          isFullWidth
          style={styles.section}
          testID={AuthDebuggingSelectorsIDs.REFRESH_BUTTON}
        >
          {strings('app_settings.auth_debugging.refresh')}
        </Button>
      </>
    );
  };

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={styles.wrapper}
      testID={AuthDebuggingSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={strings('app_settings.auth_debugging.title')}
        onBack={handleBack}
        includesTopInset
        testID={AuthDebuggingSelectorsIDs.HEADER}
        backButtonProps={{ testID: AuthDebuggingSelectorsIDs.BACK_BUTTON }}
      />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
          {strings('app_settings.auth_debugging.description')}
        </Text>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AuthDebugging;
