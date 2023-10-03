import useSDKMethod from '../../common/hooks/useSDKMethod';
import { useRampSDK } from '../../common/sdk';

const useLimits = () => {
  const {
    selectedRegion,
    selectedPaymentMethodId,
    selectedAsset,
    selectedFiatCurrencyId,
  } = useRampSDK();

  const [{ data: limits }] = useSDKMethod(
    'getLimits',
    selectedRegion?.id,
    selectedPaymentMethodId,
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
