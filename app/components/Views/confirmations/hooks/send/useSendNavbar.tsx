import React, { useMemo, useCallback } from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useSendActions } from './useSendActions';

export function useSendNavbar() {
  const { handleCancelPress } = useSendActions();
  const navigation = useNavigation();
  const theme = useTheme();
  const sendStackState = useNavigationState((state) => state);

  const handleBackPress = useCallback(() => {
    const sendRoute = sendStackState.routes.find(
      (route) => route.name === 'Send',
    );
    // Handle nested Send route navigation
    const sendRouteState = sendRoute?.state;
    if (sendRouteState && sendRouteState.routes.length > 1) {
      const currentIndex = sendRouteState.index;
      const previousRoute = currentIndex
        ? sendRouteState.routes[currentIndex - 1]
        : null;

      const screenName = previousRoute?.name || Routes.SEND.ASSET;
      navigation.navigate(Routes.SEND.DEFAULT, { screen: screenName });
      return;
    }

    // Handle main stack navigation
    const sendRouteIndex = sendStackState.routes.findIndex(
      (route) => route.name === 'Send',
    );

    if (sendRouteIndex <= 0) {
      navigation.navigate(Routes.WALLET_VIEW);
      return;
    }

    const previousMainRoute = sendStackState.routes[sendRouteIndex - 1];

    // Navigate to previous route with special handling for specific routes
    if (previousMainRoute.name === 'Home') {
      navigation.navigate(Routes.WALLET_VIEW);
    } else {
      navigation.navigate(previousMainRoute.name, previousMainRoute.params);
    }
  }, [navigation, sendStackState]);

  const headerStyle = useMemo(
    () => ({
      backgroundColor: theme.colors.background.default,
      shadowColor: 'transparent',
      elevation: 0,
    }),
    [theme.colors.background.default],
  );

  const headerRight = useCallback(
    () => (
      <ButtonIcon
        size={ButtonIconSize.Lg}
        iconName={IconName.Close}
        onPress={handleCancelPress}
        twClassName="mr-1"
        testID="send-navbar-close-button"
      />
    ),
    [handleCancelPress],
  );

  const headerTitle = useCallback(
    () => (
      <Box alignItems={BoxAlignItems.Center} twClassName="items-center">
        <Text variant={TextVariant.HeadingMd}>{strings('send.title')}</Text>
      </Box>
    ),
    [],
  );

  const createHeaderLeft = useCallback(
    (onPress: () => void) => () =>
      (
        <ButtonIcon
          size={ButtonIconSize.Lg}
          iconName={IconName.ArrowLeft}
          onPress={onPress}
          twClassName="ml-2"
          testID="send-navbar-back-button"
        />
      ),
    [],
  );

  return {
    Amount: {
      headerLeft: createHeaderLeft(handleBackPress),
      headerRight,
      headerTitle,
      headerStyle,
    },
    Asset: {
      headerLeft: () => (
        <Box twClassName="ml-4">
          <Text variant={TextVariant.HeadingLg}>{strings('send.title')}</Text>
        </Box>
      ),
      headerRight,
      headerTitle: () => <></>,
      headerStyle,
    },
    Recipient: {
      headerLeft: createHeaderLeft(handleBackPress),
      headerRight,
      headerTitle,
      headerStyle,
    },
  };
}
