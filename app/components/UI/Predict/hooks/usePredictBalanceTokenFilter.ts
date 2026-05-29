import { TransactionType } from '@metamask/transaction-controller';
import { useCallback } from 'react';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import {
  AssetType,
  TokenListItem,
} from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';

export function usePredictBalanceTokenFilter(
  forceEnabled = false,
  _onSelect?: () => void,
): (tokens: AssetType[]) => TokenListItem[] {
  const transactionMeta = useTransactionMetadataRequest();

  return useCallback(
    (tokens: AssetType[]): TokenListItem[] => {
      if (
        !forceEnabled &&
        !hasTransactionType(transactionMeta, [
          TransactionType.predictDepositAndOrder,
        ])
      ) {
        return tokens;
      }

      return tokens;
    },
    [forceEnabled, transactionMeta],
  );
}
