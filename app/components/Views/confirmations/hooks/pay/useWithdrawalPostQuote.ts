import { useEffect, useRef } from 'react';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('transaction-pay-withdrawal');

/**
 * Hook that sets isPostQuote=true for withdrawal transactions.
 * This tells TransactionPayController to treat the paymentToken as
 * the destination (not source) and to create a post-quote bridge.
 *
 * Note: We don't set a default payment token here to avoid triggering
 * quote retrieval. The UI renders the default token (Polygon USDC.E)
 * when no payment token is selected.
 */
export function useWithdrawalPostQuote(): void {
  const isSet = useRef(false);
  const transactionMeta = useTransactionMetadataRequest();
  const isWithdrawal = isTransactionPayWithdraw(transactionMeta);
  const transactionId = transactionMeta?.id;

  useEffect(() => {
    if (!isWithdrawal || !transactionId || isSet.current) {
      return;
    }

    try {
      const { TransactionPayController } = Engine.context;

      // Set isPostQuote=true for withdrawal transactions
      TransactionPayController.setTransactionConfig(transactionId, (config) => {
        config.isPostQuote = true;
      });

      isSet.current = true;

      log('Initialized withdrawal transaction', { transactionId });
    } catch (error) {
      log('Error initializing withdrawal', { error, transactionId });
    }
  }, [isWithdrawal, transactionId]);
}
