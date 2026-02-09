import { useCallback, useMemo } from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useSendActions } from './useSendActions';
import type { HeaderCompactStandardProps } from '../../../../../component-library/components-temp/HeaderCompactStandard/HeaderCompactStandard.types';

const headerShownFalse = { headerShown: false } as const;

export type SendHeaderScreen = 'Amount' | 'Asset' | 'Recipient';

export function useSendHeaderProps(
  screen: SendHeaderScreen,
): HeaderCompactStandardProps {
  const { handleCancelPress } = useSendActions();
  const navigation = useNavigation();
  const sendStackState = useNavigationState((state) => state);

  const handleBackPress = useCallback(() => {
    const sendRoute = sendStackState.routes.find(
      (route) => route.name === 'Send',
    );
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

    const sendRouteIndex = sendStackState.routes.findIndex(
      (route) => route.name === 'Send',
    );

    if (sendRouteIndex <= 0) {
      navigation.navigate(Routes.WALLET_VIEW);
      return;
    }

    const previousMainRoute = sendStackState.routes[sendRouteIndex - 1];

    if (previousMainRoute.name === 'Home') {
      navigation.navigate(Routes.WALLET_VIEW);
    } else {
      navigation.navigate(previousMainRoute.name, previousMainRoute.params);
    }
  }, [navigation, sendStackState]);

  return useMemo(() => {
    const common = {
      title: strings('send.title'),
      backButtonProps: { testID: 'send-navbar-back-button' },
      includesTopInset: true,
    };
    switch (screen) {
      case 'Amount':
      case 'Recipient':
        return {
          ...common,
          onBack: handleBackPress,
          onClose: handleCancelPress,
          closeButtonProps: { testID: 'send-navbar-close-button' },
        };
      case 'Asset':
        return {
          ...common,
          onBack: handleCancelPress,
        };
      default:
        return common;
    }
  }, [screen, handleBackPress, handleCancelPress]);
}

export function useSendNavbar() {
  return {
    Amount: headerShownFalse,
    Asset: headerShownFalse,
    Recipient: headerShownFalse,
  };
}
