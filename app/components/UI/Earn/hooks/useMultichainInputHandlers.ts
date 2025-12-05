import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { CaipAssetType } from '@metamask/utils';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { addCurrencySymbol } from '../../../../util/number';
import { Keys } from '../../../Base/Keypad/constants';
import { EarnTokenDetails } from '../types/lending.types';

interface EvmInputHandlers {
  isFiat: boolean;
  currencyToggleValue: string;
  handleKeypadChange: (params: { value: string; pressedKey: string }) => void;
  handleCurrencySwitch: () => void;
  handleQuickAmountPress: (params: { value: number }) => void;
  handleTokenInput: (value: string) => void;
  handleFiatInput: (value: string) => void;
  amountToken: string;
  amountFiatNumber: string;
  currentCurrency: string;
}

interface UseNonEvmInputEnhancerProps {
  earnToken: EarnTokenDetails;
  evmHandlers: EvmInputHandlers;
}

/**
 * Hook that provides multichain-aware input handlers.
 * Enhances EVM input handlers with non-EVM chain support,
 * handling fiat conversion using multichain asset rates.
 */
const useMultichainInputHandlers = ({
  earnToken,
  evmHandlers,
}: UseNonEvmInputEnhancerProps) => {
  const {
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
  } = evmHandlers;

  // Non-EVM chain support: get multichain asset rates for fiat conversion
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const isNonEvm = useMemo(
    () => isNonEvmChainId(earnToken?.chainId ?? ''),
    [earnToken?.chainId],
  );

  const nonEvmFiatRate = useMemo(() => {
    if (!isNonEvm || !earnToken?.address) return undefined;
    const rate = multichainAssetsRates?.[earnToken.address as CaipAssetType];
    return rate?.rate ? Number(rate.rate) : undefined;
  }, [isNonEvm, earnToken?.address, multichainAssetsRates]);

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

  // Wrapper for token input that clears the typed fiat value
  const handleTokenInput = useCallback(
    (value: string) => {
      setNonEvmTypedFiatValue(null);
      evmHandleTokenInput(value);
    },
    [evmHandleTokenInput],
  );

  // Wrapper for quick amount press that clears the typed fiat value
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
      // Convert fiat to token: tokenAmount = fiatValue / rate
      const fiatValue = parseFloat(value) || 0;
      const tokenValue = fiatValue / nonEvmFiatRate;
      const tokenValueString = tokenValue.toFixed(5);
      // Use the token input handler with the converted value (without clearing typed fiat)
      evmHandleTokenInput(tokenValueString);
    },
    [nonEvmFiatRate, evmHandleFiatInput, evmHandleTokenInput],
  );

  // Select the appropriate fiat input handler
  const handleFiatInput = isNonEvm ? nonEvmHandleFiatInput : evmHandleFiatInput;

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
          if (pressedKey === Keys.Period) {
            value = '0.';
          } else if (/^[0-9]$/.test(pressedKey)) {
            value = pressedKey;
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

  // Helper to clear typed fiat value (for external use like handleMax)
  const clearNonEvmTypedFiatValue = useCallback(() => {
    setNonEvmTypedFiatValue(null);
  }, []);

  return {
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
  };
};

export default useMultichainInputHandlers;
