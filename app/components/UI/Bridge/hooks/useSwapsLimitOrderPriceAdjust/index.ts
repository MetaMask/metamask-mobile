import { useCallback, useEffect, useReducer } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { useTokenFiatRate } from '../useTokenFiatRate';
import type { BridgeToken } from '../../types';
import { formatTokenInputAmountFromFiat } from '../../utils/sourceAmountInputMode';
import { formatLimitOrderFiatPriceFromTokenAmount } from '../../utils/limitOrders/formatLimitOrderFiatPrice';
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
  sourceToken: BridgeToken | undefined;
}

export const useSwapsLimitOrderPriceAdjust = ({
  destToken,
  sourceToken,
}: Params) => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const [state, dispatch] = useReducer(
    limitOrderPriceAdjustReducer,
    initialLimitOrderPriceAdjustState,
  );
  const {
    customValue,
    isCustomActive,
    isLimitFiatMode,
    isTrackingMarket,
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
      isTrackingMarket: true,
    });
  }, [getLimitPriceFromSignedPercent]);

  const handlePercentPress = useCallback(
    (percent: number) => {
      dispatch({
        type: 'applyPreset',
        limitPrice: getLimitPriceFromSignedPercent(isSell ? percent : -percent),
        isTrackingMarket: false,
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
    if (!magnitude.isFinite() || magnitude.isNegative()) {
      dispatch({ type: 'exitCustom' });
      return;
    }

    const nextLimitPrice = getLimitPriceFromSignedPercent(
      isSell ? magnitude.toNumber() : magnitude.negated().toNumber(),
    );
    if (nextLimitPrice === undefined) {
      return;
    }

    // A 0% offset is market, so the price keeps following the live rate.
    dispatch({
      type: 'commitCustomPercent',
      limitPrice: nextLimitPrice,
      isTrackingMarket: magnitude.isZero(),
    });
  }, [customValue, getLimitPriceFromSignedPercent, isCustomActive, isSell]);

  useEffect(() => {
    dispatch({ type: 'reset' });
  }, [
    destToken?.address,
    destToken?.chainId,
    sourceToken?.address,
    sourceToken?.chainId,
  ]);

  // Keeps the limit price on the live market rate for as long as it sits at
  // market, so it refreshes with every market data update instead of only
  // being seeded once.
  useEffect(() => {
    if (!isTrackingMarket) {
      return;
    }

    const nextLimitPrice = getLimitPriceFromSignedPercent(0);
    if (nextLimitPrice === undefined) {
      return;
    }

    dispatch({
      type: 'seedFromMarket',
      limitPrice: nextLimitPrice,
    });
  }, [
    destToken?.address,
    destToken?.chainId,
    executionType, // flipSide clears limitPrice even when quotedFiatRate is unchanged
    getLimitPriceFromSignedPercent,
    isTrackingMarket,
    sourceToken?.address,
    sourceToken?.chainId,
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
          : formatLimitOrderFiatPriceFromTokenAmount(
              currentLimitPrice,
              counterFiatRate,
            ),
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
    : formatLimitOrderFiatPriceFromTokenAmount(limitPrice, counterFiatRate);
  const marketComparison = isTrackingMarket
    ? undefined
    : getSwapsLimitOrderPriceMarketComparison({
        limitFiat,
        marketFiat: quotedFiatRate,
        executionType,
        threshold: 0,
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
