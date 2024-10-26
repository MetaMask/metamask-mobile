import { BN } from 'ethereumjs-util';
import { useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  selectCurrentCurrency,
  selectConversionRate,
} from '../../../../selectors/currencyRateController';
import {
  toWei,
  weiToFiatNumber,
  fiatNumberToWei,
  limitToMaximumDecimalPlaces,
  renderFiat,
  renderFromWei,
} from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import useVaultData from './useVaultData';
import useStakingGasFee from './useStakingGasFee';
import { useFocusEffect } from '@react-navigation/native';

const useStakingInputHandlers = (balance: BN) => {
  const [amountEth, setAmountEth] = useState('0');
  const [amountWei, setAmountWei] = useState<BN>(new BN(0));
  const [estimatedAnnualRewards, setEstimatedAnnualRewards] = useState('-');

  const {
    estimatedGasFeeWei,
    isLoadingStakingGasFee,
    isStakingGasFeeError,
    refreshGasValues,
  } = useStakingGasFee(balance.toString());

  useFocusEffect(
    useCallback(() => {
      refreshGasValues();
    }, [refreshGasValues]),
  );

  const maxStakeableAmountWei = useMemo(
    () =>
      !isStakingGasFeeError && balance.gt(estimatedGasFeeWei)
        ? balance.sub(estimatedGasFeeWei)
        : new BN(0),
    [balance, estimatedGasFeeWei, isStakingGasFeeError],
  );

  const isNonZeroAmount = useMemo(() => amountWei.gt(new BN(0)), [amountWei]);
  const isOverMaximum = useMemo(() => {
    const additionalFundsRequired = amountWei.sub(maxStakeableAmountWei);
    return isNonZeroAmount && additionalFundsRequired.gt(new BN(0));
  }, [amountWei, isNonZeroAmount, maxStakeableAmountWei]);

  const [fiatAmount, setFiatAmount] = useState('0');
  const [isEth, setIsEth] = useState<boolean>(true);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate) || 1;

  const { annualRewardRate, annualRewardRateDecimal, isLoadingVaultData } =
    useVaultData();

  const currencyToggleValue = isEth
    ? `${fiatAmount} ${currentCurrency.toUpperCase()}`
    : `${amountEth} ETH`;

  const handleEthInput = useCallback(
    (value: string) => {
      setAmountEth(value);
      setAmountWei(toWei(value, 'ether'));
      const fiatValue = weiToFiatNumber(
        toWei(value, 'ether'),
        conversionRate,
        2,
      ).toString();
      setFiatAmount(fiatValue);
    },
    [conversionRate],
  );

  const handleFiatInput = useCallback(
    (value: string) => {
      setFiatAmount(value);
      const ethValue = renderFromWei(
        fiatNumberToWei(value, conversionRate).toString(),
        5,
      );

      setAmountEth(ethValue);
      setAmountWei(toWei(ethValue, 'ether'));
    },
    [conversionRate],
  );

  /* Keypad Handlers */
  const handleKeypadChange = useCallback(
    ({ value }) => {
      isEth ? handleEthInput(value) : handleFiatInput(value);
    },
    [handleEthInput, handleFiatInput, isEth],
  );

  const handleCurrencySwitch = useCallback(() => {
    setIsEth(!isEth);
  }, [isEth]);

  const percentageOptions = [
    { value: 0.25, label: '25%' },
    { value: 0.5, label: '50%' },
    { value: 0.75, label: '75%' },
    { value: 1, label: strings('stake.max') },
  ];

  const handleAmountPress = useCallback(
    ({ value }: { value: number }) => {
      if (!balance) return;
      const percentage = value * 100;

      const amountPercentage = balance.mul(new BN(percentage)).div(new BN(100));

      const newEthAmount = renderFromWei(amountPercentage, 5);
      setAmountEth(newEthAmount);
      setAmountWei(amountPercentage);

      const newFiatAmount = weiToFiatNumber(
        amountPercentage,
        conversionRate,
        2,
      ).toString();
      setFiatAmount(newFiatAmount);
    },
    [balance, conversionRate],
  );

  const handleMax = useCallback(() => {
    if (!balance) return;

    const newEthAmount = renderFromWei(maxStakeableAmountWei, 5);

    setAmountEth(newEthAmount);
    setAmountWei(maxStakeableAmountWei);

    const newFiatAmount = weiToFiatNumber(
      maxStakeableAmountWei,
      conversionRate,
      2,
    ).toString();
    setFiatAmount(newFiatAmount);
  }, [balance, conversionRate, maxStakeableAmountWei]);

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
    handleAmountPress,
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
  };
};

export default useStakingInputHandlers;
