import { Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import Device from '../../../../util/device';
import { extractOrderCode } from './extractOrderCode';
import type { RampsOrder } from '@metamask/ramps-controller';

/** Order statuses that indicate the user bailed (did not complete the purchase). */
const BAILED_ORDER_STATUSES = ['PRECREATED', 'IdExpired', 'Unknown'];

function isBailedOrderStatus(status: string | undefined): boolean {
  return status != null && BAILED_ORDER_STATUSES.includes(status);
}

export interface OpenExternalBrowserParams {
  buyWidgetUrl: string;
  deeplinkRedirectUrl: string;
  effectiveOrderId: string | null;
  effectiveWallet: string;
  providerCode: string;
  network: string;
  addPrecreatedOrder: (opts: {
    orderId: string;
    providerCode: string;
    walletAddress: string;
    chainId?: string;
  }) => void;
  getOrderFromCallback: (
    providerCode: string,
    callbackUrl: string,
    wallet: string,
  ) => Promise<RampsOrder>;
  addOrder: (order: RampsOrder) => void;
  navigateAfterBrowser: (
    opts:
      | { type: 'buildQuote' }
      | {
          type: 'order';
          orderCode: string;
          providerCode: string;
          walletAddress?: string;
        },
  ) => void;
}

/**
 * Opens the buy widget URL in the external/OS browser. When the user returns,
 * uses getOrderFromCallback (mirroring aggregator useInAppBrowser) to fetch the
 * order and distinguish completion vs bail by order status. Navigates to order
 * details only when the order progressed beyond PRECREATED/IdExpired.
 *
 * For Linking.openURL (Android or InAppBrowser unavailable), we cannot get the
 * redirect URL, so we always navigate to BuildQuote.
 */
export async function openExternalBrowserAndNavigate(
  params: OpenExternalBrowserParams,
): Promise<void> {
  const {
    buyWidgetUrl,
    deeplinkRedirectUrl,
    effectiveOrderId,
    effectiveWallet,
    providerCode,
    network,
    addPrecreatedOrder,
    getOrderFromCallback,
    addOrder,
    navigateAfterBrowser,
  } = params;

  if (effectiveOrderId && effectiveWallet) {
    addPrecreatedOrder({
      orderId: effectiveOrderId,
      providerCode,
      walletAddress: effectiveWallet,
      chainId: network || undefined,
    });
  }

  const isAndroid = Device.isAndroid();
  const inAppBrowserAvailable =
    !isAndroid && (await InAppBrowser.isAvailable());

  if (isAndroid || !inAppBrowserAvailable) {
    await Linking.openURL(buyWidgetUrl);
    navigateAfterBrowser({ type: 'buildQuote' });
    return;
  }

  try {
    const result = await InAppBrowser.openAuth(
      buyWidgetUrl,
      deeplinkRedirectUrl,
    );

    if (result.type !== 'success' || !result.url) {
      navigateAfterBrowser({ type: 'buildQuote' });
      return;
    }

    try {
      const order = await getOrderFromCallback(
        providerCode,
        result.url,
        effectiveWallet,
      );

      if (!order || isBailedOrderStatus(order.status)) {
        navigateAfterBrowser({ type: 'buildQuote' });
        return;
      }

      addOrder(order);

      const rawOrderId = order.providerOrderId ?? effectiveOrderId;
      if (!rawOrderId) {
        navigateAfterBrowser({ type: 'buildQuote' });
        return;
      }

      const orderCode = extractOrderCode(rawOrderId);
      navigateAfterBrowser({
        type: 'order',
        orderCode,
        providerCode,
        walletAddress: effectiveWallet || undefined,
      });
    } catch {
      navigateAfterBrowser({ type: 'buildQuote' });
    }
  } finally {
    InAppBrowser.closeAuth();
  }
}
