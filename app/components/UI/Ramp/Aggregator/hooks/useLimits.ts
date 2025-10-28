import { useEffect } from 'react';
import useSDKMethod from './useSDKMethod';
import { useRampSDK } from '../sdk';

const useLimits = () => {
  const {
    selectedRegion,
    selectedPaymentMethodId,
    selectedAsset,
    selectedFiatCurrencyId,
    isBuy,
  } = useRampSDK();

  const [{ data: limits, isFetching }, queryGetLimits] = useSDKMethod(
    { method: isBuy ? 'getLimits' : 'getSellLimits', onMount: false },
    selectedRegion?.id,
    selectedPaymentMethodId ? [selectedPaymentMethodId] : null,
    selectedAsset?.id,
    selectedFiatCurrencyId,
  );

  useEffect(() => {
    if (
      selectedRegion?.id &&
      selectedPaymentMethodId &&
      selectedAsset?.id &&
      selectedFiatCurrencyId
    ) {
      queryGetLimits();
    }
  }, [
    selectedRegion?.id,
    selectedPaymentMethodId,
    selectedAsset?.id,
    selectedFiatCurrencyId,
    queryGetLimits,
  ]);

  const isAmountBelowMinimum = (amount: number) =>
    Boolean(amount !== 0 && limits?.minAmount && amount < limits.minAmount);

  const isAmountAboveMaximum = (amount: number) =>
    Boolean(amount !== 0 && limits?.maxAmount && amount > limits.maxAmount);

  const isAmountValid = (amount: number) =>
    !isAmountBelowMinimum(amount) && !isAmountAboveMaximum(amount);

  return {
    limits,
    isFetching,
    isAmountBelowMinimum,
    isAmountAboveMaximum,
    isAmountValid,
    queryGetLimits,
  };
};

export default useLimits;
