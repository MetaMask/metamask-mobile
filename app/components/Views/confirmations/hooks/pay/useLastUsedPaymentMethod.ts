import { useCallback, useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectLastUsedPaymentMethod } from '../../../../../selectors/transactionController';
import { isMatchingPayToken } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

export interface UseLastUsedPaymentMethodResult {
  lastUsedToken: { address: Hex; chainId: Hex } | undefined;
  isLastUsed: (address: Hex, chainId: Hex) => boolean;
}

export function useLastUsedPaymentMethod(): UseLastUsedPaymentMethodResult {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionType = transactionMeta?.type;
  const currentTransactionId = transactionMeta?.id;

  const lastUsedToken = useSelector((state: RootState) =>
    selectLastUsedPaymentMethod(state, transactionType, currentTransactionId),
  );

  const isLastUsed = useCallback(
    (address: Hex, chainId: Hex) =>
      isMatchingPayToken(lastUsedToken, { address, chainId }),
    [lastUsedToken],
  );

  return useMemo(
    () => ({ lastUsedToken, isLastUsed }),
    [lastUsedToken, isLastUsed],
  );
}
