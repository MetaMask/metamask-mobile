import { useCallback } from 'react';

import { requestSolanaPayQuote } from '../../../../../core/Engine/controllers/transaction-pay-controller/request-solana-pay-quote';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  getSourceAmountRaw,
  useTransactionPaySource,
} from './useTransactionPaySource';

export function usePrepareSolanaPayQuote() {
  const transaction = useTransactionMetadataRequest();
  const { isSolana, solanaAsset } = useTransactionPaySource();

  const prepareSolanaPayQuote = useCallback(async () => {
    if (!isSolana || !transaction?.id || !solanaAsset?.accountId) {
      return;
    }

    await requestSolanaPayQuote({
      sourceAmountRaw: getSourceAmountRaw(solanaAsset),
      sourceWalletAccountId: solanaAsset.accountId,
      transactionId: transaction.id,
    });
  }, [isSolana, solanaAsset, transaction?.id]);

  return { isSolana, prepareSolanaPayQuote };
}
