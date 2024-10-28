import { BigNumber } from 'bignumber.js';
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
    selectedPaymentMethodId,
    selectedAsset?.id,
    selectedFiatCurrencyId,
  );

  const isAmountBelowMinimum = (amount: string): boolean => {
    const amountBigNum = new BigNumber(amount, 10);
    return amountBigNum.gt(0) && !!limits && amountBigNum.lt(limits.minAmount);
  };

  const isAmountAboveMaximum = (amount: string): boolean => {
    const amountBigNum = new BigNumber(amount, 10);
    return amountBigNum.gt(0) && !!limits && amountBigNum.gt(limits.maxAmount);
  };

  const isAmountValid = (amount: string): boolean =>
    !isAmountBelowMinimum(amount) && !isAmountAboveMaximum(amount);

  return {
    limits,
    isAmountBelowMinimum,
    isAmountAboveMaximum,
    isAmountValid,
  };
};

export default useLimits;
