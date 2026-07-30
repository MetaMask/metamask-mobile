import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import type { WebViewMessageEvent } from '@metamask/react-native-webview';

import { selectCrossmintApplePayCheckoutEnabled } from '../../../../selectors/featureFlagController/crossmintApplePayCheckout';
import Device from '../../../../util/device';
import Logger from '../../../../util/Logger';
import {
  buildQuoteWithRedirectUrl,
  getCheckoutContext,
} from '../utils/buildQuoteWithRedirectUrl';
import { getRampCallbackBaseUrl } from '../utils/getRampCallbackBaseUrl';
import {
  getCrossmintFailureMessage,
  parseCrossmintCheckoutMessage,
} from '../utils/crossmintCheckoutMessage';
import type { Quote } from '../types';
import { useRampsController } from './useRampsController';
import useRampAccountAddress from './useRampAccountAddress';

const CROSSMINT_PROVIDER_ID_FRAGMENT = 'crossmint';
const APPLE_PAY_PAYMENT_METHOD_SUFFIX = 'apple-pay';
const PREPARE_DEBOUNCE_MS = 400;

interface PreparedOverlay {
  /** Cache key so quote refreshes do not create duplicate orders. */
  key: string;
  checkoutUrl: string;
}

export interface UseCrossmintApplePayOverlayResult {
  /**
   * True when the current selection qualifies for the embedded Apple Pay
   * overlay (flag on, iOS, Crossmint quote paid with Apple Pay).
   */
  isEligible: boolean;
  /**
   * The embedded checkout URL rendering the hosted Apple Pay button, or
   * null while preparing / when not eligible / when preparation failed.
   */
  checkoutUrl: string | null;
  /** Best-effort handler for the overlay WebView postMessage events. */
  onMessage: (event: WebViewMessageEvent) => void;
}

/**
 * Prepares Crossmint's embedded Apple Pay checkout for a UB2 quote
 * (LaunchDarkly flag `crossmintApplePayCheckout`).
 *
 * When the quote is a Crossmint quote paid with Apple Pay on iOS, this hook
 * creates the provider order through the on-ramp API buy-widget endpoint
 * (`RampsController.getBuyWidgetData`) — no Crossmint API is called from
 * the client — and returns the embedded checkout URL that renders the
 * hosted Apple Pay button inline on the amount screen. The order id
 * returned by the API is registered as a precreated order, so the existing
 * order processor polls it to completion even if the WebView never posts
 * events (`enableApplePay` disables the postMessage polyfill on iOS).
 *
 * Preparation is debounced and cached per provider/asset/payment/amount so
 * quote refreshes do not create a new Crossmint order on every poll. On any
 * preparation failure the overlay is simply not shown and the standard
 * Continue button remains the checkout path.
 */
export default function useCrossmintApplePayOverlay(
  quote: Quote | null,
  amount: number,
): UseCrossmintApplePayOverlayResult {
  const {
    selectedToken,
    selectedPaymentMethod,
    getBuyWidgetData,
    addPrecreatedOrder,
  } = useRampsController();
  const isFlagEnabled = useSelector(selectCrossmintApplePayCheckoutEnabled);
  const walletAddress = useRampAccountAddress(
    selectedToken?.chainId as CaipChainId,
  );

  const [prepared, setPrepared] = useState<PreparedOverlay | null>(null);
  const preparedKeyRef = useRef<string | null>(null);
  const prepareIdRef = useRef(0);

  const isEligible = Boolean(
    isFlagEnabled &&
      Device.isIos() &&
      quote?.provider?.includes(CROSSMINT_PROVIDER_ID_FRAGMENT) &&
      selectedPaymentMethod?.id?.endsWith(APPLE_PAY_PAYMENT_METHOD_SUFFIX) &&
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
        setPrepared({ key, checkoutUrl: buyWidget.url });
      } catch (error) {
        if (prepareId === prepareIdRef.current) {
          preparedKeyRef.current = null;
          setPrepared(null);
        }
        Logger.error(error as Error, {
          message:
            'useCrossmintApplePayOverlay error while preparing Apple Pay checkout',
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

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const message = parseCrossmintCheckoutMessage(event.nativeEvent.data);
    if (!message) {
      return;
    }

    const failure = getCrossmintFailureMessage(message);
    if (failure) {
      Logger.error(new Error(failure), {
        message: 'useCrossmintApplePayOverlay Crossmint checkout failure',
      });
    }
  }, []);

  return {
    isEligible,
    checkoutUrl: isEligible ? (prepared?.checkoutUrl ?? null) : null,
    onMessage,
  };
}
