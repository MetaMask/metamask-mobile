import BigNumber from 'bignumber.js';
import BN4 from 'bnjs4';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  fromTokenMinimalUnit,
  limitToMaximumDecimalPlaces,
  renderFiat,
  weiToFiatNumber,
} from '../../../../util/number';
import useBalance from '../../Stake/hooks/useBalance';
import { EarnTokenDetails } from '../types/lending.types';
import useEarnDepositGasFee from './useEarnGasFee';
import { useEarnMetadata } from './useEarnMetadata';
import useInputHandler from './useInput';
import useMultichainInputHandlers from './useMultichainInputHandlers';

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
    currencyToggleValue: evmCurrencyToggleValue,
    isNonZeroAmount,
    handleKeypadChange: evmHandleKeypadChange,
    handleCurrencySwitch: evmHandleCurrencySwitch,
    percentageOptions,
    handleQuickAmountPress: evmHandleQuickAmountPress,
    currentCurrency,
    handleTokenInput: evmHandleTokenInput,
    handleFiatInput: evmHandleFiatInput,
    amountToken,
    amountTokenMinimalUnit,
    amountFiatNumber: evmAmountFiatNumber,
    handleMaxInput,
  } = useInputHandler({
    balance: earnToken?.balanceMinimalUnit ?? '0',
    decimals: earnToken?.decimals ?? 0,
    ticker: earnToken?.ticker ?? earnToken?.symbol,
    conversionRate,
    exchangeRate,
  });

  const {
    isNonEvm,
    nonEvmFiatRate,
    currencyToggleValue,
    handleKeypadChange,
    handleCurrencySwitch,
    handleQuickAmountPress,
    handleTokenInput,
    handleFiatInput,
    amountFiatNumber,
    clearNonEvmTypedFiatValue,
  } = useMultichainInputHandlers({
    earnToken,
    evmHandlers: {
      isFiat,
      currencyToggleValue: evmCurrencyToggleValue,
      handleKeypadChange: evmHandleKeypadChange,
      handleCurrencySwitch: evmHandleCurrencySwitch,
      handleQuickAmountPress: evmHandleQuickAmountPress,
      handleTokenInput: evmHandleTokenInput,
      handleFiatInput: evmHandleFiatInput,
      amountToken,
      amountFiatNumber: evmAmountFiatNumber,
      currentCurrency,
    },
  });

  const earnGasFee = useEarnDepositGasFee(
    amountTokenMinimalUnit,
    earnToken.experience,
  );
  const isNativeETH = earnToken.isETH;
  const estimatedGasFeeWei = useMemo(
    () => (isNativeETH ? earnGasFee.estimatedEarnGasFeeWei : new BN4(0)),
    [isNativeETH, earnGasFee.estimatedEarnGasFeeWei],
  );
  const isLoadingEarnGasFee = useMemo(
    () => (isNativeETH ? earnGasFee.isLoadingEarnGasFee : false),
    [isNativeETH, earnGasFee.isLoadingEarnGasFee],
  );
  const getEstimatedEarnGasFee = useCallback(
    async (amountMinimalUnitParam: BN4) => {
      if (isNativeETH) {
        return earnGasFee.getEstimatedEarnGasFee(amountMinimalUnitParam);
      }
      return new BN4(0);
    },
    [isNativeETH, earnGasFee],
  );
  const isEarnGasFeeError = useMemo(
    () => (isNativeETH ? earnGasFee.isEarnGasFeeError : false),
    [isNativeETH, earnGasFee.isEarnGasFeeError],
  );

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

  // For non-ETH tokens, isOverMaximum doesn't depend on gas fees, so no loading check needed.
  // For ETH, we only update the check when gas fee estimation completes (not during loading)
  // to prevent the error message from flickering during re-estimation.
  const isOverMaximumToken = useMemo(() => {
    if (earnToken.isETH || !isNonZeroAmount) return false;
    return amountTokenMinimalUnit.sub(balanceMinimalUnit).gt(new BN4(0));
  }, [
    earnToken.isETH,
    isNonZeroAmount,
    amountTokenMinimalUnit,
    balanceMinimalUnit,
  ]);

  const isOverMaximumEth = useMemo(() => {
    // Skip calculation during loading to prevent flickering - keep previous value
    if (!earnToken.isETH || !isNonZeroAmount || isLoadingEarnGasFee)
      return false;
    return amountTokenMinimalUnit.sub(maxStakeableAmountWei).gt(new BN4(0));
  }, [
    earnToken.isETH,
    isNonZeroAmount,
    isLoadingEarnGasFee,
    amountTokenMinimalUnit,
    maxStakeableAmountWei,
  ]);

  // Use ref to preserve the last known ETH over-maximum state during loading
  const lastIsOverMaximumEthRef = useRef(false);
  if (!isLoadingEarnGasFee) {
    lastIsOverMaximumEthRef.current = isOverMaximumEth;
  }

  const isOverMaximum = useMemo(
    () => ({
      // Use last known value during loading to prevent flickering
      isOverMaximumEth: isLoadingEarnGasFee
        ? lastIsOverMaximumEthRef.current
        : isOverMaximumEth,
      isOverMaximumToken,
    }),
    [isLoadingEarnGasFee, isOverMaximumEth, isOverMaximumToken],
  );

  const { annualRewardRate, annualRewardRateDecimal, isLoadingEarnMetadata } =
    useEarnMetadata(earnToken);
  const handleMax = useCallback(async () => {
    if (!balanceMinimalUnit) return;

    // Clear typed fiat value so amountFiatNumber recalculates from the new max token amount
    clearNonEvmTypedFiatValue();

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
    clearNonEvmTypedFiatValue,
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

  const annualRewardsFiat = useMemo(() => {
    const fiatAmount = parseFloat(amountFiatNumber) || 0;
    return renderFiat(fiatAmount * annualRewardRateDecimal, currentCurrency, 2);
  }, [amountFiatNumber, annualRewardRateDecimal, currentCurrency]);

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

  const tokenBalanceFiat = useMemo(() => {
    if (isNonEvm && nonEvmFiatRate && nonEvmFiatRate > 0) {
      const balanceNumber = parseFloat(earnToken?.balanceFormatted ?? '0') || 0;
      return (balanceNumber * nonEvmFiatRate).toFixed(2);
    }
    return earnToken.isETH
      ? balanceFiatNumber?.toString()
      : earnToken.balanceFiat;
  }, [
    isNonEvm,
    nonEvmFiatRate,
    earnToken?.balanceFormatted,
    earnToken.isETH,
    earnToken.balanceFiat,
    balanceFiatNumber,
  ]);

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
