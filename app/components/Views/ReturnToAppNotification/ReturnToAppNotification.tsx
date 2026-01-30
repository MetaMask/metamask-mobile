import React, { useContext, useEffect, useRef } from 'react';
import { strings } from '../../../../locales/i18n.js';
import { ToastContext } from '../../../component-library/components/Toast/index.ts';
import {
  ToastRef,
  ToastVariants,
} from '../../../component-library/components/Toast/Toast.types.ts';
import { useFavicon } from '../../hooks/useFavicon/index.ts';
import {
  METHODS_TO_DELAY,
  RPC_METHODS,
} from '../../../core/SDKConnect/SDKConnectConstants.ts';
import { ImageURISource } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { wait } from '../../../core/SDKConnect/utils/wait.util.ts';
import type { RootParamList } from '../../../util/navigation/types';

type ReturnToAppNotificationRouteProp = RouteProp<
  RootParamList,
  'ReturnToDappToast'
>;

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
const diplayToast = (
  toastRef: ToastRef,
  label: string,
  faviconURI: ImageURISource,
): void => {
  const isFavicon = !!faviconURI.uri;

  toastRef?.showToast({
    variant: isFavicon ? ToastVariants.App : ToastVariants.Plain,
    labelOptions: [{ label }],
    appIconSource: faviconURI,
    hasNoTimeout: false,
  });
};

/**
 * Fake modal that displays a toast instead of rendering a component.
 * We need to trigger a toast from an SDK service that cannot access a component.
 */
const ReturnToAppNotification = () => {
  const route = useRoute<ReturnToAppNotificationRouteProp>();
  const delayAfterMethod: number = 1200;
  const delayBetweenToast: number = 1500;
  const { method, origin, hideReturnToApp } = route.params ?? {};
  const navigation = useNavigation();
  const { toastRef } = useContext(ToastContext);
  const favicon = useFavicon(origin ?? '');
  const hasExecuted = useRef<boolean>(false);

  useEffect(() => {
    if (
      toastRef &&
      toastRef.current !== null &&
      favicon.isLoaded &&
      !hasExecuted.current
    ) {
      hasExecuted.current = true;
      (async () => {
        // Only for type checking
        if (toastRef.current === null) {
          return;
        }

        // Add delay to display UI feedback before redirecting
        if (method && METHODS_TO_DELAY[method]) {
          await wait(delayAfterMethod);
        }

        // Display specific information depending on the method
        const methodLabel = getMethodLabel(method);
        if (methodLabel !== undefined) {
          diplayToast(toastRef.current, methodLabel, favicon.faviconURI);
        }

        if (hideReturnToApp !== true) {
          await wait(delayBetweenToast);

          // Ask the user to go back to the app
          diplayToast(
            toastRef.current,
            strings('sdk_return_to_app_toast.returnToAppLabel'),
            favicon.faviconURI,
          );
        }
      })();

      // Hide the fake modal
      navigation?.goBack();
    }
  }, [toastRef, method, favicon, navigation, hideReturnToApp]);

  return <></>;
};

export default ReturnToAppNotification;
