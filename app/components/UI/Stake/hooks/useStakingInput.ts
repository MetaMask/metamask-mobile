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
} from '../../../../util/number';

const useStakingInputHandlers = (balance: BN) => {
  const [amount, setAmount] = useState('0');
  const [amountBN, setAmountBN] = useState<BN>(new BN(0));

  const isNonZeroAmount = useMemo(() => amountBN.gt(new BN(0)), [amountBN]);
  const isOverMaximum = useMemo(() => {
    const additionalFundsRequired = amountBN.sub(balance || new BN(0));
    return isNonZeroAmount && additionalFundsRequired.gt(new BN(0));
  }, [amountBN, balance, isNonZeroAmount]);

  const [fiatAmount, setFiatAmount] = useState('0');
  const [isEth, setIsEth] = useState<boolean>(true);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate) || 1;

  const currencyToggleValue = isEth
    ? `${fiatAmount} ${currentCurrency.toUpperCase()}`
    : `${amount} ETH`;

  const handleEthInput = useCallback(
    (value: string) => {
      setAmount(value);
      setAmountBN(toWei(value, 'ether'));
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

      setAmount(ethValue);
      setAmountBN(toWei(ethValue, 'ether'));
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
    { value: 1, label: 'Max' },
  ];

  const handleAmountPress = useCallback(
    ({ value }: { value: number }) => {
      if (!balance) return;
      const percentage = value * 100;
      const amountPercentage = balance
        ?.mul(new BN(percentage))
        .div(new BN(100));

      const newAmountString = fromTokenMinimalUnitString(
        amountPercentage.toString(10),
        18,
      );
      const newEthAmount = limitToMaximumDecimalPlaces(
        Number(newAmountString),
        5,
      );
      setAmount(newEthAmount);
      setAmountBN(amountPercentage);

      const newFiatAmount = weiToFiatNumber(
        toWei(newEthAmount.toString(), 'ether'),
        conversionRate,
        2,
      ).toString();
      setFiatAmount(newFiatAmount);
    },
    [balance, conversionRate],
  );

  return {
    amount,
    amountBN,
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

export default useStakingInputHandlers;
