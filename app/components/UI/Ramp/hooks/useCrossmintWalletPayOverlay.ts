import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import type { WebViewMessageEvent } from '@metamask/react-native-webview';
import { RampsOrderStatus } from '@metamask/ramps-controller';

import I18n from '../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useTheme } from '../../../../util/theme';
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
  applyCrossmintCheckoutAppearance,
  buildCrossmintAppearanceVariables,
  toCrossmintLocale,
} from '../utils/crossmintCheckoutAppearance';
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
  /** Flag on, Crossmint quote, and the platform's own wallet-pay method. */
  isEligible: boolean;
  /** The embedded checkout URL, or null while preparing / ineligible / failed. */
  checkoutUrl: string | null;
  /**
   * True from eligibility until the payment button has rendered. The caller
   * must not offer Continue in this window: it would send the user to the
   * browser checkout for an order about to be payable inline. Goes false on
   * preparation failure, where Continue is the right fallback.
   */
  isPreparing: boolean;
  /** True once the payment button has rendered; the overlay takes no space before it. */
  isCheckoutReady: boolean;
  /** Passed to the overlay so it can report the payment button as rendered. */
  onCheckoutReady: () => void;
  /** Best-effort handler for the overlay WebView postMessage events. */
  onMessage: (event: WebViewMessageEvent) => void;
}

/**
 * Apple Pay on iOS, Google Pay on Android. The sheets only work on their own
 * platform, so cross-platform pairs fall through to the standard checkout.
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
 * Creates the order through the on-ramp API buy-widget endpoint — no Crossmint
 * API is called from the client — and returns the checkout URL that renders the
 * payment button inline. The order id is registered as precreated so the order
 * processor polls it to completion even when the WebView posts no events.
 *
 * Preparation is debounced and cached per provider/asset/payment/amount, so
 * quote refreshes do not create a new order on every poll. Any failure leaves
 * the standard Continue button as the checkout path.
 *
 * Once payment is authorized, navigation resets onto OrderDetails, the same
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
  const { colors } = useTheme();
  const isFlagEnabled = useSelector(selectCrossmintApplePayCheckoutEnabled);
  const walletAddress = useRampAccountAddress(
    selectedToken?.chainId as CaipChainId,
  );

  const [prepared, setPrepared] = useState<PreparedOverlay | null>(null);
  const [preparationFailed, setPreparationFailed] = useState(false);
  const [isCheckoutReady, setIsCheckoutReady] = useState(false);
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
      setPreparationFailed(false);
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
    // Drop the checkout prepared for the previous amount: it points at an
    // order for the wrong total and would read as "ready" while the new one
    // is still being created.
    setPrepared(null);
    setPreparationFailed(false);

    const timer = setTimeout(async () => {
      try {
        const quoteForWidget = buildQuoteWithRedirectUrl(
          quote,
          getRampCallbackBaseUrl(),
        );
        const buyWidget = await getBuyWidgetData(quoteForWidget);

        if (prepareId !== prepareIdRef.current) {
          return;
        }

        if (!buyWidget?.url) {
          setPreparationFailed(true);
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
          setPreparationFailed(true);
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
   * Leaves BuildQuote for OrderDetails once payment is authorized, mirroring
   * the Checkout WebView's own callback handoff.
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

  // A new URL means a fresh load, so the button must announce itself again.
  useEffect(() => {
    setIsCheckoutReady(false);
  }, [prepared?.checkoutUrl]);

  const onCheckoutReady = useCallback(() => {
    setIsCheckoutReady(true);
  }, []);

  // Primary signal: `order:updated` events as the payment progresses.
  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseCrossmintCheckoutMessage(event.nativeEvent.data);
      if (!message) {
        return;
      }

      const failure = getCrossmintFailureMessage(message);
      if (failure) {
        // Their UI surfaces the failure inline and allows a retry, so only log.
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

  // Fallback signal, since iOS posts no messages: the API holds unpaid orders
  // at CREATED, so any status past it means the user has paid.
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

  // Themed at read time, not during preparation: folding this into the prepare
  // effect would make a theme or language change create a new Crossmint order.
  const checkoutUrl = useMemo(() => {
    if (!isEligible || !prepared?.checkoutUrl) {
      return null;
    }
    return applyCrossmintCheckoutAppearance(prepared.checkoutUrl, {
      variables: buildCrossmintAppearanceVariables(colors),
      locale: toCrossmintLocale(I18n.locale),
    });
  }, [isEligible, prepared?.checkoutUrl, colors]);

  // Derived during render, not state: effects run after paint, so a flag set
  // in the prepare effect leaves one frame where Continue flashes in enabled.
  // Stays true until the button renders so its spinner covers the load too.
  const isPreparing =
    isEligible && !preparationFailed && (!prepared || !isCheckoutReady);

  return {
    isEligible,
    checkoutUrl,
    isPreparing,
    isCheckoutReady,
    onCheckoutReady,
    onMessage,
  };
}
