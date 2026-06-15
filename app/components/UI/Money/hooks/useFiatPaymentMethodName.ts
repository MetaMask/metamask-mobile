import { useEffect, useState } from 'react';
import { type TransactionMeta } from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';

/**
 * Resolves the human-readable payment-method name (e.g. "Apple Pay", "Debit
 * Card") for a fiat-funded money deposit by fetching its ramp order.
 *
 * This is a one-shot lookup: the payment method is fixed for the lifetime of an
 * order, so — unlike {@link useFiatOrderStatus}, which polls for status — we
 * fetch once. Returns `undefined` while loading, when the tx isn't a fiat
 * deposit, or if the order lookup fails; callers should fall back to a
 * synchronous label (e.g. the provider name).
 */
export function useFiatPaymentMethodName(
  tx: TransactionMeta,
): string | undefined {
  const orderId = tx.metamaskPay?.fiat?.orderId;
  const provider = tx.metamaskPay?.fiat?.provider;
  const walletAddress = tx.txParams?.from;

  const [paymentMethodName, setPaymentMethodName] = useState<
    string | undefined
  >();

  useEffect(() => {
    if (!orderId || !provider || !walletAddress) {
      setPaymentMethodName(undefined);
      return undefined;
    }

    let cancelled = false;
    Engine.context.RampsController.getOrder(provider, orderId, walletAddress)
      .then((order) => {
        if (!cancelled) {
          setPaymentMethodName(order.paymentMethod?.name);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [orderId, provider, walletAddress]);

  return paymentMethodName;
}
