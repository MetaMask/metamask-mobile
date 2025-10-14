import { useCallback, useMemo, useState } from 'react';
import { Hex } from '@metamask/utils';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { BigNumber } from 'bignumber.js';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { TransactionMeta } from '@metamask/transaction-controller';
import { useTransactionPayToken } from '../pay/useTransactionPayToken';
import { useUpdateTokenAmount } from './useUpdateTokenAmount';
import { getTokenTransferData } from '../../utils/transaction-pay';

export const MAX_LENGTH = 28;

export function useTransactionCustomAmount() {
  const [amountFiat, setAmountFiat] = useState('0');
  const [isInputChanged, setInputChanged] = useState(false);

  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { chainId } = transactionMeta;

  const tokenAddress = getTokenAddress(transactionMeta);
  const tokenFiatRate = useTokenFiatRate(tokenAddress, chainId);
  const { payToken } = useTransactionPayToken();
  const { tokenFiatAmount } = payToken || {};

  const { updateTokenAmount: updateTokenAmountCallback } =
    useUpdateTokenAmount();

  const amountHuman = useMemo(
    () =>
      new BigNumber(amountFiat || '0')
        .dividedBy(tokenFiatRate ?? 1)
        .toString(10),
    [amountFiat, tokenFiatRate],
  );

  const updatePendingAmount = useCallback((value: string) => {
    let newAmount = value.replace(/^0+/, '') || '0';

    if (newAmount.startsWith('.') || newAmount.startsWith(',')) {
      newAmount = '0' + newAmount;
    }

    if (newAmount.length >= MAX_LENGTH) {
      return;
    }

    setAmountFiat(newAmount);
    setInputChanged(true);
  }, []);

  const updatePendingAmountPercentage = useCallback(
    (percentage: number) => {
      if (!tokenFiatAmount) {
        return;
      }

      const newAmount = new BigNumber(percentage)
        .dividedBy(100)
        .multipliedBy(tokenFiatAmount)
        .decimalPlaces(2, BigNumber.ROUND_HALF_UP)
        .toString(10);

      updatePendingAmount(newAmount);
    },
    [tokenFiatAmount, updatePendingAmount],
  );

  const updateTokenAmount = useCallback(() => {
    updateTokenAmountCallback(amountHuman);
  }, [amountHuman, updateTokenAmountCallback]);

  return {
    amountFiat,
    amountHuman,
    isInputChanged,
    updatePendingAmount,
    updatePendingAmountPercentage,
    updateTokenAmount,
  };
}

function getTokenAddress(transactionMeta: TransactionMeta | undefined): Hex {
  const nestedCall = transactionMeta && getTokenTransferData(transactionMeta);

  if (nestedCall) {
    return nestedCall.to;
  }

  return transactionMeta?.txParams?.to as Hex;
}
