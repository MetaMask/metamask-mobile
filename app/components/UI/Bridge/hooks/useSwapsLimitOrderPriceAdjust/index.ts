import { useCallback, useEffect, useReducer } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { useLiveTokenFiatRate } from '../useLiveTokenFiatRate';
import type { BridgeToken } from '../../types';
import { formatTokenInputAmountFromFiat } from '../../utils/sourceAmountInputMode';
import { formatLimitOrderFiatPriceFromTokenAmount } from '../../utils/limitOrders/formatLimitOrderFiatPrice';
import {
  getIsSwapsLimitOrderStablecoin,
  getSwapsLimitOrderDefaultPriceMode,
} from '../../utils/limitOrders/getSwapsLimitOrderDefaultPriceMode';
import { getSwapsLimitOrderPriceFromMarketPercent } from '../../utils/limitOrders/getSwapsLimitOrderPriceFromMarketPercent';
import { getSwapsLimitOrderPriceMarketComparison } from '../../utils/limitOrders/getSwapsLimitOrderPriceMarketComparison';
import { getSwapsLimitOrderSecondaryValue } from '../../utils/limitOrders/getSwapsLimitOrderSecondaryValue';
import {
  getInitialLimitOrderPriceAdjustState,
  limitOrderPriceAdjustReducer,
} from '../../reducers/limitOrderPriceAdjustReducer';
import {
  LIMIT_ORDER_CUSTOM_PERCENT_MAX,
  LimitOrderExecutionType,
} from '../../constants/limitOrders';

interface Params {
  destToken: BridgeToken | undefined;
  sourceToken: BridgeToken | undefined;
}

export const useSwapsLimitOrderPriceAdjust = ({
  destToken,
  sourceToken,
}: Params) => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const {
    executionType: defaultExecutionType,
    isLimitFiatMode: defaultIsLimitFiatMode,
  } = getSwapsLimitOrderDefaultPriceMode({ destToken, sourceToken });
  const [state, dispatch] = useReducer(
    limitOrderPriceAdjustReducer,
    {
      executionType: defaultExecutionType,
      isLimitFiatMode: defaultIsLimitFiatMode,
    },
    getInitialLimitOrderPriceAdjustState,
  );
  const {
    customValue,
    isCustomActive,
    isLimitFiatMode,
    isTrackingMarket,
    limitPrice,
    executionType,
  } = state;

  const destFiatRate = useLiveTokenFiatRate(destToken);
  const sourceFiatRate = useLiveTokenFiatRate(sourceToken);
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

    // Cap the custom percent offset, discarding any larger value the user typed.
    const cappedMagnitude = magnitude.isGreaterThan(
      LIMIT_ORDER_CUSTOM_PERCENT_MAX,
    )
      ? new BigNumber(LIMIT_ORDER_CUSTOM_PERCENT_MAX)
      : magnitude;

    const nextLimitPrice = getLimitPriceFromSignedPercent(
      isSell
        ? cappedMagnitude.toNumber()
        : cappedMagnitude.negated().toNumber(),
    );
    if (nextLimitPrice === undefined) {
      return;
    }

    // A 0% offset is market, so it's treated the same as the market preset.
    dispatch({
      type: 'commitCustomPercent',
      limitPrice: nextLimitPrice,
      isTrackingMarket: cappedMagnitude.isZero(),
      customValue: cappedMagnitude.toString(),
    });
  }, [customValue, getLimitPriceFromSignedPercent, isCustomActive, isSell]);

  // A new pair starts over on the side and denomination that pair defaults to,
  // which is also what makes a source/dest flip land on the right ones.
  useEffect(() => {
    dispatch({
      type: 'reset',
      executionType: defaultExecutionType,
      isLimitFiatMode: defaultIsLimitFiatMode,
    });
  }, [
    defaultExecutionType,
    defaultIsLimitFiatMode,
    destToken?.address,
    destToken?.chainId,
    sourceToken?.address,
    sourceToken?.chainId,
  ]);

  // Seeds the limit price from the live market rate exactly once whenever
  // there isn't one yet (initial mount, a new token pair, or after flipping
  // sides). Once seeded, the price stays put even as the market rate keeps
  // moving; only the market-comparison label below keeps reflecting the live
  // difference between the fixed price and the current market rate.
  useEffect(() => {
    if (!isTrackingMarket || limitPrice !== undefined) {
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
  }, [getLimitPriceFromSignedPercent, isTrackingMarket, limitPrice]);

  const canToggleLimitPrice = Boolean(
    destFiatRate && destFiatRate > 0 && sourceFiatRate && sourceFiatRate > 0,
  );

  const handleQuoteUnitPress = useCallback(() => {
    // Flipping the side swaps which token the price is expressed in, so the
    // denomination follows whichever token becomes the counter token.
    const nextCounterToken = isSell ? sourceToken : destToken;
    dispatch({
      type: 'flipSide',
      isLimitFiatMode: !getIsSwapsLimitOrderStablecoin(nextCounterToken),
    });
  }, [destToken, isSell, sourceToken]);

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
  const marketComparison = getSwapsLimitOrderPriceMarketComparison({
    limitFiat,
    marketFiat: quotedFiatRate,
    executionType,
    threshold: 0,
  });

  return {
    commitCustomPercent,
    counterFiatRate,
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
    quotedToken,
    secondaryValue,
    value: limitPrice ?? '',
  };
};
