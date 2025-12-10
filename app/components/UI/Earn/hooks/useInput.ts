import BN4 from 'bnjs4';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import {
  balanceToFiatNumber,
  fiatNumberToTokenMinimalUnit,
  fromTokenMinimalUnit,
  renderFromTokenMinimalUnit,
  toTokenMinimalUnit,
} from '../../../../util/number';
import { selectChainId } from '../../../../selectors/networkController';
import { selectStablecoinLendingEnabledFlag } from '../selectors/featureFlags';
import { Keys } from '../../../Base/Keypad/constants';
import type { QuickAmount } from '../types/lending.types';

export interface InputHandlerParams {
  balance: string;
  decimals: number;
  ticker: string;
  conversionRate: number;
  exchangeRate: number;
}

const MAX_DIGITS = 12;
const MAX_FRACTION_DIGITS = 5;

const useInputHandler = ({
  balance,
  decimals = 18,
  ticker = 'ETH',
  exchangeRate = 1,
  conversionRate,
}: InputHandlerParams) => {
  // the asset ui amount, lowest possible amount is < 0.00001 which is NaN
  const [amountToken, setAmountToken] = useState('0');
  // the asset minimal unit amount, regardless of the ui amount, this will be most accurate
  const [amountTokenMinimalUnit, setAmountTokenMinimalUnit] = useState<BN4>(
    new BN4(0),
  );
  // the converted fiat number string i.e. 2.12
  const [amountFiatNumber, setAmountFiatNumber] = useState('0');
  // currency toggle between fiat / token as primary
  const [isFiat, setIsFiat] = useState<boolean>(false);
  // the current selected currency in app settings
  const currentCurrency = useSelector(selectCurrentCurrency);
  // the current selected chain id
  const chainId = useSelector(selectChainId);
  // Stablecoin lending feature flag
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

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
      const balanceFiatNumber = balanceToFiatNumber(
        value,
        conversionRate,
        exchangeRate,
        2,
      ).toString();
      setAmountFiatNumber(balanceFiatNumber);
    },
    [conversionRate, exchangeRate, decimals],
  );

  const handleFiatInput = useCallback(
    (value: string) => {
      const tokenMinimalUnit = fiatNumberToTokenMinimalUnit(
        value,
        conversionRate,
        exchangeRate,
        decimals,
      ) as BN4;
      const tokenValue = renderFromTokenMinimalUnit(
        tokenMinimalUnit.toString(),
        decimals,
        5,
      );
      setAmountFiatNumber(value);
      setAmountToken(tokenValue);
      setAmountTokenMinimalUnit(tokenMinimalUnit);
    },
    [conversionRate, decimals, exchangeRate],
  );

  const handleKeypadChange = useCallback(
    ({ value, pressedKey }: { value: string; pressedKey: string }) => {
      const digitsOnly = value.replace(/[^0-9.]/g, '');
      const [whole = '', fraction = ''] = digitsOnly.split('.');
      const totalDigits = whole.length + fraction.length;
      const isValueNaN = isNaN(parseFloat(value));

      if (
        pressedKey === Keys.Back ||
        isValueNaN ||
        (totalDigits <= MAX_DIGITS &&
          fraction.length <= MAX_FRACTION_DIGITS &&
          value !== amountToken)
      ) {
        if (isValueNaN) {
          if (pressedKey === Keys.Period) {
            value = '0.';
          } else if (/^[0-9]$/.test(pressedKey)) {
            value = pressedKey;
          } else {
            value = '0';
          }
        }
        isFiat ? handleFiatInput(value) : handleTokenInput(value);
      }
    },
    [handleTokenInput, handleFiatInput, isFiat, amountToken],
  );

  const handleCurrencySwitch = useCallback(() => {
    setIsFiat(!isFiat);
  }, [isFiat]);

  const percentageOptions: QuickAmount[] = [
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
      const newTokenAmount = renderFromTokenMinimalUnit(
        amountPercentage,
        decimals,
        5,
      );
      const newBalanceFiatNumber = balanceToFiatNumber(
        fromTokenMinimalUnit(amountPercentage, decimals),
        conversionRate,
        exchangeRate,
        2,
      );
      setAmountToken(newTokenAmount);
      setAmountTokenMinimalUnit(amountPercentage);
      setAmountFiatNumber(newBalanceFiatNumber.toString());
    },
    [balanceMinimalUnit, conversionRate, decimals, exchangeRate],
  );

  const handleMaxInput = useCallback(
    (maxMinimalUnit: BN4) => {
      const tokenValue = renderFromTokenMinimalUnit(
        maxMinimalUnit,
        decimals,
        5,
      );
      const fiatValue = balanceToFiatNumber(
        fromTokenMinimalUnit(maxMinimalUnit, decimals),
        conversionRate,
        exchangeRate,
        2,
      ).toString();
      setAmountTokenMinimalUnit(maxMinimalUnit);
      setAmountToken(tokenValue);
      setAmountFiatNumber(fiatValue);
    },
    [conversionRate, decimals, exchangeRate],
  );

  const currencyToggleValue = useMemo(() => {
    const upperCaseCurrentCurrency = currentCurrency.toUpperCase();
    let currencySymbol = '';
    let currencyTicker = ` ${currentCurrency.toUpperCase()}`;
    if (upperCaseCurrentCurrency === 'USD') {
      currencySymbol = '$';
      currencyTicker = '';
    }
    const amountTokenText = `${amountToken} ${ticker}`;
    const amountFiatText = isStablecoinLendingEnabled
      ? `${currencySymbol}${amountFiatNumber}${currencyTicker}`
      : `${amountFiatNumber} ${currentCurrency.toUpperCase()}`;
    return isFiat ? amountTokenText : amountFiatText;
  }, [
    isFiat,
    amountToken,
    ticker,
    amountFiatNumber,
    currentCurrency,
    isStablecoinLendingEnabled,
  ]);

  useEffect(() => {
    setAmountToken('0');
    setAmountTokenMinimalUnit(new BN4(0));
    setAmountFiatNumber('0');
  }, [ticker, chainId]);

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
    handleMaxInput,
  };
};

export default useInputHandler;
