import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useTheme } from '../../../util/theme';
import { Box } from '@metamask/design-system-react-native';

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

  useEffect(() => {
    if (!loginUrl) return;

    const openInAppBrowser = async () => {
      try {
        const isAvailable = await InAppBrowser.isAvailable();
        if (!isAvailable) {
          Alert.alert('Error', 'InAppBrowser is not available on this device.');
          navigation.goBack();
          return;
        }

        if (Platform.OS === 'android') {
          await new Promise<void>((resolve) => {
            const subscription = Linking.addEventListener('url', ({ url }) => {
              if (url.startsWith('metamask-telegram://')) {
                subscription.remove();
                const user = parseUserFromUrl(url);
                if (user) {
                  navigateWithUser(user);
                }
                resolve();
              }
            });

            InAppBrowser.open(loginUrl, {
              showTitle: true,
              toolbarColor: colors.background.default,
              enableUrlBarHiding: true,
              enableDefaultShare: false,
            }).then(() => {
              // Chrome Tab closed; wait briefly for Linking event to arrive
              setTimeout(() => {
                subscription.remove();
                resolve();
              }, 1000);
            });
          });

          if (!hasNavigatedBack.current) {
            navigation.goBack();
          }
        } else {
          const result = await InAppBrowser.openAuth(
            loginUrl,
            REDIRECT_SCHEME,
            {
              preferredBarTintColor: colors.background.default,
              preferredControlTintColor: colors.primary.default,
              ephemeralWebSession: false,
            },
          );

          if (result.type === 'success' && result.url) {
            const user = parseUserFromUrl(result.url);
            if (user) {
              navigateWithUser(user);
              return;
            }
          }

          navigation.goBack();
        }
      } catch (error) {
        console.warn('InAppBrowser error:', error);
        if (!hasNavigatedBack.current) {
          navigation.goBack();
        }
      }
    };

    openInAppBrowser();
  }, [loginUrl, colors, navigation, navigateWithUser]);

  if (!loginUrl) {
    Alert.alert(
      'Configuration Missing',
      'TELEGRAM_BOT_NAME or TELEGRAM_LOGIN_BASE_URL is not set. Please set them in .js.env and restart.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
    return null;
  }

  return <Box twClassName="flex-1 bg-default" />;
};

export default TelegramLogin;
