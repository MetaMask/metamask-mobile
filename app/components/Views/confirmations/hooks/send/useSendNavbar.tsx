import { useCallback } from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';

import getHeaderCenterNavbarOptions from '../../../../../component-library/components-temp/HeaderCenter/getHeaderCenterNavbarOptions';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useSendActions } from './useSendActions';

export function useSendNavbar() {
  const { handleCancelPress } = useSendActions();
  const navigation = useNavigation();
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

  return {
    Amount: getHeaderCenterNavbarOptions({
      title: strings('send.title'),
      onBack: handleBackPress,
      onClose: handleCancelPress,
      backButtonProps: { testID: 'send-navbar-back-button' },
      closeButtonProps: { testID: 'send-navbar-close-button' },
      includesTopInset: true,
    }),
    Asset: getHeaderCenterNavbarOptions({
      onBack: handleCancelPress,
      backButtonProps: { testID: 'send-navbar-back-button' },
      title: strings('send.title'),
      includesTopInset: true,
    }),
    Recipient: getHeaderCenterNavbarOptions({
      title: strings('send.title'),
      onBack: handleBackPress,
      onClose: handleCancelPress,
      backButtonProps: { testID: 'send-navbar-back-button' },
      closeButtonProps: { testID: 'send-navbar-close-button' },
      includesTopInset: true,
    }),
  };
}
