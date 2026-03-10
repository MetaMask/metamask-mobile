import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { useNavigation, RouteProp } from '@react-navigation/native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useTheme } from '../../../util/theme';
import { TelegramLoginSelectorIDs } from './TelegramLogin.testIds';

const TELEGRAM_BOT_NAME = process.env.TELEGRAM_BOT_NAME || '';
const TELEGRAM_LOGIN_BASE_URL = process.env.TELEGRAM_LOGIN_BASE_URL || '';
const REDIRECT_SCHEME = 'metamask-telegram://callback';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginRouteParams {
  createWallet?: boolean;
}

interface TelegramLoginParamList {
  TelegramLogin: TelegramLoginRouteParams;
  [key: string]: object | undefined;
}

interface TelegramLoginProps {
  route?: RouteProp<TelegramLoginParamList, 'TelegramLogin'>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

function parseUserFromUrl(url: string): TelegramUser | null {
  try {
    const urlObj = new URL(url);
    const id = urlObj.searchParams.get('id');
    if (!id) return null;
    return {
      id: Number(id),
      first_name: urlObj.searchParams.get('first_name') || '',
      last_name: urlObj.searchParams.get('last_name') || undefined,
      username: urlObj.searchParams.get('username') || undefined,
      photo_url: urlObj.searchParams.get('photo_url') || undefined,
      auth_date: Number(urlObj.searchParams.get('auth_date')),
      hash: urlObj.searchParams.get('hash') || '',
    };
  } catch {
    return null;
  }
}

const TelegramLogin: React.FC<TelegramLoginProps> = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const hasNavigatedBack = useRef(false);

  const loginUrl =
    TELEGRAM_BOT_NAME && TELEGRAM_LOGIN_BASE_URL
      ? `${TELEGRAM_LOGIN_BASE_URL}/telegram-login.html?bot=${TELEGRAM_BOT_NAME}`
      : '';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Telegram Login',
      headerBackTitle: ' ',
      headerStyle: { backgroundColor: colors.background.default },
      headerTintColor: colors.text.default,
    });
  }, [navigation, colors]);

  const navigateWithUser = useCallback(
    (user: TelegramUser) => {
      if (hasNavigatedBack.current) return;
      hasNavigatedBack.current = true;
      navigation.navigate('Onboarding', { telegramUser: user });
    },
    [navigation],
  );

  // Android: use InAppBrowser (Chrome Custom Tabs) for proper keyboard support
  useEffect(() => {
    if (Platform.OS !== 'android' || !loginUrl) return;

    const openInAppBrowser = async () => {
      try {
        const isAvailable = await InAppBrowser.isAvailable();
        if (!isAvailable) {
          Alert.alert('Error', 'InAppBrowser is not available on this device.');
          navigation.goBack();
          return;
        }

        const androidLoginUrl = `${loginUrl}&platform=android`;

        const result = await InAppBrowser.openAuth(
          androidLoginUrl,
          REDIRECT_SCHEME,
          {
            showTitle: true,
            toolbarColor: colors.background.default,
            enableUrlBarHiding: true,
            enableDefaultShare: false,
          },
        );

        if (result.type === 'success' && result.url) {
          const user = parseUserFromUrl(result.url);
          if (user) {
            navigateWithUser(user);
            return;
          }
        }

        // User cancelled or no data received
        navigation.goBack();
      } catch (error) {
        console.warn('InAppBrowser error:', error);
        navigation.goBack();
      }
    };

    openInAppBrowser();
  }, [loginUrl, colors, navigation, navigateWithUser]);

  // iOS: WebView callback handler
  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'telegram_auth_success' && data.user) {
          navigateWithUser(data.user as TelegramUser);
        }
      } catch (error) {
        console.warn('Failed to parse Telegram auth message:', error);
      }
    },
    [navigateWithUser],
  );

  if (!loginUrl) {
    Alert.alert(
      'Configuration Missing',
      'TELEGRAM_BOT_NAME or TELEGRAM_LOGIN_BASE_URL is not set. Please set them in .js.env and restart.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
    return null;
  }

  // Android uses InAppBrowser (launched via useEffect above), show empty container
  if (Platform.OS === 'android') {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background.default },
        ]}
        testID={TelegramLoginSelectorIDs.CONTAINER_ID}
      />
    );
  }

  // iOS uses WebView
  const iosLoginUrl = `${loginUrl}&platform=ios`;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.default }]}
      testID={TelegramLoginSelectorIDs.CONTAINER_ID}
    >
      <WebView
        testID={TelegramLoginSelectorIDs.WEBVIEW_ID}
        source={{
          uri: iosLoginUrl,
          headers: { 'ngrok-skip-browser-warning': 'true' },
        }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        startInLoadingState
      />
    </View>
  );
};

export default TelegramLogin;
