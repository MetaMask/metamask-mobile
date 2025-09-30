import { useCallback, useState } from 'react';
import { MAX_LENGTH } from '../../components/transactions/custom-amount/edit-amount-2';
import { Hex } from '@metamask/utils';
import { useTokenFiatRate } from '../tokens/useTokenFiatRates';
import { BigNumber } from 'bignumber.js';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { TransactionMeta } from '@metamask/transaction-controller';
import { useTokenAmount } from '../useTokenAmount';
import { setTransactionBridgeQuotesLoading } from '../../../../../core/redux/slices/confirmationMetrics';
import { useDispatch } from 'react-redux';

export function useTransactionCustomAmount() {
  const dispatch = useDispatch();
  const [amountFiat, setAmountFiat] = useState('0');
  const [isInputChanged, setInputChanged] = useState(false);

  const transactionMeta = useTransactionMetadataRequest() as TransactionMeta;
  const { chainId, id: transactionId } = transactionMeta;

  const tokenAddress = getTokenAddress(transactionMeta);
  const tokenFiatRate = useTokenFiatRate(tokenAddress, chainId);
  const { updateTokenAmount: updateTokenAmountCallback } = useTokenAmount();

  const amountHuman = new BigNumber(amountFiat || '0')
    .dividedBy(tokenFiatRate ?? 1)
    .toString(10);

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

  const updateTokenAmount = useCallback(() => {
    dispatch(
      setTransactionBridgeQuotesLoading({ transactionId, isLoading: true }),
    );

    updateTokenAmountCallback(amountHuman);
  }, [amountHuman, dispatch, transactionId, updateTokenAmountCallback]);

  return {
    amountFiat,
    amountHuman,
    isInputChanged,
    updatePendingAmount,
    updateTokenAmount,
  };
}

function getTokenAddress(transactionMeta: TransactionMeta | undefined): Hex {
  return transactionMeta?.txParams?.to as Hex;
}
