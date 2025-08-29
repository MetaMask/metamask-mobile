import BigNumber from 'bignumber.js';
import BN4 from 'bnjs4';
import { useCallback, useMemo, useState } from 'react';
import {
  fromTokenMinimalUnit,
  limitToMaximumDecimalPlaces,
  renderFiat,
  weiToFiatNumber,
} from '../../../../util/number/legacy';
import useBalance from '../../Stake/hooks/useBalance';
import { EarnTokenDetails } from '../types/lending.types';
import useEarnDepositGasFee from './useEarnGasFee';
import { useEarnMetadata } from './useEarnMetadata';
import useInputHandler from './useInput';

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
    () => new BN4(earnToken?.balanceMinimalUnit ?? '0'),
    [earnToken?.balanceMinimalUnit],
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
    balance: earnToken?.balanceMinimalUnit ?? '0',
    decimals: earnToken?.decimals ?? 0,
    ticker: earnToken?.ticker ?? earnToken?.symbol,
    conversionRate,
    exchangeRate,
  });

  const {
    estimatedEarnGasFeeWei: estimatedGasFeeWei,
    isLoadingEarnGasFee,
    getEstimatedEarnGasFee,
    isEarnGasFeeError,
  } = useEarnDepositGasFee(amountTokenMinimalUnit, earnToken.experience);

  // max amount of native currency stakable after gas fee
  const maxStakeableAmountWei = useMemo(
    () =>
      !isEarnGasFeeError &&
      !isLoadingEarnGasFee &&
      balanceWei.gt(estimatedGasFeeWei)
        ? balanceWei.sub(estimatedGasFeeWei)
        : new BN4(0),

    [balanceWei, estimatedGasFeeWei, isEarnGasFeeError, isLoadingEarnGasFee],
  );

  const isOverMaximum = useMemo(() => {
    let isOverMaximumEth = false;
    if (earnToken.isETH && isNonZeroAmount && !isLoadingEarnGasFee) {
      isOverMaximumEth = amountTokenMinimalUnit
        .sub(maxStakeableAmountWei)
        .gt(new BN4(0));
    }
    let isOverMaximumToken = false;
    if (!earnToken.isETH && isNonZeroAmount && !isLoadingEarnGasFee) {
      isOverMaximumToken = amountTokenMinimalUnit
        .sub(balanceMinimalUnit)
        .gt(new BN4(0));
    }

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
    isLoadingEarnGasFee,
  ]);

  const { annualRewardRate, annualRewardRateDecimal, isLoadingEarnMetadata } =
    useEarnMetadata(earnToken);
  const handleMax = useCallback(async () => {
    if (!balanceMinimalUnit) return;

    let maxMinimalUnit;

    if (earnToken.isETH) {
      const preEstimatedGasFee = await getEstimatedEarnGasFee(
        maxStakeableAmountWei,
      );
      maxMinimalUnit = balanceWei.sub(preEstimatedGasFee);
    } else {
      maxMinimalUnit = balanceMinimalUnit;
    }
    handleMaxInput(maxMinimalUnit);
  }, [
    balanceMinimalUnit,
    handleMaxInput,
    maxStakeableAmountWei,
    earnToken.isETH,
    getEstimatedEarnGasFee,
    balanceWei,
  ]);

  const annualRewardsToken = useMemo(
    () =>
      `${limitToMaximumDecimalPlaces(
        parseFloat(
          fromTokenMinimalUnit(amountTokenMinimalUnit, earnToken.decimals),
        ) * annualRewardRateDecimal,
        5,
      )} ${earnToken.ticker}`,
    [
      amountTokenMinimalUnit,
      annualRewardRateDecimal,
      earnToken.decimals,
      earnToken.ticker,
    ],
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
    if (!isNonZeroAmount || isLoadingEarnGasFee || !estimatedGasFeeWei) {
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
    isLoadingEarnGasFee,
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
    isLoadingEarnGasFee,
    isLoadingEarnMetadata,
    balanceValue,
    getDepositTxGasPercentage,
    isHighGasCostImpact,
    estimatedGasFeeWei,
  };
};

export default useEarnInputHandlers;
