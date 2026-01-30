import { useEffect, useRef } from 'react';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import Engine from '../../../../../core/Engine';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { isWithdrawalTransaction } from '../../utils/transaction';
import { createProjectLogger } from '@metamask/utils';
import { POLYGON_USDCE } from '../../constants/predict';

const log = createProjectLogger('transaction-pay-withdrawal');

/** Default withdrawal token: Polygon USDC.E */
const DEFAULT_WITHDRAWAL_TOKEN = {
  address: POLYGON_USDCE.address,
  chainId: CHAIN_IDS.POLYGON,
};

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
      const networkClientId = NetworkController.findNetworkClientIdByChainId(
        DEFAULT_WITHDRAWAL_TOKEN.chainId,
      );

      if (networkClientId) {
        TransactionPayController.updatePaymentToken({
          transactionId,
          tokenAddress: DEFAULT_WITHDRAWAL_TOKEN.address,
          chainId: DEFAULT_WITHDRAWAL_TOKEN.chainId,
        });
      }

      isSet.current = true;

      log('Initialized withdrawal transaction', {
        transactionId,
        defaultToken: DEFAULT_WITHDRAWAL_TOKEN,
      });
    } catch (error) {
      log('Error initializing withdrawal', { error, transactionId });
    }
  }, [isWithdrawal, transactionId]);
}
