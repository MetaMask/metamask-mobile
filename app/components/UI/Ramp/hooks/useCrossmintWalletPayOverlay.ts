import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import type { WebViewMessageEvent } from '@metamask/react-native-webview';
import { RampsOrderStatus } from '@metamask/ramps-controller';

import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { selectCrossmintApplePayCheckoutEnabled } from '../../../../selectors/featureFlagController/crossmintApplePayCheckout';
import Device from '../../../../util/device';
import Logger from '../../../../util/Logger';
import { resetWithRoutes } from '../../../../util/navigation/navUtils';
import {
  buildQuoteWithRedirectUrl,
  getCheckoutContext,
} from '../utils/buildQuoteWithRedirectUrl';
import { getRampCallbackBaseUrl } from '../utils/getRampCallbackBaseUrl';
import {
  getCrossmintFailureMessage,
  isCrossmintPaymentCompleted,
  isCrossmintPaymentInProgress,
  parseCrossmintCheckoutMessage,
} from '../utils/crossmintCheckoutMessage';
import { createRampsOrderDetailsRoute } from '../utils/rampsNavigation';
import type { Quote } from '../types';
import { useRampsController } from './useRampsController';
import { useRampsOrders } from './useRampsOrders';
import useRampAccountAddress from './useRampAccountAddress';

const CROSSMINT_PROVIDER_ID_FRAGMENT = 'crossmint';
const APPLE_PAY_PAYMENT_METHOD_SUFFIX = 'apple-pay';
const GOOGLE_PAY_PAYMENT_METHOD_SUFFIX = 'google-pay';
const PREPARE_DEBOUNCE_MS = 400;

interface PreparedOverlay {
  /** Cache key so quote refreshes do not create duplicate orders. */
  key: string;
  checkoutUrl: string;
  /** Precreated order id used to hand off to OrderDetails after payment. */
  orderId: string | null;
}

export interface UseCrossmintWalletPayOverlayResult {
  /**
   * True when the current selection qualifies for the embedded wallet-pay
   * overlay (flag on, Crossmint quote, platform-native wallet-pay method:
   * Apple Pay on iOS, Google Pay on Android).
   */
  isEligible: boolean;
  /**
   * The embedded checkout URL rendering the hosted Apple Pay / Google Pay
   * button, or null while preparing / when not eligible / when preparation
   * failed.
   */
  checkoutUrl: string | null;
  /** Best-effort handler for the overlay WebView postMessage events. */
  onMessage: (event: WebViewMessageEvent) => void;
}

/**
 * Returns whether the payment method is the platform-native wallet-pay
 * method: Apple Pay on iOS, Google Pay on Android. The wallet-pay sheets
 * only work on their own platform, so cross-platform combinations (e.g. a
 * Google Pay quote on iOS) fall through to the standard checkout flow.
 */
function isPlatformWalletPayMethod(paymentMethodId?: string): boolean {
  if (!paymentMethodId) {
    return false;
  }
  if (Device.isIos()) {
    return paymentMethodId.endsWith(APPLE_PAY_PAYMENT_METHOD_SUFFIX);
  }
  if (Device.isAndroid()) {
    return paymentMethodId.endsWith(GOOGLE_PAY_PAYMENT_METHOD_SUFFIX);
  }
  return false;
}

/**
 * Prepares Crossmint's embedded wallet-pay checkout for a UB2 quote
 * (LaunchDarkly flag `crossmintApplePayCheckout`).
 *
 * When the quote is a Crossmint quote paid with the platform's wallet-pay
 * method (Apple Pay on iOS, Google Pay on Android), this hook creates the
 * provider order through the on-ramp API buy-widget endpoint
 * (`RampsController.getBuyWidgetData`) — no Crossmint API is called from
 * the client — and returns the embedded checkout URL that renders the
 * hosted payment button inline on the amount screen. The order id returned
 * by the API is registered as a precreated order, so the existing order
 * processor polls it to completion even if the WebView never posts events
 * (`enableApplePay` disables the postMessage polyfill on iOS).
 *
 * Preparation is debounced and cached per provider/asset/payment/amount so
 * quote refreshes do not create a new Crossmint order on every poll. On any
 * preparation failure the overlay is simply not shown and the standard
 * Continue button remains the checkout path.
 *
 * Once payment is authorized (detected via the WebView's `order:updated`
 * postMessage events, or via the precreated order's polled status when
 * postMessage is unavailable), the hook resets navigation onto the existing
 * UB2 OrderDetails screen, which tracks the order to completion — the same
 * handoff the Checkout WebView performs on its callback redirect.
 */
export default function useCrossmintWalletPayOverlay(
  quote: Quote | null,
  amount: number,
): UseCrossmintWalletPayOverlayResult {
  const navigation = useNavigation<AppNavigationProp>();
  const {
    selectedToken,
    selectedPaymentMethod,
    getBuyWidgetData,
    addPrecreatedOrder,
  } = useRampsController();
  const { getOrderById } = useRampsOrders();
  const isFlagEnabled = useSelector(selectCrossmintApplePayCheckoutEnabled);
  const walletAddress = useRampAccountAddress(
    selectedToken?.chainId as CaipChainId,
  );

  const [prepared, setPrepared] = useState<PreparedOverlay | null>(null);
  const preparedKeyRef = useRef<string | null>(null);
  const prepareIdRef = useRef(0);
  const handedOffRef = useRef(false);

  const isEligible = Boolean(
    isFlagEnabled &&
      quote?.provider?.includes(CROSSMINT_PROVIDER_ID_FRAGMENT) &&
      isPlatformWalletPayMethod(selectedPaymentMethod?.id) &&
      walletAddress &&
      amount > 0,
  );

  useEffect(() => {
    if (!isEligible || !quote) {
      prepareIdRef.current += 1;
      preparedKeyRef.current = null;
      setPrepared(null);
      return;
    }

    const key = [
      quote.provider,
      selectedToken?.assetId,
      selectedPaymentMethod?.id,
      amount,
    ]
      .map(String)
      .join('|');

    if (preparedKeyRef.current === key) {
      return;
    }

    const prepareId = prepareIdRef.current + 1;
    prepareIdRef.current = prepareId;

    const timer = setTimeout(async () => {
      try {
        const quoteForWidget = buildQuoteWithRedirectUrl(
          quote,
          getRampCallbackBaseUrl(),
        );
        const buyWidget = await getBuyWidgetData(quoteForWidget);

        if (prepareId !== prepareIdRef.current || !buyWidget?.url) {
          return;
        }

        const { network, effectiveWallet, effectiveOrderId } =
          getCheckoutContext(
            { chainId: selectedToken?.chainId },
            walletAddress,
            buyWidget.orderId,
          );

        if (effectiveOrderId && effectiveWallet) {
          addPrecreatedOrder({
            orderId: effectiveOrderId,
            providerCode: quote.provider,
            walletAddress: effectiveWallet,
            chainId: network || undefined,
          });
        }

        preparedKeyRef.current = key;
        setPrepared({
          key,
          checkoutUrl: buyWidget.url,
          orderId: effectiveOrderId ?? null,
        });
      } catch (error) {
        if (prepareId === prepareIdRef.current) {
          preparedKeyRef.current = null;
          setPrepared(null);
        }
        Logger.error(error as Error, {
          message:
            'useCrossmintWalletPayOverlay error while preparing wallet-pay checkout',
        });
      }
    }, PREPARE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [
    isEligible,
    quote,
    amount,
    selectedToken?.assetId,
    selectedToken?.chainId,
    selectedPaymentMethod?.id,
    walletAddress,
    getBuyWidgetData,
    addPrecreatedOrder,
  ]);

  /**
   * Leaves BuildQuote for the existing UB2 OrderDetails screen once payment
   * has been authorized. Mirrors the Checkout WebView's callback handoff
   * (`navigation.reset` onto RAMPS_ORDER_DETAILS); OrderDetails and the
   * precreated-order processor then track the order to completion.
   */
  const handOffToOrderDetails = useCallback(() => {
    const orderId = prepared?.orderId;
    if (!orderId || handedOffRef.current) {
      return;
    }
    handedOffRef.current = true;
    resetWithRoutes(navigation, {
      index: 0,
      routes: [
        createRampsOrderDetailsRoute({
          orderId,
          showCloseButton: true,
          cryptocurrency: selectedToken?.symbol,
        }),
      ],
    });
  }, [navigation, prepared?.orderId, selectedToken?.symbol]);

  // Reset the one-shot handoff guard whenever a new order is prepared.
  useEffect(() => {
    handedOffRef.current = false;
  }, [prepared?.orderId]);

  // Primary signal: Crossmint's embedded checkout posts `order:updated`
  // events as the payment progresses.
  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseCrossmintCheckoutMessage(event.nativeEvent.data);
      if (!message) {
        return;
      }

      const failure = getCrossmintFailureMessage(message);
      if (failure) {
        // Crossmint's embedded UI surfaces the failure inline and lets the
        // user retry, so only log here.
        Logger.error(new Error(failure), {
          message: 'useCrossmintWalletPayOverlay Crossmint checkout failure',
        });
        return;
      }

      const order = message.data?.order;
      if (
        message.event === 'order:updated' &&
        (isCrossmintPaymentInProgress(order) ||
          isCrossmintPaymentCompleted(order))
      ) {
        handOffToOrderDetails();
      }
    },
    [handOffToOrderDetails],
  );

  // Fallback signal: `enableApplePay` disables the WebView postMessage
  // polyfill on iOS, so messages may never arrive. The precreated-order
  // processor polls the on-ramp API, which keeps unpaid Crossmint orders at
  // CREATED and only advances once payment is authorized — so any status
  // past CREATED means the user has paid.
  const trackedOrderStatus = prepared?.orderId
    ? getOrderById(prepared.orderId)?.status
    : undefined;
  useEffect(() => {
    if (
      trackedOrderStatus &&
      trackedOrderStatus !== RampsOrderStatus.Precreated &&
      trackedOrderStatus !== RampsOrderStatus.Created &&
      trackedOrderStatus !== RampsOrderStatus.Unknown
    ) {
      handOffToOrderDetails();
    }
  }, [trackedOrderStatus, handOffToOrderDetails]);

  return {
    isEligible,
    checkoutUrl: isEligible ? (prepared?.checkoutUrl ?? null) : null,
    onMessage,
  };
}
