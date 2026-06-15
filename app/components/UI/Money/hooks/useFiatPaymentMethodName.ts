import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { type TransactionMeta } from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { selectRampsOrders } from '../../../../selectors/rampsController';
import type { RootState } from '../../../../reducers';

/**
 * Resolves the human-readable payment-method name (e.g. "Apple Pay", "Debit
 * Card") for a fiat-funded money deposit by reading its ramp order.
 *
 * The payment method is fixed for the lifetime of an order, so this prefers the
 * order already cached in `RampsController` state and falls back to a one-shot
 * `getOrder` fetch only on a cache miss
 * Returns `undefined` while the order is unresolved, when the tx isn't a fiat
 * deposit, or when the order has no payment method.
 */
export function useFiatPaymentMethodName(
  tx: TransactionMeta,
): string | undefined {
  const orderId = tx.metamaskPay?.fiat?.orderId;
  const provider = tx.metamaskPay?.fiat?.provider;
  const walletAddress = tx.txParams?.from;

  const paymentMethodName = useSelector((state: RootState) =>
    orderId
      ? selectRampsOrders(state).find(
          (order) => order.providerOrderId === orderId,
        )?.paymentMethod?.name
      : undefined,
  );

  useEffect(() => {
    // Already cached, or not a fiat deposit — nothing to fetch.
    if (paymentMethodName || !orderId || !provider || !walletAddress) {
      return;
    }
    Engine.context.RampsController.getOrder(
      provider,
      orderId,
      walletAddress,
    ).catch(() => undefined);
  }, [paymentMethodName, orderId, provider, walletAddress]);

  return paymentMethodName;
}
