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

  const [{ data: limits }] = useSDKMethod(
    isBuy ? 'getLimits' : 'getSellLimits',
    selectedRegion?.id,
    selectedPaymentMethodId ? [selectedPaymentMethodId] : null,
    selectedAsset?.id,
    selectedFiatCurrencyId,
  );

  const isAmountBelowMinimum = (amount: number) =>
    amount !== 0 && limits && amount < limits.minAmount;

  const isAmountAboveMaximum = (amount: number) =>
    amount !== 0 && limits && amount > limits.maxAmount;

  const isAmountValid = (amount: number) =>
    !isAmountBelowMinimum(amount) && !isAmountAboveMaximum(amount);

  return {
    limits,
    isAmountBelowMinimum,
    isAmountAboveMaximum,
    isAmountValid,
  };
};

export default useLimits;
