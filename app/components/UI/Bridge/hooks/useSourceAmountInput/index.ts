import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FeatureId,
  formatAddressToCaipReference,
  getRequestParams,
  getSwapType,
  InputPrimaryDenomination,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import Engine from '../../../../../core/Engine';
import {
  selectBridgeControllerState,
  selectDestToken,
} from '../../../../../core/redux/slices/bridge';
import { getDecimalChainId } from '../../../../../util/networks';
import { MAX_INPUT_LENGTH } from '../../components/TokenInputArea';
import { BridgeToken } from '../../types';
import { formatAmountWithLocaleSeparators } from '../../utils/formatAmountWithLocaleSeparators';
import {
  FIAT_INPUT_DECIMALS,
  formatFiatInputAmount,
  formatSecondaryTokenAmount,
  formatTokenInputAmountFromFiat,
} from '../../utils/sourceAmountInputMode';
import { formatCurrency, getCurrencySymbol } from '../../utils/currencyUtils';
import { useSourceAmountCursor } from '../useSourceAmountCursor';
import { useTokenFiatRate } from '../useTokenFiatRate';

const FIAT_KEYPAD_CURRENCY = 'SWAPS_FIAT_INPUT';
const TOKEN_AMOUNT_DENOMINATION: InputPrimaryDenomination = 'token_amount';
const FIAT_VALUE_DENOMINATION: InputPrimaryDenomination = 'fiat_value';

const getFiatToggleEventProperties = ({
  previousPrimaryDenomination,
  nextPrimaryDenomination,
  sourceToken,
  destToken,
}: {
  previousPrimaryDenomination: InputPrimaryDenomination;
  nextPrimaryDenomination: InputPrimaryDenomination;
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
}) => {
  const srcChainId = sourceToken?.chainId
    ? getDecimalChainId(sourceToken.chainId)
    : undefined;
  const destChainId = destToken?.chainId
    ? getDecimalChainId(destToken.chainId)
    : undefined;
  const requestParams = sourceToken
    ? getRequestParams(
        {
          srcChainId,
          srcTokenAddress: formatAddressToCaipReference(sourceToken.address),
          destChainId,
          destTokenAddress: destToken
            ? formatAddressToCaipReference(destToken.address)
            : undefined,
        },
        destToken?.securityData?.type ?? null,
      )
    : {};

  return {
    ...requestParams,
    swap_type: getSwapType(srcChainId, destChainId),
    previous_primary_denomination: previousPrimaryDenomination,
    new_primary_denomination: nextPrimaryDenomination,
    token_symbol_source: sourceToken?.symbol ?? '',
    token_symbol_destination: destToken?.symbol ?? null,
    feature_id: FeatureId.UNIFIED_SWAP_BRIDGE,
  };
};

export const useSourceAmountInput = ({
  isFiatToggleEnabled,
  sourceAmount,
  sourceToken,
  onSourceAmountChange,
}: {
  isFiatToggleEnabled: boolean;
  sourceAmount: string | undefined;
  sourceToken: BridgeToken | undefined;
  onSourceAmountChange: (value: string | undefined) => void;
}) => {
  const [fiatAmount, setFiatAmount] = useState<string | undefined>();
  const bridgeControllerState = useSelector(selectBridgeControllerState);
  const destToken = useSelector(selectDestToken);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const fiatRate = useTokenFiatRate(sourceToken);
  const inputPrimaryDenomination =
    bridgeControllerState?.inputPrimaryDenomination ??
    TOKEN_AMOUNT_DENOMINATION;
  const canToggle = Boolean(isFiatToggleEnabled && fiatRate && fiatRate > 0);
  // The controller stores the persisted preference, while this local value lets
  // the input react immediately as controller state propagates through Redux.
  const [activeInputPrimaryDenomination, setActiveInputPrimaryDenomination] =
    useState<InputPrimaryDenomination>(inputPrimaryDenomination);
  const isFiatMode =
    activeInputPrimaryDenomination === FIAT_VALUE_DENOMINATION && canToggle;
  const amount = isFiatMode ? fiatAmount : sourceAmount;
  const isFiatInputChangeRef = useRef(false);

  useEffect(() => {
    setActiveInputPrimaryDenomination(inputPrimaryDenomination);
  }, [inputPrimaryDenomination]);

  const setInputPrimaryDenomination = useCallback(
    (
      nextPrimaryDenomination: InputPrimaryDenomination,
      shouldTrackToggle = false,
    ) => {
      const previousPrimaryDenomination = activeInputPrimaryDenomination;
      setActiveInputPrimaryDenomination(nextPrimaryDenomination);
      Engine.context.BridgeController.setInputPrimaryDenomination(
        nextPrimaryDenomination,
      );

      if (
        shouldTrackToggle &&
        previousPrimaryDenomination !== nextPrimaryDenomination
      ) {
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
          UnifiedSwapBridgeEventName.FiatCryptoToggleClicked,
          getFiatToggleEventProperties({
            previousPrimaryDenomination,
            nextPrimaryDenomination,
            sourceToken,
            destToken,
          }),
        );
      }
    },
    [activeInputPrimaryDenomination, destToken, sourceToken],
  );

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
    setInputPrimaryDenomination(TOKEN_AMOUNT_DENOMINATION);
    setFiatAmount(undefined);
    isFiatInputChangeRef.current = false;
  }, [resetSourceAmountCursorPosition, setInputPrimaryDenomination]);

  const handleToggle = useCallback(() => {
    if (!canToggle) {
      return;
    }

    if (isFiatMode) {
      setSourceAmountCursorPositionToEnd(sourceAmount);
      setInputPrimaryDenomination(TOKEN_AMOUNT_DENOMINATION, true);
      setFiatAmount(undefined);
      isFiatInputChangeRef.current = false;
      return;
    }

    const nextFiatAmount = formatFiatInputAmount(sourceAmount, fiatRate);
    setSourceAmountCursorPositionToEnd(nextFiatAmount);
    setFiatAmount(nextFiatAmount);
    setInputPrimaryDenomination(FIAT_VALUE_DENOMINATION, true);
  }, [
    canToggle,
    fiatRate,
    isFiatMode,
    setInputPrimaryDenomination,
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

    if (!isFiatToggleEnabled) {
      return undefined;
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
  }, [
    canToggle,
    currentCurrency,
    isFiatMode,
    isFiatToggleEnabled,
    sourceAmount,
    sourceToken,
  ]);

  const inputPrefix = isFiatMode
    ? getCurrencySymbol(currentCurrency || 'usd')
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
