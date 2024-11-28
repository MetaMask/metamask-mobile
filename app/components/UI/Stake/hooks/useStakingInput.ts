import { BN } from 'ethereumjs-util';
import { useState, useMemo, useCallback } from 'react';
import {
  limitToMaximumDecimalPlaces,
  renderFiat,
} from '../../../../util/number';
import useVaultData from './useVaultData';
import useStakingGasFee from './useStakingGasFee';
import useBalance from './useBalance';
import useInputHandler from './useInputHandler';

const useStakingInputHandlers = () => {
  const [estimatedAnnualRewards, setEstimatedAnnualRewards] = useState('-');
  const { balanceWei: balance, balanceETH, balanceFiatNumber } = useBalance();

  const {
    isEth,
    currencyToggleValue,
    isNonZeroAmount,
    handleKeypadChange,
    handleCurrencySwitch,
    percentageOptions,
    handleQuickAmountPress,
    currentCurrency,
    handleEthInput,
    handleFiatInput,
    conversionRate,
    amountEth,
    amountWei,
    fiatAmount,
    handleMaxInput,
  } = useInputHandler({ balance });

  const { estimatedGasFeeWei, isLoadingStakingGasFee, isStakingGasFeeError } =
    useStakingGasFee(balance.toString());

  const maxStakeableAmountWei = useMemo(
    () =>
      !isStakingGasFeeError && balance.gt(estimatedGasFeeWei)
        ? balance.sub(estimatedGasFeeWei)
        : new BN(0),

    [balance, estimatedGasFeeWei, isStakingGasFeeError],
  );

  const isOverMaximum = useMemo(() => {
    const additionalFundsRequired = amountWei.sub(maxStakeableAmountWei);
    return isNonZeroAmount && additionalFundsRequired.gt(new BN(0));
  }, [amountWei, isNonZeroAmount, maxStakeableAmountWei]);

  const { annualRewardRate, annualRewardRateDecimal, isLoadingVaultData } =
    useVaultData();

  const handleMax = useCallback(async () => {
    if (!balance) return;
    handleMaxInput(maxStakeableAmountWei);
  }, [balance, handleMaxInput, maxStakeableAmountWei]);

  const annualRewardsETH = useMemo(
    () =>
      `${limitToMaximumDecimalPlaces(
        parseFloat(amountEth) * annualRewardRateDecimal,
        5,
      )} ETH`,
    [amountEth, annualRewardRateDecimal],
  );

  const annualRewardsFiat = useMemo(
    () =>
      renderFiat(
        parseFloat(fiatAmount) * annualRewardRateDecimal,
        currentCurrency,
        2,
      ),
    [fiatAmount, annualRewardRateDecimal, currentCurrency],
  );

  const calculateEstimatedAnnualRewards = useCallback(() => {
    if (isNonZeroAmount) {
      if (isEth) {
        setEstimatedAnnualRewards(annualRewardsETH);
      } else {
        setEstimatedAnnualRewards(annualRewardsFiat);
      }
    } else {
      setEstimatedAnnualRewards(annualRewardRate);
    }
  }, [
    isNonZeroAmount,
    isEth,
    annualRewardsETH,
    annualRewardsFiat,
    annualRewardRate,
  ]);

  const balanceValue = isEth
    ? `${balanceETH} ETH`
    : `${balanceFiatNumber?.toString()} ${currentCurrency.toUpperCase()}`;

  const getDepositTxGasPercentage = useCallback(
    () => estimatedGasFeeWei.mul(new BN(100)).div(amountWei).toString(),
    [amountWei, estimatedGasFeeWei],
  );

  // Gas fee make up 30% or more of the deposit amount.
  const isHighGasCostImpact = useCallback(
    () => new BN(getDepositTxGasPercentage()).gt(new BN(30)),
    [getDepositTxGasPercentage],
  );

  return {
    amountEth,
    amountWei,
    fiatAmount,
    isEth,
    currencyToggleValue,
    isNonZeroAmount,
    isOverMaximum,
    handleEthInput,
    handleFiatInput,
    handleKeypadChange,
    handleCurrencySwitch,
    percentageOptions,
    handleQuickAmountPress,
    currentCurrency,
    conversionRate,
    estimatedAnnualRewards,
    calculateEstimatedAnnualRewards,
    annualRewardsETH,
    annualRewardsFiat,
    annualRewardRate,
    isLoadingVaultData,
    handleMax,
    isLoadingStakingGasFee,
    balanceValue,
    getDepositTxGasPercentage,
    isHighGasCostImpact,
  };
};

export default useStakingInputHandlers;
