import BigNumber from 'bignumber.js';
import BN4 from 'bnjs4';
import { useCallback, useMemo, useState } from 'react';
import {
  balanceToFiatNumber,
  limitToMaximumDecimalPlaces,
  renderFiat,
  weiToFiatNumber,
} from '../../../../util/number';
import useBalance from './useBalance';
import { EarnTokenDetails } from './useEarnTokenDetails';
import useInputHandler from './useInputHandler';
import useStakingGasFee from './useStakingGasFee';
import useVaultMetadata from './useVaultMetadata';

const useEarnInputHandlers = ({
  earnToken,
  conversionRate,
  exchangeRate,
}: {
  earnToken: EarnTokenDetails;
  conversionRate: number;
  exchangeRate: number;
}) => {
  const { balanceWei, balanceETH, balanceFiatNumber } = useBalance();
  const [estimatedAnnualRewards, setEstimatedAnnualRewards] = useState('-');

  let balance: BN4 = new BN4(earnToken.balanceMinimalUnit);

  console.log('earnToken', earnToken);

  const {
    isFiat,
    currencyToggleValue,
    isNonZeroAmount,
    handleKeypadChange,
    handleCurrencySwitch,
    percentageOptions,
    handleQuickAmountPress,
    currentCurrency,
    handleTokenInput,
    handleFiatInput,
    amountToken,
    amountTokenMinimalUnit,
    fiatAmount,
    handleMaxInput,
  } = useInputHandler({
    balance: earnToken.balance,
    decimals: earnToken.decimals,
    ticker: earnToken.ticker ?? earnToken.symbol,
    conversionRate: conversionRate,
    exchangeRate: exchangeRate,
  });

  const { estimatedGasFeeWei, isLoadingStakingGasFee, isStakingGasFeeError } =
    useStakingGasFee(balanceWei.toString());

  // max amount of native currency stakable after gas fee
  const maxStakeableAmountWei = useMemo(
    () =>
      !isStakingGasFeeError && balanceWei.gt(estimatedGasFeeWei)
        ? balanceWei.sub(estimatedGasFeeWei)
        : new BN4(0),

    [balanceWei, estimatedGasFeeWei, isStakingGasFeeError],
  );

  const isOverMaximum = useMemo(() => {
    if (earnToken.isETH) {
      const additionalFundsRequired = amountTokenMinimalUnit.sub(
        maxStakeableAmountWei,
      );
      return isNonZeroAmount && additionalFundsRequired.gt(new BN4(0));
    }
    const additionalFundsRequired = amountTokenMinimalUnit.sub(balance);
    return (
      isNonZeroAmount &&
      additionalFundsRequired.gt(new BN4(0)) &&
      balanceWei.sub(estimatedGasFeeWei).gte(new BN4(0))
    );
  }, [
    amountTokenMinimalUnit,
    isNonZeroAmount,
    maxStakeableAmountWei,
    earnToken.isETH,
    balance,
  ]);

  const { annualRewardRate, annualRewardRateDecimal, isLoadingVaultMetadata } =
    useVaultMetadata();

  const handleMax = useCallback(async () => {
    if (!balance) return;
    handleMaxInput(earnToken.isETH ? maxStakeableAmountWei : balance);
  }, [balance, handleMaxInput, maxStakeableAmountWei, earnToken.isETH]);

  const annualRewardsToken = useMemo(
    () =>
      `${limitToMaximumDecimalPlaces(
        parseFloat(amountToken) * annualRewardRateDecimal,
        5,
      )} ETH`,
    [amountToken, annualRewardRateDecimal],
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
      if (!isFiat) {
        setEstimatedAnnualRewards(annualRewardsToken);
      } else {
        setEstimatedAnnualRewards(annualRewardsFiat);
      }
    } else {
      setEstimatedAnnualRewards(annualRewardRate);
    }
  }, [
    isNonZeroAmount,
    isFiat,
    annualRewardsToken,
    annualRewardsFiat,
    annualRewardRate,
  ]);

  const tokenBalanceFiat = earnToken.isETH
    ? balanceFiatNumber?.toString()
    : earnToken.balanceFiat;

  const tokenBalance = earnToken.isETH
    ? `${balanceETH} ETH`
    : earnToken.balanceFormatted;

  const balanceValue = isFiat
    ? `${tokenBalanceFiat} ${currentCurrency.toUpperCase()}`
    : `${tokenBalance}`;

  const getDepositTxGasPercentage = useCallback(() => {
    if (!isNonZeroAmount || isLoadingStakingGasFee || !estimatedGasFeeWei) {
      return '0';
    }

    const gasBN = new BigNumber(estimatedGasFeeWei.toString());
    const gasFiatNumber = weiToFiatNumber(gasBN.toString(), conversionRate, 2);
    const amountFiatNumber = earnToken.isETH
      ? balanceFiatNumber
      : balanceToFiatNumber(amountToken, conversionRate, exchangeRate, 2);
    return new BigNumber(gasFiatNumber)
      .multipliedBy(new BigNumber(100))
      .div(new BigNumber(amountFiatNumber))
      .toFixed(0, 1)
      .toString();
  }, [amountTokenMinimalUnit, estimatedGasFeeWei, earnToken.isETH]);

  // Gas fee make up 30% or more of the deposit amount.
  const isHighGasCostImpact = useCallback(
    () => new BN4(getDepositTxGasPercentage()).gt(new BN4(30)),
    [getDepositTxGasPercentage],
  );

  return {
    amountToken,
    amountTokenMinimalUnit,
    fiatAmount,
    isFiat,
    currencyToggleValue,
    isNonZeroAmount,
    isOverMaximum,
    handleTokenInput,
    handleFiatInput,
    handleKeypadChange,
    handleCurrencySwitch,
    percentageOptions,
    handleQuickAmountPress,
    currentCurrency,
    conversionRate,
    estimatedAnnualRewards,
    calculateEstimatedAnnualRewards,
    annualRewardsToken,
    annualRewardsFiat,
    annualRewardRate,
    handleMax,
    isLoadingStakingGasFee,
    isLoadingVaultMetadata,
    balanceValue,
    getDepositTxGasPercentage,
    isHighGasCostImpact,
    estimatedGasFeeWei,
  };
};

export default useEarnInputHandlers;
