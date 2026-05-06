import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { getCurrencySymbol } from '../../../../../util/number/bigint';
import { MAX_INPUT_LENGTH } from '../../components/TokenInputArea';
import { BridgeToken } from '../../types';
import { formatAmountWithLocaleSeparators } from '../../utils/formatAmountWithLocaleSeparators';
import {
  FIAT_INPUT_DECIMALS,
  formatFiatInputAmount,
  formatSecondaryTokenAmount,
  formatTokenInputAmountFromFiat,
} from '../../utils/sourceAmountInputMode';
import { formatCurrency } from '../../utils/currencyUtils';
import { useSourceAmountCursor } from '../useSourceAmountCursor';
import { useTokenFiatRate } from '../useTokenFiatRate';

const FIAT_KEYPAD_CURRENCY = 'SWAPS_FIAT_INPUT';

export const useSourceAmountInput = ({
  sourceAmount,
  sourceToken,
  onSourceAmountChange,
}: {
  sourceAmount: string | undefined;
  sourceToken: BridgeToken | undefined;
  onSourceAmountChange: (value: string | undefined) => void;
}) => {
  const [isFiatMode, setIsFiatMode] = useState(false);
  const [fiatAmount, setFiatAmount] = useState<string | undefined>();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const fiatRate = useTokenFiatRate(sourceToken);
  const canToggle = Boolean(fiatRate && fiatRate > 0);
  const amount = isFiatMode ? fiatAmount : sourceAmount;
  const isFiatInputChangeRef = useRef(false);

  const handleAmountChange = useCallback(
    (value: string | undefined) => {
      if (!isFiatMode) {
        isFiatInputChangeRef.current = false;
        onSourceAmountChange(value);
        return;
      }

      setFiatAmount(value);
      isFiatInputChangeRef.current = true;
      onSourceAmountChange(
        formatTokenInputAmountFromFiat({
          fiatAmount: value,
          tokenFiatRate: fiatRate,
          tokenDecimals: sourceToken?.decimals,
        }),
      );
    },
    [fiatRate, isFiatMode, onSourceAmountChange, sourceToken?.decimals],
  );

  const {
    sourceSelection: selection,
    handleSourceSelectionChange: handleSelectionChange,
    handleKeypadChange,
    resetSourceAmountCursorPosition,
    setSourceAmountCursorPositionToEnd,
  } = useSourceAmountCursor({
    sourceAmount: amount,
    sourceTokenDecimals: isFiatMode
      ? FIAT_INPUT_DECIMALS
      : sourceToken?.decimals,
    maxInputLength: MAX_INPUT_LENGTH,
    onSourceAmountChange: handleAmountChange,
  });

  // If price data disappears while fiat mode is active, fall back to token mode
  // so the input never accepts fiat values that cannot be converted reliably.
  useEffect(() => {
    if (canToggle || !isFiatMode) {
      return;
    }

    resetSourceAmountCursorPosition();
    setIsFiatMode(false);
    setFiatAmount(undefined);
    isFiatInputChangeRef.current = false;
  }, [canToggle, isFiatMode, resetSourceAmountCursorPosition]);

  // Keep the visible fiat amount aligned when the canonical token amount
  // changes outside fiat typing, such as Max, presets, token, or rate updates.
  useEffect(() => {
    if (!isFiatMode || !canToggle) {
      return;
    }

    const nextFiatAmount = formatFiatInputAmount(sourceAmount, fiatRate);
    if (isFiatInputChangeRef.current) {
      const tokenAmountFromFiatInput = formatTokenInputAmountFromFiat({
        fiatAmount,
        tokenFiatRate: fiatRate,
        tokenDecimals: sourceToken?.decimals,
      });
      if (tokenAmountFromFiatInput === sourceAmount) {
        isFiatInputChangeRef.current = false;
      }
      return;
    }

    if (nextFiatAmount === fiatAmount) {
      return;
    }

    setFiatAmount(nextFiatAmount);
    resetSourceAmountCursorPosition();
  }, [
    canToggle,
    fiatAmount,
    fiatRate,
    isFiatMode,
    resetSourceAmountCursorPosition,
    sourceAmount,
    sourceToken?.decimals,
  ]);

  const syncFiatAmountToTokenAmount = useCallback(
    (tokenAmount: string | undefined) => {
      resetSourceAmountCursorPosition();
      isFiatInputChangeRef.current = false;
      if (isFiatMode) {
        setFiatAmount(formatFiatInputAmount(tokenAmount, fiatRate));
      }
    },
    [fiatRate, isFiatMode, resetSourceAmountCursorPosition],
  );

  const resetToTokenMode = useCallback(() => {
    resetSourceAmountCursorPosition();
    setIsFiatMode(false);
    setFiatAmount(undefined);
    isFiatInputChangeRef.current = false;
  }, [resetSourceAmountCursorPosition]);

  const handleToggle = useCallback(() => {
    if (!canToggle) {
      return;
    }

    if (isFiatMode) {
      setSourceAmountCursorPositionToEnd(sourceAmount);
      setIsFiatMode(false);
      setFiatAmount(undefined);
      isFiatInputChangeRef.current = false;
      return;
    }

    const nextFiatAmount = formatFiatInputAmount(sourceAmount, fiatRate);
    setSourceAmountCursorPositionToEnd(nextFiatAmount);
    setFiatAmount(nextFiatAmount);
    setIsFiatMode(true);
  }, [
    canToggle,
    fiatRate,
    isFiatMode,
    setSourceAmountCursorPositionToEnd,
    sourceAmount,
  ]);

  const secondaryValue = useMemo(() => {
    if (isFiatMode) {
      if (!sourceToken) {
        return null;
      }

      if (sourceAmount && Number(sourceAmount) > 0) {
        const formattedSourceAmount = formatSecondaryTokenAmount(sourceAmount);

        return `${formatAmountWithLocaleSeparators(
          formattedSourceAmount ?? sourceAmount,
        )} ${sourceToken.symbol}`;
      }

      return `0 ${sourceToken.symbol}`;
    }

    if (!canToggle) {
      return null;
    }

    return sourceAmount && Number(sourceAmount) > 0
      ? undefined
      : formatCurrency(0, currentCurrency, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
  }, [canToggle, currentCurrency, isFiatMode, sourceAmount, sourceToken]);

  const inputPrefix = isFiatMode
    ? getCurrencySymbol((currentCurrency || 'usd').toLowerCase())
    : undefined;

  return {
    amount,
    balanceCheckAmount: sourceAmount,
    canToggle,
    handleFocus: () => setSourceAmountCursorPositionToEnd(amount),
    handleKeypadChange,
    handleSelectionChange,
    handleToggle,
    inputPrefix,
    isFiatMode,
    keypadCurrency: isFiatMode
      ? FIAT_KEYPAD_CURRENCY
      : sourceToken?.symbol || 'ETH',
    keypadDecimals: isFiatMode
      ? FIAT_INPUT_DECIMALS
      : (sourceToken?.decimals ?? Infinity),
    keypadValue: amount || '0',
    resetToTokenMode,
    secondaryValue,
    selection,
    syncFiatAmountToTokenAmount,
  };
};
