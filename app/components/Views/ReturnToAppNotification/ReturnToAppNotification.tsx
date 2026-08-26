import React, { useEffect, useRef } from 'react';
import { strings } from '../../../../locales/i18n.js';
import {
  AvatarFavicon,
  AvatarFaviconSize,
  toast,
} from '@metamask/design-system-react-native';
import { useFavicon } from '../../hooks/useFavicon/index.ts';
import {
  METHODS_TO_DELAY,
  RPC_METHODS,
} from '../../../core/SDKConnect/SDKConnectConstants.ts';
import { ImageURISource } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { wait } from '../../../core/SDKConnect/utils/wait.util.ts';

interface ReturnToAppNotificationRouteParams {
  method?: string;
  origin?: string;
  hideReturnToApp?: boolean;
}

// Get the secondary label to display if needed, depending on the method
const getMethodLabel = (method?: string): string | undefined => {
  switch (method) {
    case RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN:
      return strings('sdk_return_to_app_toast.networkSwitchMethodLabel');
    default:
      return undefined;
  }
};

// Display a toast
const diplayToast = (label: string, faviconURI: ImageURISource): void => {
  const isFavicon = !!faviconURI.uri;

  toast({
    title: label,
    startAccessory: isFavicon ? (
      <AvatarFavicon src={faviconURI} size={AvatarFaviconSize.Sm} />
    ) : undefined,
    hasNoTimeout: false,
    showCloseButton: false,
  });
};

/**
 * Fake modal that displays a toast instead of rendering a component.
 * We need to trigger a toast from an SDK service that cannot access a component.
 */
const ReturnToAppNotification = () => {
  const route =
    useRoute<
      RouteProp<{ params: ReturnToAppNotificationRouteParams }, 'params'>
    >();
  const delayAfterMethod: number = 1200;
  const delayBetweenToast: number = 1500;
  const { method, origin, hideReturnToApp } = route.params ?? {};
  const navigation = useNavigation<AppNavigationProp>();
  const favicon = useFavicon(origin ?? '');
  const hasExecuted = useRef<boolean>(false);

  useEffect(() => {
    if (favicon.isLoaded && !hasExecuted.current) {
      hasExecuted.current = true;
      (async () => {
        // Add delay to display UI feedback before redirecting
        if (method && METHODS_TO_DELAY[method]) {
          await wait(delayAfterMethod);
        }

        // Display specific information depending on the method
        const methodLabel = getMethodLabel(method);
        if (methodLabel !== undefined) {
          diplayToast(methodLabel, favicon.faviconURI);
        }

        if (hideReturnToApp !== true) {
          await wait(delayBetweenToast);

          // Ask the user to go back to the app
          diplayToast(
            strings('sdk_return_to_app_toast.returnToAppLabel'),
            favicon.faviconURI,
          );
        }
      })();

      // Hide the fake modal
      navigation?.goBack();
    }
  }, [method, favicon, navigation, hideReturnToApp]);

  return <></>;
};

export default ReturnToAppNotification;
