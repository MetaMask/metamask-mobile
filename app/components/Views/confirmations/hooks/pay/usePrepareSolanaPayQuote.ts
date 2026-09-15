import { useCallback } from 'react';
import BigNumber from 'bignumber.js';

import Engine from '../../../../../core/Engine';
import { requestSolanaPayQuote } from '../../../../../core/Engine/controllers/transaction-pay-controller/request-solana-pay-quote';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPaySource } from './useTransactionPaySource';
import { useTransactionPayIsMaxAmount } from './useTransactionPayData';

export function usePrepareSolanaPayQuote() {
  const transaction = useTransactionMetadataRequest();
  const { isSolana, solanaAsset, solanaIntent } = useTransactionPaySource();
  const isMaxAmount = useTransactionPayIsMaxAmount();

  const prepareSolanaPayQuote = useCallback(async () => {
    if (!isSolana || !transaction?.id) {
      return;
    }

    if (isMaxAmount && solanaAsset && solanaIntent) {
      Engine.context.TransactionPayController.setPayIntent({
        transactionId: transaction.id,
        intent: {
          ...solanaIntent,
          sourceAmountRaw: new BigNumber(solanaAsset.balance)
            .shiftedBy(solanaAsset.decimals)
            .integerValue(BigNumber.ROUND_DOWN)
            .toString(10),
        },
      });
    }

    await requestSolanaPayQuote(transaction.id);
  }, [isMaxAmount, isSolana, solanaAsset, solanaIntent, transaction?.id]);

  return { isSolana, prepareSolanaPayQuote };
}
