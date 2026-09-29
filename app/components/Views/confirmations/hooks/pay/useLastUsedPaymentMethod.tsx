import React, { ReactNode, useCallback, useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { selectLastUsedPaymentMethod } from '../../../../../selectors/transactionController';
import { isMatchingPayToken } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { LastUsedTag } from '../../components/UI/last-used-tag';

export interface UseLastUsedPaymentMethodResult {
  lastUsedToken: { address: Hex; chainId: Hex } | undefined;
  isLastUsed: (address: Hex, chainId: Hex) => boolean;
  renderLastUsedTag: (
    address: Hex,
    chainId: Hex,
    options?: { testID?: string },
  ) => ReactNode;
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

  const renderLastUsedTag = useCallback(
    (address: Hex, chainId: Hex, options?: { testID?: string }): ReactNode =>
      isLastUsed(address, chainId) ? (
        <LastUsedTag testID={options?.testID} />
      ) : null,
    [isLastUsed],
  );

  return useMemo(
    () => ({ lastUsedToken, isLastUsed, renderLastUsedTag }),
    [lastUsedToken, isLastUsed, renderLastUsedTag],
  );
}
