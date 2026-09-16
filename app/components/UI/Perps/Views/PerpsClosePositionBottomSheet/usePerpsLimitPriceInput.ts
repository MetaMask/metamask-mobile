import { useCallback, useMemo, useRef } from 'react';
import {
  DECIMAL_PRECISION_CONFIG,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import {
  LIMIT_PRICE_CONFIG,
  MAX_PERPS_INPUT_DIGITS,
} from '../../constants/perpsConfig';
import { usePerpsLivePrices, usePerpsTopOfBook } from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  formatLimitPriceInput,
  formatWithSignificantDigits,
} from '../../utils/formatUtils';
import { getLimitPriceDirectionWarning } from '../../utils/limitPriceFarFromMarket';
import {
  calculateLimitPriceForPercentage,
  isPriceOutsideDeviationBand,
  resolveOracleReferencePrice,
} from '../../utils/orderUtils';

export interface PerpsLimitPricePreset {
  label: string;
  testID: string;
  onPress: () => void;
}

export interface UsePerpsLimitPriceInputParams {
  asset: string;
  currentPrice: number;
  /** Direction of the closing order, i.e. the opposite of the position. */
  direction: 'long' | 'short';
  limitPrice: string;
  setLimitPrice: (price: string) => void;
}

export interface UsePerpsLimitPriceInputResult {
  formattedLimitPrice: string;
  presets: PerpsLimitPricePreset[];
  error: string;
  hasError: boolean;
  handleKeypadChange: (input: { value: string; valueAsNumber: number }) => void;
  trackInputMethod: () => void;
}

/**
 * Inline counterpart of `PerpsLimitPriceBottomSheet` for the close-position
 * sheet, where the field edits the order's limit price directly instead of
 * holding a draft that a nested sheet confirms.
 */
export function usePerpsLimitPriceInput({
  asset,
  currentPrice: passedCurrentPrice,
  direction,
  limitPrice,
  setLimitPrice,
}: UsePerpsLimitPriceInputParams): UsePerpsLimitPriceInputResult {
  const { track } = usePerpsEventTracking();
  const inputMethodRef = useRef<string | null>(null);

  const priceData = usePerpsLivePrices({ symbols: [asset], throttleMs: 1000 });
  const currentPriceData = priceData[asset];
  const currentPrice = currentPriceData?.price
    ? parseFloat(currentPriceData.price)
    : passedCurrentPrice;

  const referencePrice = resolveOracleReferencePrice(
    currentPriceData?.markPrice,
    currentPrice,
  );

  const topOfBook = usePerpsTopOfBook({ symbol: asset });
  const isLong = direction === 'long';

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
      ? parseFloat(topOfBookPrice)
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
        parseFloat(calculated),
        PERPS_EVENT_VALUE.INPUT_METHOD.PERCENTAGE_BUTTON,
      );
    };

    return [
      {
        label: strings('perps.order.limit_price_modal.mid_price'),
        testID: PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRESET_MID,
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
        testID:
          PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRESET_TOP_OF_BOOK,
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
        testID: `${PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRESET_PERCENT}${percentage}`,
        onPress: () => applyPercentage(percentage),
      })),
    ];
  }, [applyLimitPrice, currentPrice, isLong, limitPrice, topOfBook]);

  const formattedLimitPrice = useMemo(
    () => formatLimitPriceInput(limitPrice),
    [limitPrice],
  );

  const error = useMemo(() => {
    const parsedLimit = parseFloat(limitPrice.replace(/[$,]/g, ''));

    if (
      isPriceOutsideDeviationBand(
        parsedLimit,
        referencePrice,
        LIMIT_PRICE_CONFIG.MaxDeviationFromMarket,
      )
    ) {
      return strings('perps.order.limit_price_modal.limit_price_too_far');
    }

    if (
      !limitPrice ||
      isNaN(parsedLimit) ||
      !currentPrice ||
      currentPrice <= 0
    ) {
      return '';
    }

    return getLimitPriceDirectionWarning({
      limitPrice,
      currentPrice,
      direction,
      isClosingPosition: true,
    });
  }, [currentPrice, direction, limitPrice, referencePrice]);

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

  return {
    formattedLimitPrice,
    presets,
    error,
    hasError: Boolean(error),
    handleKeypadChange,
    trackInputMethod,
  };
}
