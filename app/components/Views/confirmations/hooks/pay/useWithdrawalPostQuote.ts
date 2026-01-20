import { useEffect, useRef } from 'react';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isWithdrawalTransaction } from '../../utils/transaction';
import { createProjectLogger } from '@metamask/utils';
import { withdrawalTokenStore } from './withdrawalTokenStore';

const log = createProjectLogger('transaction-pay-withdrawal');

/**
 * Hook that sets isPostQuote=true for withdrawal transactions and initializes
 * the default payment token (which represents destination in post-quote mode).
 * This tells TransactionPayController to treat the paymentToken as
 * the destination (not source) and to create a post-quote bridge.
 */
export function useWithdrawalPostQuote(): void {
  const isSet = useRef(false);
  const transactionMeta = useTransactionMetadataRequest();
  const isWithdrawal = isWithdrawalTransaction(transactionMeta);
  const transactionId = transactionMeta?.id;

  useEffect(() => {
    if (!isWithdrawal || !transactionId || isSet.current) {
      return;
    }

    try {
      const { NetworkController, TransactionPayController } = Engine.context;

      // Set isPostQuote=true for withdrawal transactions
      TransactionPayController.setIsPostQuote(transactionId, true);

      // Initialize paymentToken with the default withdrawal token (Polygon USDC.e)
      // In post-quote mode, paymentToken represents the destination token
      const defaultToken = withdrawalTokenStore.getToken();
      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        defaultToken.chainId,
      );

      if (networkClientId) {
        TransactionPayController.updatePaymentToken({
          transactionId,
          tokenAddress: defaultToken.address,
          chainId: defaultToken.chainId,
        });
      }

      isSet.current = true;

      log('Initialized withdrawal transaction', {
        transactionId,
        defaultToken,
      });
    } catch (error) {
      log('Error initializing withdrawal', { error, transactionId });
    }
  }, [isWithdrawal, transactionId]);
}
