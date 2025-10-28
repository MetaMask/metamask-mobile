import { TransactionMeta } from '@metamask/transaction-controller';
import { useCallback, useEffect, useState } from 'react';
import { updateSelectedGasFeeToken } from '../../../../util/transaction-controller';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { useIsGaslessSupported } from './gas/useIsGaslessSupported';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useIsInsufficientBalance } from './useIsInsufficientBalance';

export function useAutomaticGasFeeTokenSelect() {
  const { isSupported: isGaslessSupported, isSmartTransaction } =
    useIsGaslessSupported();
  const hasInsufficientBalance = useIsInsufficientBalance();
  const transactionMeta =
    (useTransactionMetadataRequest() as TransactionMeta) ??
    ({} as TransactionMeta);
  const [checked, setChecked] = useState(false);

  const {
    gasFeeTokens,
    id: transactionId,
    selectedGasFeeToken,
  } = transactionMeta;

  const [first, second] = gasFeeTokens || [];
  const firstGasFeeTokenAddress =
    !isSmartTransaction && first?.tokenAddress === NATIVE_TOKEN_ADDRESS
      ? second?.tokenAddress
      : first?.tokenAddress;

  const selectFirstToken = useCallback(() => {
    if (!transactionId || !firstGasFeeTokenAddress) {
      return;
    }
    updateSelectedGasFeeToken(transactionId, firstGasFeeTokenAddress);
  }, [transactionId, firstGasFeeTokenAddress]);

  const shouldSelect =
    !checked &&
    isGaslessSupported &&
    hasInsufficientBalance &&
    !selectedGasFeeToken &&
    Boolean(firstGasFeeTokenAddress);

  useEffect(() => {
    if (shouldSelect) {
      selectFirstToken();
      setChecked(true);
    }
  }, [shouldSelect, selectFirstToken]);
}
