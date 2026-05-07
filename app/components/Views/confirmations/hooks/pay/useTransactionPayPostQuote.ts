import { useEffect, useRef } from 'react';
import Engine from '../../../../../core/Engine';
import { createProjectLogger, type Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionPayWithdraw } from './useTransactionPayWithdraw';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { computeProxyAddress } from '../../../../UI/Predict/providers/polymarket/safe/utils';
import { hasTransactionType } from '../../utils/transaction';

const log = createProjectLogger('transaction-pay-post-quote');

/**
 * Hook that sets isPostQuote=true for post-quote transactions.
 * This tells TransactionPayController to treat the paymentToken as
 * the destination (not source) and to create a post-quote bridge.
 *
 * Note: We don't set a default payment token here to avoid triggering
 * quote retrieval. The UI renders the default token when no payment
 * token is selected.
 *
 * When the confirmations_pay_post_quote feature flag is disabled via
 * canSelectWithdrawToken, this hook does nothing -
 * withdrawals will use same-token-same-chain flow without bridging.
 */
export function useTransactionPayPostQuote(): void {
  const isSet = useRef<string | undefined>();
  const { canSelectWithdrawToken } = useTransactionPayWithdraw();
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id;
  const isPerpsWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.perpsWithdraw,
  ]);

  useEffect(() => {
    if (
      !canSelectWithdrawToken ||
      !transactionId ||
      isSet.current === transactionId
    ) {
      return;
    }

    try {
      const { TransactionPayController } = Engine.context;
      const from = transactionMeta?.txParams?.from as Hex | undefined;

      // Predict withdrawals refund to the Safe proxy address.
      // Perps withdrawals don't use refundTo -- funds go HyperCore -> Relay directly.
      const refundTo = isPerpsWithdraw
        ? undefined
        : from
          ? computeProxyAddress(from)
          : undefined;

      TransactionPayController.setTransactionConfig(transactionId, (config) => {
        config.isPostQuote = true;

        if (refundTo) {
          config.refundTo = refundTo;
        }

        if (isPerpsWithdraw) {
          config.isHyperliquidSource = true;
        }
      });

      isSet.current = transactionId;

      log('Initialized post-quote transaction', {
        transactionId,
        refundTo,
        isPerpsWithdraw,
      });
    } catch (error) {
      log('Error initializing post-quote transaction', {
        error,
        transactionId,
      });
    }
  }, [
    canSelectWithdrawToken,
    isPerpsWithdraw,
    transactionId,
    transactionMeta?.txParams?.from,
  ]);
}
