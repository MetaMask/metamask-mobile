import { useEffect, useRef } from 'react';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('transaction-pay-post-quote');

/**
 * Hook that sets isPostQuote=true for post-quote transactions.
 * This tells TransactionPayController to treat the paymentToken as
 * the destination (not source) and to create a post-quote bridge.
 *
 * Note: We don't set a default payment token here to avoid triggering
 * quote retrieval. The UI renders the default token when no payment
 * token is selected.
 */
export function useTransactionPayPostQuote(): void {
  const isSet = useRef(false);
  const transactionMeta = useTransactionMetadataRequest();
  const isPostQuoteTransaction = isTransactionPayWithdraw(transactionMeta);
  const transactionId = transactionMeta?.id;

  useEffect(() => {
    if (!isPostQuoteTransaction || !transactionId || isSet.current) {
      return;
    }

    try {
      const { TransactionPayController } = Engine.context;

      // Set isPostQuote=true for post-quote transactions
      TransactionPayController.setTransactionConfig(transactionId, (config) => {
        config.isPostQuote = true;
      });

      isSet.current = true;

      log('Initialized post-quote transaction', { transactionId });
    } catch (error) {
      log('Error initializing post-quote transaction', {
        error,
        transactionId,
      });
    }
  }, [isPostQuoteTransaction, transactionId]);
}
