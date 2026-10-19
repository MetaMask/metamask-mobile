import React, { type ReactElement } from 'react';

import WalletPayCheckoutOverlay from '../components/WalletPayCheckoutOverlay';
import type { Quote } from '../types';
import useCrossmintWalletPayOverlay from './useCrossmintWalletPayOverlay';

/**
 * Where a provider's embedded checkout is in its lifecycle, as far as the
 * action slot is concerned.
 *
 * `inactive`: no embedded checkout applies to this quote; Continue is the
 * only checkout path.
 * `preparing`: the provider is creating the order or rendering the payment
 * button. Continue must not be offered yet, or it would open the browser
 * checkout for an order about to be payable inline.
 * `ready`: the payment button is rendered and replaces Continue.
 * `settling`: payment is authorized and the provider is confirming it. The
 * overlay is concealed behind the caller's own processing state until the
 * hand-off to order details.
 */
export type EmbeddedCheckoutPhase =
  | 'inactive'
  | 'preparing'
  | 'ready'
  | 'settling';

export interface EmbeddedCheckoutOverlayProps {
  /** Whether the checkout may take taps; false while the quote is unusable. */
  interactive: boolean;
}

export interface EmbeddedCheckoutResult {
  phase: EmbeddedCheckoutPhase;
  /**
   * Renders the provider's checkout in the action slot, or null when there
   * is nothing to mount yet. Non-null before `ready`, so the checkout can
   * load while the caller still shows Continue as loading.
   */
  renderOverlay: ((props: EmbeddedCheckoutOverlayProps) => ReactElement) | null;
  /**
   * Provider's reason the embedded checkout was abandoned before payment
   * (phase back to `inactive`, Continue restored). Null otherwise.
   */
  error: string | null;
}

/**
 * Provider-agnostic seam between BuildQuote and any embedded checkout that
 * can replace the Continue button. BuildQuote only reads the phase and mounts
 * whatever `renderOverlay` gives it; which provider is behind it, and the
 * events it needs, stay in here.
 *
 * Today the only implementation is Crossmint's wallet-pay overlay
 * (Apple Pay / Google Pay). A new provider is another branch in this hook.
 */
export default function useEmbeddedCheckout(
  quote: Quote | null,
  amount: number,
): EmbeddedCheckoutResult {
  const {
    checkoutUrl,
    isCheckoutReady,
    isPaymentSettling,
    isPreparing,
    onCheckoutReady,
    onMessage,
    checkoutError,
  } = useCrossmintWalletPayOverlay(quote, amount);

  let phase: EmbeddedCheckoutPhase = 'inactive';
  if (isPaymentSettling) {
    phase = 'settling';
  } else if (checkoutUrl && isCheckoutReady) {
    phase = 'ready';
  } else if (isPreparing) {
    phase = 'preparing';
  }

  if (!checkoutUrl) {
    return { phase, renderOverlay: null, error: checkoutError };
  }

  return {
    phase,
    error: checkoutError,
    renderOverlay: ({ interactive }) => (
      <WalletPayCheckoutOverlay
        // Remount per checkout URL so a new order starts a fresh WebView.
        key={checkoutUrl}
        checkoutUrl={checkoutUrl}
        interactive={interactive}
        concealed={isPaymentSettling}
        onMessage={onMessage}
        onReady={onCheckoutReady}
      />
    ),
  };
}
