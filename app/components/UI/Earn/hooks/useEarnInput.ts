import BigNumber from 'bignumber.js';
import BN4 from 'bnjs4';
import { useCallback, useMemo, useState } from 'react';
import {
  fromTokenMinimalUnit,
  limitToMaximumDecimalPlaces,
  renderFiat,
  weiToFiatNumber,
} from '../../../../util/number';
import useBalance from '../../Stake/hooks/useBalance';
import { EarnTokenDetails } from './useEarnTokenDetails';
import useInputHandler from './useInput';
import useStakingGasFee from '../../Stake/hooks/useStakingGasFee';
import useVaultMetadata from '../../Stake/hooks/useVaultMetadata';

export interface EarnInputProps {
  earnToken: EarnTokenDetails;
  conversionRate: number;
  exchangeRate: number;
}

const useEarnInputHandlers = ({
  earnToken,
  conversionRate,
  exchangeRate,
}: EarnInputProps) => {
  const { balanceWei, balanceETH, balanceFiatNumber } = useBalance();
  const [estimatedAnnualRewards, setEstimatedAnnualRewards] = useState('-');

  const balanceMinimalUnit: BN4 = useMemo(
    () => new BN4(earnToken.balanceMinimalUnit),
    [earnToken.balanceMinimalUnit],
  );

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
    amountFiatNumber,
    handleMaxInput,
  } = useInputHandler({
    balance: earnToken.balanceMinimalUnit,
    decimals: earnToken.decimals,
    ticker: earnToken.ticker ?? earnToken.symbol,
    conversionRate,
    exchangeRate,
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
    const isOverMaximumEth =
      !!earnToken.isETH &&
      isNonZeroAmount &&
      amountTokenMinimalUnit.sub(maxStakeableAmountWei).gt(new BN4(0));
    const isOverMaximumToken =
      !earnToken.isETH &&
      isNonZeroAmount &&
      amountTokenMinimalUnit.sub(balanceMinimalUnit).gt(new BN4(0)) &&
      balanceWei.sub(estimatedGasFeeWei).gte(new BN4(0));
    return {
      isOverMaximumEth,
      isOverMaximumToken,
    };
  }, [
    amountTokenMinimalUnit,
    isNonZeroAmount,
    maxStakeableAmountWei,
    earnToken.isETH,
    balanceMinimalUnit,
    balanceWei,
    estimatedGasFeeWei,
  ]);

  const { annualRewardRate, annualRewardRateDecimal, isLoadingVaultMetadata } =
    useVaultMetadata();

  const handleMax = useCallback(async () => {
    if (!balanceMinimalUnit) return;
    handleMaxInput(
      earnToken.isETH ? maxStakeableAmountWei : balanceMinimalUnit,
    );
  }, [
    balanceMinimalUnit,
    handleMaxInput,
    maxStakeableAmountWei,
    earnToken.isETH,
  ]);

  const annualRewardsToken = useMemo(
    () =>
      `${limitToMaximumDecimalPlaces(
        parseFloat(
          fromTokenMinimalUnit(amountTokenMinimalUnit, earnToken.decimals),
        ) * annualRewardRateDecimal,
        5,
      )} ETH`,
    [amountTokenMinimalUnit, annualRewardRateDecimal, earnToken.decimals],
  );

  const annualRewardsFiat = useMemo(
    () =>
      renderFiat(
        parseFloat(amountFiatNumber) * annualRewardRateDecimal,
        currentCurrency,
        2,
      ),
    [amountFiatNumber, annualRewardRateDecimal, currentCurrency],
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

    return new BigNumber(gasFiatNumber)
      .multipliedBy(new BigNumber(100))
      .div(new BigNumber(amountFiatNumber))
      .toFixed(0, 1)
      .toString();
  }, [
    conversionRate,
    estimatedGasFeeWei,
    isNonZeroAmount,
    isLoadingStakingGasFee,
    amountFiatNumber,
  ]);

  // Gas fee make up 30% or more of the deposit amount.
  const isHighGasCostImpact = useCallback(
    () => new BN4(getDepositTxGasPercentage()).gt(new BN4(30)),
    [getDepositTxGasPercentage],
  );

  return {
    amountToken,
    amountTokenMinimalUnit,
    amountFiatNumber,
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
