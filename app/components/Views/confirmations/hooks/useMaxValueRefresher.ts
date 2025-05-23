import { useState, useEffect } from 'react';

import { useSelector } from 'react-redux';
import { add0x } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useFeeCalculations } from './gas/useFeeCalculations';
import { useAccountNativeBalance } from './useAccountNativeBalance';
import { selectTransactionState } from '../../../../reducers/transaction';
import { updateEditableParams } from '../../../../util/transaction-controller';
import { useConfirmationContext } from '../context/confirmation-context';

// This hook is used to refresh the max value of the transaction
// when the user is in max amount mode only for the transaction type simpleSend
// It subtracts the native fee from the balance and updates the value of the transaction
export function useMaxValueRefresher() {
  const { maxValueMode } = useSelector(selectTransactionState);
  const [valueJustUpdated, setValueJustUpdated] = useState(false);
  const { setIsTransactionValueUpdating } = useConfirmationContext();
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId, id, txParams, type } =
    transactionMetadata as TransactionMeta;
  const { preciseNativeFeeInHex } = useFeeCalculations(
    transactionMetadata as TransactionMeta,
  );
  const { balanceWeiInHex } = useAccountNativeBalance(chainId, txParams.from);

  useEffect(() => {
    if (!maxValueMode || type !== TransactionType.simpleSend) {
      // Not compatible with transaction value refresh logic
      return;
    }

    const balance = new BigNumber(balanceWeiInHex);
    const fee = new BigNumber(preciseNativeFeeInHex);
    const maxValue = balance.minus(fee);
    const maxValueHex = add0x(maxValue.toString(16));
    const shouldUpdate = maxValueHex !== txParams.value;

    if (shouldUpdate && maxValue.isPositive()) {
      setIsTransactionValueUpdating(true);
      updateEditableParams(id, {
        value: maxValueHex,
      });
      setValueJustUpdated(true);
    }
  }, [
    balanceWeiInHex,
    id,
    maxValueMode,
    preciseNativeFeeInHex,
    setIsTransactionValueUpdating,
    txParams,
    type,
  ]);

  useEffect(() => {
    if (valueJustUpdated) {
      // This will run in the next render cycle after the update
      setIsTransactionValueUpdating(false);
      setValueJustUpdated(false);
    }
  }, [valueJustUpdated, setIsTransactionValueUpdating]);
}
