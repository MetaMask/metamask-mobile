import { useCallback, useEffect, useReducer } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { useTokenFiatRate } from '../useTokenFiatRate';
import type { BridgeToken } from '../../types';
import {
  formatFiatInputAmount,
  formatTokenInputAmountFromFiat,
} from '../../utils/sourceAmountInputMode';
import { getSwapsLimitOrderPriceFromMarketPercent } from '../../utils/limitOrders/getSwapsLimitOrderPriceFromMarketPercent';
import { getSwapsLimitOrderPriceMarketComparison } from '../../utils/limitOrders/getSwapsLimitOrderPriceMarketComparison';
import { getSwapsLimitOrderSecondaryValue } from '../../utils/limitOrders/getSwapsLimitOrderSecondaryValue';
import {
  initialLimitOrderPriceAdjustState,
  limitOrderPriceAdjustReducer,
} from '../../reducers/limitOrderPriceAdjustReducer';
import { LimitOrderExecutionType } from '../../constants/limitOrders';

interface Params {
  destToken: BridgeToken | undefined;
  destTokenAmount: string | undefined;
  sourceToken: BridgeToken | undefined;
}

export const useSwapsLimitOrderPriceAdjust = ({
  destToken,
  destTokenAmount,
  sourceToken,
}: Params) => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const [state, dispatch] = useReducer(
    limitOrderPriceAdjustReducer,
    initialLimitOrderPriceAdjustState,
  );
  const {
    customValue,
    hasUserEditedLimitPrice,
    isCustomActive,
    isLimitFiatMode,
    limitPrice,
    executionType,
  } = state;

  const destFiatRate = useTokenFiatRate(destToken);
  const sourceFiatRate = useTokenFiatRate(sourceToken);
  const isSell = executionType === LimitOrderExecutionType.SELL;
  const quotedToken = isSell ? sourceToken : destToken;
  const counterToken = isSell ? destToken : sourceToken;
  const quotedFiatRate = isSell ? sourceFiatRate : destFiatRate;
  const counterFiatRate = isSell ? destFiatRate : sourceFiatRate;

  const handleLimitPriceChange = useCallback((value: string | undefined) => {
    dispatch({ type: 'setLimitPrice', limitPrice: value });
  }, []);

  const getLimitPriceFromSignedPercent = useCallback(
    (signedPercent: number) =>
      getSwapsLimitOrderPriceFromMarketPercent({
        counterFiatRate,
        counterTokenDecimals: counterToken?.decimals,
        isLimitFiatMode,
        marketFiat: quotedFiatRate,
        signedPercent,
      }),
    [counterFiatRate, counterToken?.decimals, isLimitFiatMode, quotedFiatRate],
  );

  const handleMarketPress = useCallback(() => {
    dispatch({
      type: 'applyPreset',
      limitPrice: getLimitPriceFromSignedPercent(0),
    });
  }, [getLimitPriceFromSignedPercent]);

  const handlePercentPress = useCallback(
    (percent: number) => {
      dispatch({
        type: 'applyPreset',
        limitPrice: getLimitPriceFromSignedPercent(isSell ? percent : -percent),
      });
    },
    [getLimitPriceFromSignedPercent, isSell],
  );

  const handleCustomPress = useCallback(() => {
    dispatch({ type: 'enterCustom' });
  }, []);

  const handleCustomValueChange = useCallback((value: string | undefined) => {
    dispatch({ type: 'setCustomValue', value });
  }, []);

  const commitCustomPercent = useCallback(() => {
    if (!isCustomActive) {
      return;
    }

    const magnitude = new BigNumber(customValue ?? '');
    if (!magnitude.isFinite() || magnitude.lte(0)) {
      return;
    }

    const nextLimitPrice = getLimitPriceFromSignedPercent(
      isSell ? magnitude.toNumber() : magnitude.negated().toNumber(),
    );
    if (nextLimitPrice === undefined) {
      return;
    }

    dispatch({ type: 'setLimitPrice', limitPrice: nextLimitPrice });
  }, [customValue, getLimitPriceFromSignedPercent, isCustomActive, isSell]);

  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [
    destToken?.address,
    destToken?.chainId,
    sourceToken?.address,
    sourceToken?.chainId,
  ]);

  useEffect(() => {
    if (hasUserEditedLimitPrice || !destTokenAmount) {
      return;
    }

    if (!quotedFiatRate || quotedFiatRate <= 0) {
      return;
    }

    const nextLimitPrice = formatFiatInputAmount('1', quotedFiatRate);
    if (nextLimitPrice === undefined) {
      return;
    }

    dispatch({
      type: 'seedFromMarket',
      limitPrice: nextLimitPrice,
    });
  }, [
    destTokenAmount,
    executionType, // flipSide clears limitPrice even when quotedFiatRate is unchanged
    hasUserEditedLimitPrice,
    quotedFiatRate,
  ]);

  const canToggleLimitPrice = Boolean(
    destFiatRate && destFiatRate > 0 && sourceFiatRate && sourceFiatRate > 0,
  );

  const handleQuoteUnitPress = useCallback(() => {
    dispatch({ type: 'flipSide' });
  }, []);

  const handleAmountTypeTogglePress = useCallback(() => {
    if (!canToggleLimitPrice) {
      return;
    }

    dispatch({
      type: 'toggleFiatMode',
      convertLimitPrice: (currentLimitPrice) =>
        isLimitFiatMode
          ? formatTokenInputAmountFromFiat({
              fiatAmount: currentLimitPrice,
              tokenFiatRate: counterFiatRate,
              tokenDecimals: counterToken?.decimals,
            })
          : formatFiatInputAmount(currentLimitPrice, counterFiatRate),
    });
  }, [
    canToggleLimitPrice,
    counterFiatRate,
    counterToken?.decimals,
    isLimitFiatMode,
  ]);

  const secondaryValue = getSwapsLimitOrderSecondaryValue({
    counterFiatRate,
    counterTokenDecimals: counterToken?.decimals,
    counterTokenSymbol: counterToken?.symbol,
    currentCurrency,
    isLimitFiatMode,
    limitPrice,
  });

  const limitFiat = isLimitFiatMode
    ? limitPrice
    : formatFiatInputAmount(limitPrice, counterFiatRate);
  const marketComparison = getSwapsLimitOrderPriceMarketComparison({
    limitFiat,
    marketFiat: quotedFiatRate,
    executionType,
    threshold: 3,
  });

  return {
    commitCustomPercent,
    counterToken,
    customValue: customValue ?? '',
    handleCustomPress,
    handleCustomValueChange,
    handleLimitPriceChange,
    handleMarketPress,
    handlePercentPress,
    isCustomActive,
    isLimitFiatMode,
    executionType,
    limitPrice,
    marketComparison,
    onAmountTypeTogglePress: canToggleLimitPrice
      ? handleAmountTypeTogglePress
      : undefined,
    onQuoteUnitPress: handleQuoteUnitPress,
    quotedSymbol: quotedToken?.symbol,
    secondaryValue,
    value: limitPrice ?? '',
  };
};
