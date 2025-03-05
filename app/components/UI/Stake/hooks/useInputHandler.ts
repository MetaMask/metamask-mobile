import BN4 from 'bnjs4';
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
  renderFromWei,
  fromWei,
} from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';

interface InputHandlerParams {
  balance: BN4;
}
const MAX_DIGITS = 12;
const useInputHandler = ({ balance }: InputHandlerParams) => {
  const [amountEth, setAmountEth] = useState('0');
  const [amountWei, setAmountWei] = useState<BN4>(new BN4(0));
  const [fiatAmount, setFiatAmount] = useState('0');
  const [isEth, setIsEth] = useState<boolean>(true);

  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate) || 1;

  const isNonZeroAmount = useMemo(() => amountWei.gt(new BN4(0)), [amountWei]);

  const isOverMaximum = useMemo(
    () => amountWei.gt(balance),
    [amountWei, balance],
  );

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
      try {
        const ethValue = renderFromWei(
          fiatNumberToWei(value, conversionRate).toString(),
          5,
        );
        setAmountEth(ethValue);
        setAmountWei(toWei(ethValue, 'ether'));
      } catch (error) {
        const ethValue = fromWei(
          fiatNumberToWei(value, conversionRate).toString(),
        );
        setAmountEth(ethValue);
        setAmountWei(toWei(ethValue, 'ether'));
      }
    },
    [conversionRate],
  );

  const handleKeypadChange = useCallback(
    ({ value, pressedKey }) => {
      const digitsOnly = value.replace(/[^0-9.]/g, '');
      const [whole = '', fraction = ''] = digitsOnly.split('.');
      const totalDigits = whole.length + fraction.length;

      if (pressedKey === 'BACK' || totalDigits <= MAX_DIGITS) {
        isEth ? handleEthInput(value) : handleFiatInput(value);
      }
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

  const handleQuickAmountPress = useCallback(
    ({ value }: { value: number }) => {
      const percentage = value * 100;
      const amountPercentage = balance.mul(new BN4(percentage)).div(new BN4(100));

      let newEthAmount;
      try {
        newEthAmount = renderFromWei(amountPercentage, 5);
      } catch (error) {
        newEthAmount = fromWei(amountPercentage);
      }
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

  const handleMaxInput = useCallback(
    (maxStakeableWei: BN4) => {
      setAmountWei(maxStakeableWei);

      let ethValue;

      try {
        ethValue = renderFromWei(maxStakeableWei, 5);
      } catch (error) {
        ethValue = fromWei(maxStakeableWei);
      }
      setAmountEth(ethValue);
      const fiatValue = weiToFiatNumber(
        maxStakeableWei,
        conversionRate,
        2,
      ).toString();
      setFiatAmount(fiatValue);
    },
    [conversionRate],
  );

  const currencyToggleValue = isEth
    ? `${fiatAmount} ${currentCurrency.toUpperCase()}`
    : `${amountEth} ETH`;

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
    handleMaxInput,
  };
};

export default useInputHandler;
