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
  renderFromWei,
} from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';

interface InputHandlerParams {
  balance: BN;
}

const useInputHandler = ({ balance }: InputHandlerParams) => {
  const [amountEth, setAmountEth] = useState('0');
  const [amountWei, setAmountWei] = useState<BN>(new BN(0));
  const [fiatAmount, setFiatAmount] = useState('0');
  const [isEth, setIsEth] = useState<boolean>(true);

  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate) || 1;

  const isNonZeroAmount = useMemo(() => amountWei.gt(new BN(0)), [amountWei]);

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
      const ethValue = renderFromWei(
        fiatNumberToWei(value, conversionRate).toString(),
        5,
      );
      setAmountEth(ethValue);
      setAmountWei(toWei(ethValue, 'ether'));
    },
    [conversionRate],
  );

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
    handleAmountPress,
    currentCurrency,
    conversionRate,
  };
};

export default useInputHandler;
