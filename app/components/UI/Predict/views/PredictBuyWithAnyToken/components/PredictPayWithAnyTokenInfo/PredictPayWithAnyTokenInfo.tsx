import BigNumber from 'bignumber.js';
import { useEffect, useMemo } from 'react';
import { PREDICT_CURRENCY } from '../../../../../../Views/confirmations/constants/predict';
import { useTransactionCustomAmount } from '../../../../../../Views/confirmations/hooks/transactions/useTransactionCustomAmount';
import { useTransactionMetadataRequest } from '../../../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useUpdateTokenAmount } from '../../../../../../Views/confirmations/hooks/transactions/useUpdateTokenAmount';
import { usePredictPaymentToken } from '../../../../hooks/usePredictPaymentToken';
import useClearConfirmationOnBackSwipe from '../../../../../../Views/confirmations/hooks/ui/useClearConfirmationOnBackSwipe';

interface PredictPayWithAnyTokenInfoProps {
  depositAmount: number;
}

const PredictPayWithAnyTokenInfo = ({
  depositAmount,
}: PredictPayWithAnyTokenInfoProps) => {
  const { isPredictBalanceSelected } = usePredictPaymentToken();

  useClearConfirmationOnBackSwipe();

  const { updateTokenAmount: updateTokenAmountCallback } =
    useUpdateTokenAmount();

  const activeTransactionMeta = useTransactionMetadataRequest();

  const parsedDepositAmount = useMemo(() => {
    if (isPredictBalanceSelected || depositAmount <= 0) {
      return '';
    }
    return new BigNumber(depositAmount)
      .decimalPlaces(2, BigNumber.ROUND_HALF_UP)
      .toString(10);
  }, [isPredictBalanceSelected, depositAmount]);

  const { updatePendingAmount, amountHuman } = useTransactionCustomAmount({
    currency: PREDICT_CURRENCY,
  });

  useEffect(() => {
    if (
      parsedDepositAmount &&
      parsedDepositAmount.trim() !== '' &&
      activeTransactionMeta
    ) {
      updatePendingAmount(parsedDepositAmount);
    }
  }, [parsedDepositAmount, activeTransactionMeta, updatePendingAmount]);

  useEffect(() => {
    if (
      amountHuman &&
      amountHuman !== '0' &&
      parsedDepositAmount &&
      parsedDepositAmount.trim() !== '' &&
      activeTransactionMeta
    ) {
      updateTokenAmountCallback(amountHuman);
    }
  }, [
    amountHuman,
    depositAmount,
    activeTransactionMeta,
    updateTokenAmountCallback,
    parsedDepositAmount,
  ]);

  return null;
};

export default PredictPayWithAnyTokenInfo;
