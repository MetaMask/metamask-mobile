import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { useLiveTokenFiatRate } from '../useLiveTokenFiatRate';
import type { BridgeToken } from '../../types';
import { formatTokenInputAmountFromFiat } from '../../utils/sourceAmountInputMode';
import {
  LIMIT_ORDER_PRICE_DECIMALS,
  formatLimitOrderFiatInputPriceFromTokenAmount,
  formatLimitOrderFiatPriceFromTokenAmount,
  getLimitOrderFiatPriceDecimals,
  roundLimitOrderMarketFiatToInput,
} from '../../utils/limitOrders/formatLimitOrderFiatPrice';
import {
  getIsSwapsLimitOrderStablecoin,
  getSwapsLimitOrderDefaultPriceMode,
} from '../../utils/limitOrders/getSwapsLimitOrderDefaultPriceMode';
import { getSwapsLimitOrderPriceComparisonDirection } from '../../utils/limitOrders/getSwapsLimitOrderPriceComparisonDirection';
import { getSwapsLimitOrderPriceFromMarketPercent } from '../../utils/limitOrders/getSwapsLimitOrderPriceFromMarketPercent';
import { formatLimitOrderQuickPrice } from '../../utils/limitOrders/formatLimitOrderQuickPrice';
import { getSwapsLimitOrderPriceMarketComparison } from '../../utils/limitOrders/getSwapsLimitOrderPriceMarketComparison';
import { getSwapsLimitOrderSecondaryValue } from '../../utils/limitOrders/getSwapsLimitOrderSecondaryValue';
import { isSwapsLimitOrderPriceWithinMarketPercent } from '../../utils/limitOrders/isSwapsLimitOrderPriceWithinMarketPercent';
import {
  getInitialLimitOrderPriceAdjustState,
  limitOrderPriceAdjustReducer,
} from '../../reducers/limitOrderPriceAdjustReducer';
import {
  LIMIT_ORDER_NEAR_MARKET_PERCENT,
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
  const defaultPriceModeKey = [
    sourceToken?.chainId,
    sourceToken?.address,
    destToken?.chainId,
    destToken?.address,
    defaultExecutionType,
    defaultIsLimitFiatMode,
  ].join(':');
  const previousDefaultPriceModeKeyRef = useRef(defaultPriceModeKey);
  const isDefaultPriceModeResetPending =
    previousDefaultPriceModeKeyRef.current !== defaultPriceModeKey;
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
    hasUserEditedLimitPrice,
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
  // Precision of the limit price, shared by Market, the percent presets, the
  // keypad and the market comparison. A fiat price follows the market price so
  // that a cheap quoted token is not rounded to cents; a counter-token price
  // is a rate, so it is not bound by the counter token's decimals.
  const fiatPriceDecimals = getLimitOrderFiatPriceDecimals(quotedFiatRate);
  const limitPriceDecimals = isLimitFiatMode
    ? fiatPriceDecimals
    : LIMIT_ORDER_PRICE_DECIMALS;

  const handleLimitPriceChange = useCallback((value: string | undefined) => {
    dispatch({ type: 'setLimitPrice', limitPrice: value });
  }, []);

  // Presets (Market / percent buttons) and committed custom percents all
  // derive their price from this. The result is capped to a fixed number of
  // significant digits regardless of the counter token's smart-contract
  // decimals, so quick-picked prices stay readable. Manually typing into the
  // price input afterwards goes through `handleLimitPriceChange` instead, and
  // is not subject to this cap.
  const getLimitPriceFromSignedPercent = useCallback(
    (signedPercent: number) =>
      formatLimitOrderQuickPrice(
        getSwapsLimitOrderPriceFromMarketPercent({
          counterFiatRate,
          decimals: limitPriceDecimals,
          isLimitFiatMode,
          marketFiat: quotedFiatRate,
          signedPercent,
        }),
      ),
    [counterFiatRate, isLimitFiatMode, limitPriceDecimals, quotedFiatRate],
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

    // A 0% offset is market, so it's treated the same as the market preset.
    dispatch({
      type: 'commitCustomPercent',
      limitPrice: nextLimitPrice,
      isTrackingMarket: magnitude.isZero(),
      customValue: magnitude.toString(),
    });
  }, [customValue, getLimitPriceFromSignedPercent, isCustomActive, isSell]);

  // A new pair starts over on the side and denomination that pair defaults to,
  // which is also what makes a source/dest flip land on the right ones.
  useEffect(() => {
    previousDefaultPriceModeKeyRef.current = defaultPriceModeKey;
    dispatch({
      type: 'reset',
      executionType: defaultExecutionType,
      isLimitFiatMode: defaultIsLimitFiatMode,
    });
  }, [defaultPriceModeKey, defaultExecutionType, defaultIsLimitFiatMode]);

  // Wait for a token-pair reset before seeding. A cold Limit deeplink can
  // receive ETH/mUSD after mount; seeding in that transition render would use
  // the stale buy mode and incorrectly price mUSD ($1) instead of ETH.
  useEffect(() => {
    if (
      isDefaultPriceModeResetPending ||
      !isTrackingMarket ||
      limitPrice !== undefined
    ) {
      return;
    }

    const nextLimitPrice = getLimitPriceFromSignedPercent(0);
    if (nextLimitPrice === undefined) {
      return;
    }

    dispatch({
      type: 'seedFromMarket',
      limitPrice: nextLimitPrice,
      executionType,
      isLimitFiatMode,
    });
  }, [
    executionType,
    getLimitPriceFromSignedPercent,
    isDefaultPriceModeResetPending,
    isLimitFiatMode,
    isTrackingMarket,
    limitPrice,
  ]);

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
        formatLimitOrderQuickPrice(
          isLimitFiatMode
            ? formatTokenInputAmountFromFiat({
                fiatAmount: currentLimitPrice,
                tokenFiatRate: counterFiatRate,
                tokenDecimals: LIMIT_ORDER_PRICE_DECIMALS,
              })
            : formatLimitOrderFiatInputPriceFromTokenAmount(
                currentLimitPrice,
                counterFiatRate,
                fiatPriceDecimals,
              ),
        ),
    });
  }, [
    canToggleLimitPrice,
    counterFiatRate,
    fiatPriceDecimals,
    isLimitFiatMode,
  ]);

  const secondaryValue = getSwapsLimitOrderSecondaryValue({
    counterFiatRate,
    counterTokenSymbol: counterToken?.symbol,
    currentCurrency,
    fiatDecimals: fiatPriceDecimals,
    isLimitFiatMode,
    limitPrice,
  });

  const limitFiat = isLimitFiatMode
    ? limitPrice
    : formatLimitOrderFiatPriceFromTokenAmount(limitPrice, counterFiatRate);
  const comparisonMarketFiat = isLimitFiatMode
    ? roundLimitOrderMarketFiatToInput(quotedFiatRate, fiatPriceDecimals)
    : quotedFiatRate;
  const marketComparison = getSwapsLimitOrderPriceMarketComparison({
    limitFiat,
    marketFiat: comparisonMarketFiat,
  });
  const isTriggerPriceNearMarket =
    hasUserEditedLimitPrice &&
    isSwapsLimitOrderPriceWithinMarketPercent({
      price: limitFiat,
      marketPrice: comparisonMarketFiat,
      percent: LIMIT_ORDER_NEAR_MARKET_PERCENT,
    });
  const priceComparisonDirection = getSwapsLimitOrderPriceComparisonDirection({
    limitFiat,
    marketFiat: comparisonMarketFiat,
    executionType,
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
    isTriggerPriceNearMarket,
    executionType,
    limitPrice,
    limitPriceDecimals,
    marketComparison,
    priceComparisonDirection,
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
