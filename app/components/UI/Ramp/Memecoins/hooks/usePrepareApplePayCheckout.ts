import { useEffect, useRef, useState } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { buildCrossmintCheckoutUrl } from '../crossmint/buildCheckoutUrl';
import { createCrossmintOrder } from '../crossmint/api';

const PREPARE_DEBOUNCE_MS = 400;

export interface PreparedApplePayCheckout {
  checkoutUrl: string;
  orderId: string;
  clientSecret: string;
  amountUsd: string;
}

interface UsePrepareApplePayCheckoutParams {
  tokenLocator: string;
  amount: string;
  walletAddress?: string | null;
  enabled?: boolean;
}

/**
 * Debounces amount changes, creates a Crossmint order, and returns a checkout URL
 * so the Apple Pay embedded widget can be preloaded before the user taps Buy.
 */
export function usePrepareApplePayCheckout({
  tokenLocator,
  amount,
  walletAddress,
  enabled = true,
}: UsePrepareApplePayCheckoutParams) {
  const [prepared, setPrepared] = useState<PreparedApplePayCheckout | null>(
    null,
  );
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prepareIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      prepareIdRef.current += 1;
      setPrepared(null);
      setIsPreparing(false);
      return;
    }

    const numericAmount = Number(amount);
    const canPrepare =
      Boolean(walletAddress) &&
      Number.isFinite(numericAmount) &&
      numericAmount > 0;

    if (!canPrepare || !walletAddress) {
      prepareIdRef.current += 1;
      setPrepared(null);
      setIsPreparing(false);
      setError(null);
      return;
    }

    const prepareId = prepareIdRef.current + 1;
    prepareIdRef.current = prepareId;
    setPrepared(null);
    setIsPreparing(true);
    setError(null);

    const timer = setTimeout(() => {
      createCrossmintOrder({
        tokenLocator,
        amountUsd: String(numericAmount),
        walletAddress,
      })
        .then(({ order, clientSecret }) => {
          if (prepareId !== prepareIdRef.current) {
            return;
          }
          setPrepared({
            checkoutUrl: buildCrossmintCheckoutUrl({
              orderId: order.orderId,
              clientSecret,
              applePayOnly: true,
            }),
            orderId: order.orderId,
            clientSecret,
            amountUsd: String(numericAmount),
          });
          setIsPreparing(false);
        })
        .catch((err: unknown) => {
          if (prepareId !== prepareIdRef.current) {
            return;
          }
          setPrepared(null);
          setIsPreparing(false);
          setError(
            err instanceof Error
              ? err.message
              : strings('memecoins.create_order_error'),
          );
        });
    }, PREPARE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [amount, enabled, tokenLocator, walletAddress]);

  return {
    prepared,
    isPreparing,
    error,
    clearError: () => setError(null),
  };
}
