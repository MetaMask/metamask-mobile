import { useCallback, useMemo, useRef } from 'react';
import {
  DECIMAL_PRECISION_CONFIG,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  LIMIT_PRICE_CONFIG,
  MAX_PERPS_INPUT_DIGITS,
} from '../constants/perpsConfig';
import { usePerpsLivePrices, usePerpsTopOfBook } from './stream';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import {
  formatLimitPriceInput,
  formatWithSignificantDigits,
} from '../utils/formatUtils';
import { getLimitPriceDirectionWarning } from '../utils/limitPriceFarFromMarket';
import {
  calculateLimitPriceForPercentage,
  isPriceOutsideDeviationBand,
  resolveOracleReferencePrice,
} from '../utils/orderUtils';

export interface PerpsLimitPricePreset {
  label: string;
  testID: string;
  onPress: () => void;
}

/**
 * Preset test IDs differ per surface: the inline close sheet labels one
 * top-of-book button, while the modal has distinct bid and ask buttons.
 */
export interface PerpsLimitPricePresetTestIDs {
  mid: string;
  bid: string;
  ask: string;
  percentPrefix: string;
}

export interface UsePerpsLimitPriceInputParams {
  asset: string;
  currentPrice: number;
  /** Direction of the order being placed, i.e. the opposite of a closing position. */
  direction: 'long' | 'short';
  limitPrice: string;
  setLimitPrice: (price: string) => void;
  testIDs: PerpsLimitPricePresetTestIDs;
  /**
   * Applies HyperLiquid's max-deviation gate. Opening a limit order is left to
   * the order form's own validation.
   */
  isClosingPosition?: boolean;
  /** Unsubscribes from live price and book data while a modal is hidden. */
  enabled?: boolean;
}

export interface UsePerpsLimitPriceInputResult {
  /** Live mid, falling back to the price the caller passed in. */
  currentPrice: number;
  formattedLimitPrice: string;
  presets: PerpsLimitPricePreset[];
  /** Price sits outside the venue's accepted band, which blocks submission. */
  exceedsMaxDeviation: boolean;
  /** Non-blocking notice that the price is on the unfavourable side of market. */
  directionWarning: string;
  /** The deviation error when present, otherwise the direction warning. */
  error: string;
  hasError: boolean;
  handleKeypadChange: (input: { value: string; valueAsNumber: number }) => void;
  trackInputMethod: () => void;
  resetInputMethod: () => void;
}

/**
 * Limit price entry shared by the close-position sheet, which edits the order's
 * price inline, and `PerpsLimitPriceBottomSheet`, which edits a draft its
 * parent confirms. Owns the presets, the keypad contract, and the price
 * validation so the two surfaces cannot drift apart.
 */
export function usePerpsLimitPriceInput({
  asset,
  currentPrice: passedCurrentPrice,
  direction,
  limitPrice,
  setLimitPrice,
  testIDs,
  isClosingPosition = false,
  enabled = true,
}: UsePerpsLimitPriceInputParams): UsePerpsLimitPriceInputResult {
  const { track } = usePerpsEventTracking();
  const inputMethodRef = useRef<string | null>(null);

  const priceData = usePerpsLivePrices({
    symbols: enabled ? [asset] : [],
    throttleMs: 1000,
  });
  const currentPriceData = priceData[asset];
  const currentPrice = currentPriceData?.price
    ? Number.parseFloat(currentPriceData.price)
    : passedCurrentPrice;

  const referencePrice = resolveOracleReferencePrice(
    currentPriceData?.markPrice,
    currentPrice,
  );

  const topOfBook = usePerpsTopOfBook({ symbol: enabled ? asset : '' });
  const isLong = direction === 'long';

  // Destructured so an inline `testIDs` literal from a caller cannot rebuild
  // the preset list on every render.
  const {
    mid: midTestID,
    bid: bidTestID,
    ask: askTestID,
    percentPrefix: percentTestIDPrefix,
  } = testIDs;

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      const digitCount = (value.match(/\d/g) || []).length;
      if (digitCount > MAX_PERPS_INPUT_DIGITS) {
        return;
      }
      setLimitPrice(value || '');
      inputMethodRef.current = PERPS_EVENT_VALUE.INPUT_METHOD.KEYBOARD;
    },
    [setLimitPrice],
  );

  const applyLimitPrice = useCallback(
    (price: number, method: string) => {
      setLimitPrice(
        formatWithSignificantDigits(
          price,
          DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
        ).value.toString(),
      );
      inputMethodRef.current = method;
    },
    [setLimitPrice],
  );

  const presets = useMemo(() => {
    const percentagePresets = isLong
      ? LIMIT_PRICE_CONFIG.LongPresets
      : LIMIT_PRICE_CONFIG.ShortPresets;

    const topOfBookPrice = isLong ? topOfBook?.bestBid : topOfBook?.bestAsk;
    const parsedTopOfBook = topOfBookPrice
      ? Number.parseFloat(topOfBookPrice)
      : currentPrice;

    const applyPercentage = (percentage: number) => {
      const calculated = calculateLimitPriceForPercentage(
        limitPrice,
        currentPrice,
        percentage,
      );
      if (!calculated) {
        return;
      }
      applyLimitPrice(
        Number.parseFloat(calculated),
        PERPS_EVENT_VALUE.INPUT_METHOD.PERCENTAGE_BUTTON,
      );
    };

    return [
      {
        label: strings('perps.order.limit_price_modal.mid_price'),
        testID: midTestID,
        onPress: () => {
          if (currentPrice) {
            applyLimitPrice(
              currentPrice,
              PERPS_EVENT_VALUE.INPUT_METHOD.PRESET,
            );
          }
        },
      },
      {
        label: isLong
          ? strings('perps.order.limit_price_modal.bid_price')
          : strings('perps.order.limit_price_modal.ask_price'),
        testID: isLong ? bidTestID : askTestID,
        onPress: () => {
          if (parsedTopOfBook) {
            applyLimitPrice(
              parsedTopOfBook,
              PERPS_EVENT_VALUE.INPUT_METHOD.PRESET,
            );
          }
        },
      },
      ...percentagePresets.map((percentage) => ({
        label: `${percentage > 0 ? '+' : ''}${percentage}%`,
        testID: `${percentTestIDPrefix}${percentage}`,
        onPress: () => applyPercentage(percentage),
      })),
    ];
  }, [
    applyLimitPrice,
    askTestID,
    bidTestID,
    currentPrice,
    isLong,
    limitPrice,
    midTestID,
    percentTestIDPrefix,
    topOfBook,
  ]);

  const formattedLimitPrice = useMemo(
    () => formatLimitPriceInput(limitPrice),
    [limitPrice],
  );

  const exceedsMaxDeviation = useMemo(() => {
    if (!isClosingPosition) {
      return false;
    }
    return isPriceOutsideDeviationBand(
      Number.parseFloat(limitPrice.replace(/[$,]/g, '')),
      referencePrice,
      LIMIT_PRICE_CONFIG.MaxDeviationFromMarket,
    );
  }, [isClosingPosition, limitPrice, referencePrice]);

  const directionWarning = useMemo(
    () =>
      getLimitPriceDirectionWarning({
        limitPrice,
        currentPrice,
        direction,
        isClosingPosition,
      }),
    [currentPrice, direction, isClosingPosition, limitPrice],
  );

  const error = exceedsMaxDeviation
    ? strings('perps.order.limit_price_modal.limit_price_too_far')
    : directionWarning;

  const trackInputMethod = useCallback(() => {
    if (!inputMethodRef.current) {
      return;
    }
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.SETTING_CHANGED,
      [PERPS_EVENT_PROPERTY.SETTING_TYPE]: 'limit_price',
      [PERPS_EVENT_PROPERTY.INPUT_METHOD]: inputMethodRef.current,
      [PERPS_EVENT_PROPERTY.ASSET]: asset,
      [PERPS_EVENT_PROPERTY.DIRECTION]: direction,
    });
    inputMethodRef.current = null;
  }, [asset, direction, track]);

  const resetInputMethod = useCallback(() => {
    inputMethodRef.current = null;
  }, []);

  return {
    currentPrice,
    formattedLimitPrice,
    presets,
    exceedsMaxDeviation,
    directionWarning,
    error,
    hasError: Boolean(error),
    handleKeypadChange,
    trackInputMethod,
    resetInputMethod,
  };
}
