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
  renderFromTokenMinimalUnit,
  fiatNumberToWei,
  fromTokenMinimalUnitString,
  limitToMaximumDecimalPlaces,
  renderFiat,
} from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';

const useStakingInputHandlers = (balance: BN) => {
  const { trackEvent } = useMetrics();
  const [amountEth, setAmountEth] = useState('0');
  const [amountWei, setAmountWei] = useState<BN>(new BN(0));
  const [estimatedAnnualRewards, setEstimatedAnnualRewards] = useState('-');

  const isNonZeroAmount = useMemo(() => amountWei.gt(new BN(0)), [amountWei]);
  const isOverMaximum = useMemo(() => {
    const additionalFundsRequired = amountWei.sub(balance || new BN(0));
    return isNonZeroAmount && additionalFundsRequired.gt(new BN(0));
  }, [amountWei, balance, isNonZeroAmount]);

  const [fiatAmount, setFiatAmount] = useState('0');
  const [isEth, setIsEth] = useState<boolean>(true);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate) || 1;

  const annualRewardRate = '0.026'; //TODO: Replace with actual value: STAKE-806

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
      const ethValue = renderFromTokenMinimalUnit(
        fiatNumberToWei(value, conversionRate).toString(),
        18,
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
      trackEvent(MetaMetricsEvents.STAKE_INPUT_CLICKED)
    },
    [handleEthInput, handleFiatInput, isEth, trackEvent],
  );

  const handleCurrencySwitch = useCallback(() => {
    setIsEth(!isEth);
    trackEvent(MetaMetricsEvents.STAKE_INPUT_TEXT_ENTERED);
  }, [isEth, trackEvent]);

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

      const newAmountString = fromTokenMinimalUnitString(
        amountPercentage.toString(10),
        18,
      );
      const newEthAmount = limitToMaximumDecimalPlaces(
        Number(newAmountString),
        5,
      );
      setAmountEth(newEthAmount);
      setAmountWei(amountPercentage);

      const newFiatAmount = weiToFiatNumber(
        toWei(newEthAmount.toString(), 'ether'),
        conversionRate,
        2,
      ).toString();
      setFiatAmount(newFiatAmount);
    },
    [balance, conversionRate],
  );

  const calculateEstimatedAnnualRewards = useCallback(() => {
    if (isNonZeroAmount) {
      // Limiting the decimal places to keep it consistent with other eth values in the input screen
      const ethRewards = limitToMaximumDecimalPlaces(
        parseFloat(amountEth) * parseFloat(annualRewardRate),
        5,
      );
      if (isEth) {
        setEstimatedAnnualRewards(`${ethRewards} ETH`);
      } else {
        const fiatRewards = renderFiat(
          parseFloat(fiatAmount) * parseFloat(annualRewardRate),
          currentCurrency,
          2,
        );
        setEstimatedAnnualRewards(`${fiatRewards}`);
      }
    } else {
      setEstimatedAnnualRewards(`${Number(annualRewardRate) * 100}%`);
    }
  }, [isNonZeroAmount, amountEth, isEth, fiatAmount, currentCurrency]);

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
  };
};

export default useStakingInputHandlers;
