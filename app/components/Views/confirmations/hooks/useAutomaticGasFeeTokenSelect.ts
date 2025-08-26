import { TransactionMeta } from '@metamask/transaction-controller';
import { useCallback, useState } from 'react';

import { useIsGaslessSupported } from './gas/useIsGaslessSupported';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useIsInsufficientBalance } from './useIsInsufficientBalance';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { updateSelectedGasFeeToken } from '../../../../util/transaction-controller';
import { useAsyncResult } from '../../../hooks/useAsyncResult';

export function useAutomaticGasFeeTokenSelect() {
  const { isSupported: isGaslessSupported, isSmartTransaction } =
    useIsGaslessSupported();
  const [firstCheck, setFirstCheck] = useState(true);

  const transactionMeta =
    (useTransactionMetadataRequest() as TransactionMeta) ??
    ({} as TransactionMeta);

  const hasInsufficientBalance = useIsInsufficientBalance();

  const {
    gasFeeTokens,
    id: transactionId,
    selectedGasFeeToken,
  } = transactionMeta;

  let firstGasFeeTokenAddress = gasFeeTokens?.[0]?.tokenAddress;

  if (!isSmartTransaction && firstGasFeeTokenAddress === NATIVE_TOKEN_ADDRESS) {
    firstGasFeeTokenAddress = gasFeeTokens?.[1]?.tokenAddress;
  }

  const selectFirstToken = useCallback(async () => {
    await updateSelectedGasFeeToken(transactionId, firstGasFeeTokenAddress);
  }, [transactionId, firstGasFeeTokenAddress]);

  const shouldSelect =
    isGaslessSupported &&
    hasInsufficientBalance &&
    !selectedGasFeeToken &&
    Boolean(firstGasFeeTokenAddress);

  useAsyncResult(async () => {
    if (!gasFeeTokens || !transactionId || !firstCheck) {
      return;
    }

    setFirstCheck(false);

    if (shouldSelect) {
      await selectFirstToken();
    }
  }, [shouldSelect, selectFirstToken, firstCheck, gasFeeTokens, transactionId]);
}
