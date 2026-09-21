import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { resetWithRoutes } from '../../../../util/navigation/navUtils';
import Device from '../../../../util/device';

import { getCheckoutContext } from '../utils/buildQuoteWithRedirectUrl';
import { getNavigateAfterExternalBrowserRoutes } from '../utils/rampsNavigation';

import { useRampsController } from './useRampsController';

export interface OpenHostedBuyWidgetParams {
  /** The hosted buy-widget URL to open. */
  url: string;
  /** The deeplink Coinbase (or another provider) redirects back to. */
  redirectUrl: string;
  providerCode: string;
  /** Raw order id from the buy-widget response, trimmed before use. */
  orderId?: string | null;
  walletAddress?: string | null;
  chainId?: string;
}

export interface UseOpenHostedBuyWidgetResult {
  /**
   * Opens a hosted buy widget in an external browser (Android's default
   * browser via `Linking.openURL`, or an in-app auth session via
   * `InAppBrowser.openAuth` on iOS), registers a precreated order when one
   * is available, and navigates back into the app once the browser closes.
   */
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

      if (isAndroid || !inAppBrowserAvailable) {
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
