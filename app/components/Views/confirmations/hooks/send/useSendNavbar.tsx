import { useCallback } from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';

import getHeaderCompactStandardNavbarOptions from '../../../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useSendActions } from './useSendActions';

export function useSendNavbar() {
  const { handleCancelPress } = useSendActions();
  const navigation = useNavigation();
  const parentNavigation = navigation.getParent();
  // Back/cancel logic must read the main stack (which owns the `Send` route).
  // When the header is rendered inside Amount/Asset/Recipient, `useNavigationState`
  // only sees the nested Send stack — not the parent — so we read parent state here.
  const navigationForStack = parentNavigation ?? navigation;
  const nestedStackState = useNavigationState((state) => state);

  const handleBackPress = useCallback(() => {
    const parentState = parentNavigation?.getState();
    const sendStackState =
      parentState?.routes.some((route) => route.name === 'Send') === true
        ? parentState
        : nestedStackState;

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
      navigationForStack.navigate(Routes.SEND.DEFAULT, { screen: screenName });
      return;
    }

    // Handle main stack navigation
    const sendRouteIndex = sendStackState.routes.findIndex(
      (route) => route.name === 'Send',
    );

    if (sendRouteIndex <= 0) {
      navigationForStack.navigate(Routes.WALLET_VIEW);
      return;
    }

    const previousMainRoute = sendStackState.routes[sendRouteIndex - 1];

    // Navigate to previous route with special handling for specific routes
    if (previousMainRoute.name === 'Home') {
      navigationForStack.navigate(Routes.WALLET_VIEW);
    } else {
      navigationForStack.navigate(
        previousMainRoute.name,
        previousMainRoute.params,
      );
    }
  }, [navigationForStack, nestedStackState, parentNavigation]);

  return {
    Amount: getHeaderCompactStandardNavbarOptions({
      title: strings('send.title'),
      onBack: handleBackPress,
      onClose: handleCancelPress,
      backButtonProps: { testID: 'send-navbar-back-button' },
      closeButtonProps: { testID: 'send-navbar-close-button' },
      includesTopInset: true,
    }),
    Asset: getHeaderCompactStandardNavbarOptions({
      onBack: handleCancelPress,
      backButtonProps: { testID: 'send-navbar-back-button' },
      title: strings('send.title'),
      includesTopInset: true,
    }),
    Recipient: getHeaderCompactStandardNavbarOptions({
      title: strings('send.title'),
      onBack: handleBackPress,
      onClose: handleCancelPress,
      backButtonProps: { testID: 'send-navbar-back-button' },
      closeButtonProps: { testID: 'send-navbar-close-button' },
      includesTopInset: true,
    }),
  };
}
