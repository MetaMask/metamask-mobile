import { useCallback } from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import getHeaderCompactStandardNavbarOptions from '../../../../../component-library/components-temp/HeaderCompactStandard/getHeaderCompactStandardNavbarOptions';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useSendActions } from './useSendActions';

export function useSendNavbar() {
  const { handleCancelPress } = useSendActions();
  const navigation = useNavigation<AppNavigationProp>();
  const parentNavigation = navigation.getParent();
  // Back/cancel logic must read the main stack (which owns the `Send` route).
  // When the header is rendered inside Amount/Asset/Recipient, `useNavigationState`
  // only sees the nested Send stack — not the parent — so we read parent state here.
  const navigationForStack = parentNavigation ?? navigation;
  const nestedStackState = useNavigationState((state) => state);

  const handleBackPress = useCallback(() => {
    // If the nested Send stack has its own history (e.g. Amount -> Recipient),
    // pop it directly. Synthesizing "back" via `navigate()` to the previous
    // route name is NOT a pop under React Navigation 7 semantics — it can
    // push a duplicate route instead of removing the current one, which
    // causes the nested stack to grow indefinitely and produces an infinite
    // back-navigation loop between screens.
    if (nestedStackState.index > 0) {
      navigation.goBack();
      return;
    }

    const parentState = parentNavigation?.getState();
    const sendStackState =
      parentState?.routes.some((route) => route.name === 'Send') === true
        ? parentState
        : nestedStackState;

    // Handle main stack navigation
    const sendRouteIndex = sendStackState.routes.findIndex(
      (route) => route.name === 'Send',
    );

    if (sendRouteIndex <= 0) {
      navigationForStack.navigate(Routes.WALLET_VIEW);
      return;
    }

    const previousMainRoute = sendStackState.routes[sendRouteIndex - 1];

    if (previousMainRoute.name === 'Home') {
      navigationForStack.navigate(Routes.WALLET_VIEW);
      return;
    }

    // Pop the outer 'Send' route to reveal the existing previous screen
    // (e.g. TokenDetails). Reconstructing "back" via navigate(name, params)
    // is NOT a pop — it can push a duplicate of the previous screen on top
    // of 'Send' instead of removing it, leaving the original 'Send' screen
    // still on the stack underneath and causing a back-navigation loop once
    // the duplicate is later popped.
    navigationForStack.goBack();
  }, [navigation, navigationForStack, nestedStackState, parentNavigation]);

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
