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
import useInputHandler from './useInput';
import useVaultMetadata from '../../Stake/hooks/useVaultMetadata';
import { EarnTokenDetails } from '../types/lending.types';
import { getDecimalChainId } from '../../../../util/networks';
import useEarnDepositGasFee from './useEarnGasFee';

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
    [earnToken],
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
    decimals: earnToken.decimals,
    ticker: earnToken.ticker ?? earnToken.symbol,
    conversionRate,
    exchangeRate,
  });

  const {
    estimatedEarnGasFeeWei: estimatedGasFeeWei,
    isLoadingEarnGasFee,
    getEstimatedEarnGasFee,
    isEarnGasFeeError,
  } = useEarnDepositGasFee(amountTokenMinimalUnit, earnToken.experience);

  // // max amount of native currency stakable after gas fee
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
    console.log('balanceWei', balanceWei.toString());
    console.log('estimatedGasFeeWei', estimatedGasFeeWei.toString());
    console.log(
      'minus gas is the amount stakable',
      balanceWei.sub(estimatedGasFeeWei).toString(),
    );
    console.log(
      'amountTokenMinimalUnit is what we plan to stake',
      amountTokenMinimalUnit.toString(),
    );
    console.log(
      'minus the gas from amount stakable',
      amountTokenMinimalUnit.sub(balanceWei.sub(estimatedGasFeeWei)).toString(),
    );
    console.log('--------------------------------');
    const isOverMaximumEth =
      !!earnToken.isETH &&
      isNonZeroAmount &&
      !isLoadingEarnGasFee &&
      amountTokenMinimalUnit.sub(maxStakeableAmountWei).gt(new BN4(0));
    const isOverMaximumToken =
      !earnToken.isETH &&
      isNonZeroAmount &&
      !isLoadingEarnGasFee &&
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
    isLoadingEarnGasFee,
  ]);

  console.log('maxStakeableAmountWei', maxStakeableAmountWei.toString());
  // TODO: Update useVaultMetadata to support lending and pooled-staking or separate and call separate hooks.
  const { annualRewardRate, annualRewardRateDecimal, isLoadingVaultMetadata } =
    useVaultMetadata(getDecimalChainId(earnToken.chainId));

  const handleMax = useCallback(async () => {
    if (!balanceMinimalUnit) return;

    const preEstimatedGasFee = await getEstimatedEarnGasFee(
      earnToken.isETH ? maxStakeableAmountWei : balanceMinimalUnit,
    );
    const maxDepositAmountMinimalUnit = balanceWei.sub(preEstimatedGasFee);
    handleMaxInput(maxDepositAmountMinimalUnit);
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
    isLoadingVaultMetadata,
    balanceValue,
    getDepositTxGasPercentage,
    isHighGasCostImpact,
    estimatedGasFeeWei,
  };
};

export default useEarnInputHandlers;
