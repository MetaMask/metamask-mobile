import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { CaipAssetType } from '@metamask/utils';
import useBalance from '../../Stake/hooks/useBalance';
import useInputHandler from './useInput';
import { EarnTokenDetails } from '../types/lending.types';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { addCurrencySymbol } from '../../../../util/number';
import { Keys } from '../../../Base/Keypad/constants';

const useEarnWithdrawInputHandlers = ({
  earnToken,
  conversionRate,
  exchangeRate,
}: {
  earnToken: EarnTokenDetails;
  conversionRate: number;
  exchangeRate: number;
}) => {
  const {
    stakedBalanceWei,
    formattedStakedBalanceETH,
    stakedBalanceFiatNumber,
  } = useBalance();

  // Add support for non-EVM chains to get multichain asset rates for fiat conversion
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const isNonEvm = useMemo(
    () => isNonEvmChainId(earnToken?.chainId ?? ''),
    [earnToken?.chainId],
  );

  // Get the direct fiat rate for non-EVM assets (e.g., TRX/USD)
  const nonEvmFiatRate = useMemo(() => {
    if (!isNonEvm || !earnToken?.address) return undefined;
    const rate = multichainAssetsRates?.[earnToken.address as CaipAssetType];
    return rate?.rate ? Number(rate.rate) : undefined;
  }, [isNonEvm, earnToken?.address, multichainAssetsRates]);

  const balanceMinimalUnit = earnToken.isETH
    ? stakedBalanceWei
    : earnToken?.balanceMinimalUnit;

  const {
    amountToken,
    amountTokenMinimalUnit,
    amountFiatNumber: evmAmountFiatNumber,
    isFiat,
    currencyToggleValue: evmCurrencyToggleValue,
    isNonZeroAmount,
    isOverMaximum: isOverMaximumFromInputHandler,
    handleKeypadChange: evmHandleKeypadChange,
    handleCurrencySwitch: evmHandleCurrencySwitch,
    percentageOptions,
    handleQuickAmountPress: evmHandleQuickAmountPress,
    currentCurrency,
    handleTokenInput: evmHandleTokenInput,
    handleFiatInput: evmHandleFiatInput,
  } = useInputHandler({
    balance: balanceMinimalUnit,
    decimals: earnToken.decimals,
    ticker: earnToken.ticker ?? earnToken.symbol,
    conversionRate,
    exchangeRate,
  });

  // For non-EVM chains, track the typed fiat value directly to preserve user input
  const [nonEvmTypedFiatValue, setNonEvmTypedFiatValue] = useState<
    string | null
  >(null);

  // Reset typed fiat value when earnToken changes (mirrors useInput.ts reset behavior)
  useEffect(() => {
    setNonEvmTypedFiatValue(null);
  }, [earnToken?.chainId, earnToken?.ticker]);

  // Reset typed fiat value when switching currency modes
  const handleCurrencySwitch = useCallback(() => {
    setNonEvmTypedFiatValue(null);
    evmHandleCurrencySwitch();
  }, [evmHandleCurrencySwitch]);

  // Token input that clears the typed fiat value
  const handleTokenInput = useCallback(
    (value: string) => {
      setNonEvmTypedFiatValue(null);
      evmHandleTokenInput(value);
    },
    [evmHandleTokenInput],
  );

  // Quick amount press that clears the typed fiat value
  const handleQuickAmountPress = useCallback(
    (params: { value: number }) => {
      setNonEvmTypedFiatValue(null);
      evmHandleQuickAmountPress(params);
    },
    [evmHandleQuickAmountPress],
  );

  // For non-EVM chains override fiat input to convert fiat → token using correct rate
  const nonEvmHandleFiatInput = useCallback(
    (value: string) => {
      if (!nonEvmFiatRate || nonEvmFiatRate <= 0) {
        evmHandleFiatInput(value);
        return;
      }
      // Store the typed fiat value directly for display
      setNonEvmTypedFiatValue(value);
      // Convert fiat to token
      const fiatValue = parseFloat(value) || 0;
      const tokenValue = fiatValue / nonEvmFiatRate;
      const tokenValueString = tokenValue.toFixed(5);
      // Use the token input handler with the converted value (without clearing typed fiat)
      evmHandleTokenInput(tokenValueString);
    },
    [nonEvmFiatRate, evmHandleFiatInput, evmHandleTokenInput],
  );

  // For non-EVM chains override keypad change to use our fiat handler
  const handleKeypadChange = useCallback(
    ({ value, pressedKey }: { value: string; pressedKey: string }) => {
      if (!isNonEvm) {
        evmHandleKeypadChange({ value, pressedKey });
        return;
      }

      // Replicate the validation logic from useInput.ts
      const digitsOnly = value.replace(/[^0-9.]/g, '');
      const [whole = '', fraction = ''] = digitsOnly.split('.');
      const totalDigits = whole.length + fraction.length;
      const isValueNaN = isNaN(parseFloat(value));
      const MAX_DIGITS = 12;
      const MAX_FRACTION_DIGITS = 5;

      if (
        pressedKey === Keys.Back ||
        isValueNaN ||
        (totalDigits <= MAX_DIGITS &&
          fraction.length <= MAX_FRACTION_DIGITS &&
          value !== amountToken)
      ) {
        if (isValueNaN) {
          if (
            pressedKey === digitsOnly[digitsOnly.length - 1] ||
            pressedKey === Keys.Period
          ) {
            value = pressedKey === Keys.Period ? '0.' : pressedKey;
          } else {
            value = '0';
          }
        }
        isFiat ? nonEvmHandleFiatInput(value) : handleTokenInput(value);
      }
    },
    [
      isNonEvm,
      evmHandleKeypadChange,
      isFiat,
      nonEvmHandleFiatInput,
      handleTokenInput,
      amountToken,
    ],
  );

  // For non-EVM chains, recalculate fiat amount using multichain rates
  // When user is typing in fiat mode, preserve their exact input
  const amountFiatNumber = useMemo(() => {
    if (!isNonEvm || !nonEvmFiatRate || nonEvmFiatRate <= 0) {
      return evmAmountFiatNumber;
    }
    // If user typed a fiat value directly, use it
    if (nonEvmTypedFiatValue !== null) {
      return nonEvmTypedFiatValue;
    }
    // Otherwise, calculate from token amount
    const tokenAmount = parseFloat(amountToken) || 0;
    return (tokenAmount * nonEvmFiatRate).toFixed(2);
  }, [
    isNonEvm,
    nonEvmFiatRate,
    amountToken,
    evmAmountFiatNumber,
    nonEvmTypedFiatValue,
  ]);

  // For non-EVM chains calculate currency toggle value
  const currencyToggleValue = useMemo(() => {
    if (!isNonEvm || !nonEvmFiatRate || nonEvmFiatRate <= 0) {
      return evmCurrencyToggleValue;
    }
    const ticker = earnToken?.ticker ?? earnToken?.symbol ?? '';
    const amountTokenText = `${amountToken} ${ticker}`;
    const amountFiatText = addCurrencySymbol(amountFiatNumber, currentCurrency);
    return isFiat ? amountTokenText : amountFiatText;
  }, [
    isNonEvm,
    nonEvmFiatRate,
    evmCurrencyToggleValue,
    earnToken?.ticker,
    earnToken?.symbol,
    amountToken,
    amountFiatNumber,
    currentCurrency,
    isFiat,
  ]);

  // TODO: this does not consider gas fee, as staking does not seem to have one for withdrawal
  // once we use the lending contracts, we may need to consider gas here
  const isOverMaximum = useMemo(
    () => ({
      isOverMaximumEth: isOverMaximumFromInputHandler,
      isOverMaximumToken: isOverMaximumFromInputHandler,
    }),
    [isOverMaximumFromInputHandler],
  );

  // For non-EVM chains calculate balance fiat using multichain rate
  const earnBalanceFiatValue = useMemo(() => {
    if (isNonEvm && nonEvmFiatRate && nonEvmFiatRate > 0) {
      const balanceNumber = parseFloat(earnToken?.balanceFormatted ?? '0') || 0;
      return (balanceNumber * nonEvmFiatRate).toFixed(2);
    }
    return stakedBalanceFiatNumber?.toString();
  }, [
    isNonEvm,
    nonEvmFiatRate,
    earnToken?.balanceFormatted,
    stakedBalanceFiatNumber,
  ]);

  // For non-EVM chains use the token's formatted balance
  const earnBalanceTokenValue = useMemo(() => {
    if (isNonEvm) {
      return earnToken?.balanceFormatted ?? '0';
    }
    return formattedStakedBalanceETH;
  }, [isNonEvm, earnToken?.balanceFormatted, formattedStakedBalanceETH]);

  const earnBalanceValue = isFiat
    ? `${earnBalanceFiatValue} ${currentCurrency.toUpperCase()}`
    : earnBalanceTokenValue;

  return {
    isFiat,
    currentCurrency,
    isNonZeroAmount,
    amountToken,
    amountTokenMinimalUnit,
    amountFiatNumber,
    isOverMaximum,
    handleCurrencySwitch,
    currencyToggleValue,
    percentageOptions,
    handleQuickAmountPress,
    handleKeypadChange,
    earnBalanceValue,
  };
};

export default useEarnWithdrawInputHandlers;
