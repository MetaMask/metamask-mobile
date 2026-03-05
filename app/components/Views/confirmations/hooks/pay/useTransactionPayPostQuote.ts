import { useEffect, useRef } from 'react';
import Engine from '../../../../../core/Engine';
import { createProjectLogger, type Hex } from '@metamask/utils';
import { useTransactionPayWithdraw } from './useTransactionPayWithdraw';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { computeProxyAddress } from '../../../../UI/Predict/providers/polymarket/safe/utils';

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
      const refundTo = from ? computeProxyAddress(from) : undefined;

      TransactionPayController.setTransactionConfig(transactionId, (config) => {
        config.isPostQuote = true;
        config.refundTo = refundTo;
      });

      isSet.current = transactionId;

      log('Initialized post-quote transaction', { transactionId, refundTo });
    } catch (error) {
      log('Error initializing post-quote transaction', {
        error,
        transactionId,
      });
    }
  }, [canSelectWithdrawToken, transactionId, transactionMeta?.txParams?.from]);
}
