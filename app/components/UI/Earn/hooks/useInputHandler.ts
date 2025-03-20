import BN4 from 'bnjs4';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import {
  balanceToFiat,
  fiatNumberToTokenMinimalUnit,
  fromTokenMinimalUnit,
  renderFromTokenMinimalUnit,
  toTokenMinimalUnit,
} from '../../../../util/number';
import { EarnTokenDetails } from './useEarnTokenDetails';

interface InputHandlerParams {
  balance: string;
  decimals: number;
  ticker: string;
  conversionRate: number;
  exchangeRate: number;
}

const MAX_DIGITS = 12;

const useInputHandler = ({
  balance,
  decimals = 18,
  ticker = 'ETH',
  conversionRate,
  exchangeRate,
}: InputHandlerParams) => {
  // the asset ui amount
  const [amountToken, setAmountToken] = useState('0');
  // the asset minimal unit amount
  const [amountTokenMinimalUnit, setAmountTokenMinimalUnit] = useState<BN4>(
    new BN4(0),
  );
  // the converted fiat amount
  const [fiatAmount, setFiatAmount] = useState('0');
  // currency toggle fiat / token
  const [isFiat, setIsFiat] = useState<boolean>(false);
  // the current selected currency
  const currentCurrency = useSelector(selectCurrentCurrency);

  const isNonZeroAmount = useMemo(
    () => amountTokenMinimalUnit.gt(new BN4(0)),
    [amountTokenMinimalUnit],
  );

  const balanceMinimalUnit = useMemo(() => new BN4(balance), [balance]);

  const isOverMaximum = useMemo(
    () => amountTokenMinimalUnit.gt(balanceMinimalUnit),
    [amountTokenMinimalUnit, balanceMinimalUnit],
  );

  const handleTokenInput = useCallback(
    (value: string) => {
      setAmountToken(value);
      setAmountTokenMinimalUnit(new BN4(toTokenMinimalUnit(value, decimals)));
      const fiatValue = balanceToFiat(
        value,
        conversionRate,
        exchangeRate,
        currentCurrency,
      ).toString();
      setFiatAmount(fiatValue);
    },
    [conversionRate, decimals, exchangeRate, currentCurrency],
  );

  const handleFiatInput = useCallback(
    (value: string) => {
      setFiatAmount(value);
      try {
        const tokenValue = renderFromTokenMinimalUnit(
          (
            fiatNumberToTokenMinimalUnit(
              value,
              conversionRate,
              exchangeRate,
              decimals,
            ) as BN4
          ).toString(),
          5,
        );
        setAmountToken(tokenValue);
        setAmountTokenMinimalUnit(
          new BN4(toTokenMinimalUnit(tokenValue, decimals)),
        );
      } catch (error) {
        const tokenValue = fromTokenMinimalUnit(
          fiatNumberToTokenMinimalUnit(
            value,
            conversionRate,
            exchangeRate,
            decimals,
          ),
          decimals,
        );
        setAmountToken(tokenValue);
      }
    },
    [conversionRate, decimals, exchangeRate],
  );

  const handleKeypadChange = useCallback(
    ({ value, pressedKey }) => {
      const digitsOnly = value.replace(/[^0-9.]/g, '');
      const [whole = '', fraction = ''] = digitsOnly.split('.');
      const totalDigits = whole.length + fraction.length;

      if (pressedKey === 'BACK' || totalDigits <= MAX_DIGITS) {
        isFiat ? handleFiatInput(value) : handleTokenInput(value);
      }
    },
    [handleTokenInput, handleFiatInput, isFiat],
  );

  const handleCurrencySwitch = useCallback(() => {
    setIsFiat(!isFiat);
  }, [isFiat]);

  const percentageOptions = [
    { value: 0.25, label: '25%' },
    { value: 0.5, label: '50%' },
    { value: 0.75, label: '75%' },
    { value: 1, label: strings('stake.max') },
  ];

  const handleQuickAmountPress = useCallback(
    ({ value }: { value: number }) => {
      const percentage = value * 100;
      const amountPercentage = balanceMinimalUnit
        .mul(new BN4(percentage))
        .div(new BN4(100));

      let newTokenAmount;
      try {
        newTokenAmount = renderFromTokenMinimalUnit(
          amountPercentage,
          decimals,
          5,
        );
      } catch (error) {
        newTokenAmount = fromTokenMinimalUnit(amountPercentage, decimals);
      }
      setAmountToken(newTokenAmount);
      setAmountTokenMinimalUnit(amountPercentage);

      const newFiatAmount = balanceToFiat(
        newTokenAmount,
        conversionRate,
        exchangeRate,
        currentCurrency,
      ).toString();
      setFiatAmount(newFiatAmount);
    },
    [balanceMinimalUnit, conversionRate, decimals, exchangeRate],
  );

  const handleMaxInput = useCallback(
    (maxStakeableMinimalUnit: BN4) => {
      setAmountTokenMinimalUnit(maxStakeableMinimalUnit);

      let tokenValue;

      try {
        tokenValue = renderFromTokenMinimalUnit(
          maxStakeableMinimalUnit,
          decimals,
          decimals,
        );
      } catch (error) {
        tokenValue = fromTokenMinimalUnit(maxStakeableMinimalUnit, decimals);
      }
      setAmountToken(tokenValue);

      const fiatValue = balanceToFiat(
        tokenValue,
        conversionRate,
        exchangeRate,
        currentCurrency,
      ).toString();
      setFiatAmount(fiatValue);
    },
    [conversionRate, decimals, exchangeRate],
  );

  const currencyToggleValue = isFiat
    ? `${amountToken} ${ticker}`
    : `${fiatAmount} ${currentCurrency.toUpperCase()}`;

  useEffect(() => {
    setAmountToken('0');
    setAmountTokenMinimalUnit(new BN4(0));
    setFiatAmount('0');
  }, [ticker]);

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
    handleMaxInput,
  };
};

export default useInputHandler;
