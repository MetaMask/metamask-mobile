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
    isBuy ? 'getLimits' : 'getSellLimits',
    selectedRegion?.id,
    selectedPaymentMethodId ? [selectedPaymentMethodId] : null,
    selectedAsset?.id,
    selectedFiatCurrencyId,
  );

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
