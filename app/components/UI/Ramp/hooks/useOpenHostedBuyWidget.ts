import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { resetWithRoutes } from '../../../../util/navigation/navUtils';
import Device from '../../../../util/device';

import {
  EXTERNAL_OS_BROWSER,
  getCheckoutContext,
} from '../utils/buildQuoteWithRedirectUrl';
import { getNavigateAfterExternalBrowserRoutes } from '../utils/rampsNavigation';

import { useRampsController } from './useRampsController';

export interface OpenHostedBuyWidgetParams {
  url: string;
  redirectUrl: string;
  providerCode: string;
  orderId?: string | null;
  walletAddress?: string | null;
  chainId?: string;
  /** buyWidget.browser from quotes/buy-widget; EXTERNAL_OS_BROWSER → system open */
  browser?: string | null;
}

export interface UseOpenHostedBuyWidgetResult {
  /** Opens the widget in the OS browser, registers the precreated order, and navigates back on close. */
  openHostedBuyWidget: (params: OpenHostedBuyWidgetParams) => Promise<void>;
}

export function useOpenHostedBuyWidget(): UseOpenHostedBuyWidgetResult {
  const navigation = useNavigation<AppNavigationProp>();
  const { addPrecreatedOrder } = useRampsController();

  const navigateAfterExternalBrowser = useCallback(
    (opts: Parameters<typeof getNavigateAfterExternalBrowserRoutes>[0]) => {
      resetWithRoutes(navigation, {
        index: 0,
        routes: getNavigateAfterExternalBrowserRoutes(opts),
      });
    },
    [navigation],
  );

  const openHostedBuyWidget = useCallback(
    async ({
      url,
      redirectUrl,
      providerCode,
      orderId,
      walletAddress,
      chainId,
      browser,
    }: OpenHostedBuyWidgetParams) => {
      const { network, effectiveWallet, effectiveOrderId } = getCheckoutContext(
        { chainId },
        walletAddress,
        orderId,
      );

      if (effectiveOrderId && effectiveWallet && network) {
        addPrecreatedOrder({
          orderId: effectiveOrderId,
          providerCode,
          walletAddress: effectiveWallet,
          chainId: network,
        });
      }

      const isAndroid = Device.isAndroid();
      const inAppBrowserAvailable =
        !isAndroid && (await InAppBrowser.isAvailable());
      // EXTERNAL_OS_BROWSER must system-open so partner universal links fire
      // (ASWebAuthenticationSession loads the URL like a typed address).
      const useSystemOpen =
        isAndroid || !inAppBrowserAvailable || browser === EXTERNAL_OS_BROWSER;

      if (useSystemOpen) {
        await Linking.openURL(url);
        navigateAfterExternalBrowser({ returnDestination: 'buildQuote' });
        return;
      }

      try {
        const result = await InAppBrowser.openAuth(url, redirectUrl);

        if (result.type !== 'success' || !result.url) {
          navigateAfterExternalBrowser({ returnDestination: 'buildQuote' });
          return;
        }

        if (!effectiveWallet) {
          navigateAfterExternalBrowser({ returnDestination: 'buildQuote' });
          return;
        }

        navigateAfterExternalBrowser({
          returnDestination: 'order',
          callbackUrl: result.url,
          providerCode,
          walletAddress: effectiveWallet,
        });
      } finally {
        InAppBrowser.closeAuth();
      }
    },
    [addPrecreatedOrder, navigateAfterExternalBrowser],
  );

  return { openHostedBuyWidget };
}

export default useOpenHostedBuyWidget;
