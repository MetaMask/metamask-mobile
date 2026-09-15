import { useCallback, useMemo, useRef } from 'react';
import { BigNumber } from 'bignumber.js';
import {
  DECIMAL_PRECISION_CONFIG,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { LIMIT_PRICE_CONFIG, MAX_PERPS_INPUT_DIGITS } from '../../constants/perpsConfig';
import { usePerpsLivePrices, usePerpsTopOfBook } from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { formatPerpsFiat, formatWithSignificantDigits } from '../../utils/formatUtils';
import { isPriceOutsideDeviationBand } from '../../utils/orderUtils';

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

  // Mark price is HyperLiquid's reference for the oracle band; fall back to the
  // mid price when it is missing or unparseable so a NaN reference cannot
  // silently skip the check.
  const parsedMarkPrice = currentPriceData?.markPrice
    ? parseFloat(currentPriceData.markPrice)
    : NaN;
  const referencePrice =
    Number.isFinite(parsedMarkPrice) && parsedMarkPrice > 0
      ? parsedMarkPrice
      : currentPrice;

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
      const parsedLimitPrice = limitPrice
        ? parseFloat(limitPrice.replace(/[$,]/g, ''))
        : 0;
      const basePrice = parsedLimitPrice > 0 ? parsedLimitPrice : currentPrice;
      if (!basePrice) {
        return;
      }
      applyLimitPrice(
        parseFloat(
          BigNumber(basePrice)
            .multipliedBy(1 + percentage / 100)
            .toString(),
        ),
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

  const formattedLimitPrice = useMemo(() => {
    if (!limitPrice || limitPrice === '0') {
      return '';
    }

    // Preserve the raw input while it is still being typed ("12.", "12.50"),
    // which formatPerpsFiat would otherwise collapse.
    if (limitPrice.endsWith('.') || /\.\d*0$/.test(limitPrice)) {
      const parts = limitPrice.split('.');
      const formatted = formatPerpsFiat(parts[0] || '0', {
        ranges: [
          {
            condition: () => true,
            threshold: 0,
            maximumDecimals: 0,
            minimumDecimals: 0,
          },
        ],
      });
      return `${formatted}${parts.length > 1 ? `.${parts[1]}` : '.'}`;
    }

    return formatPerpsFiat(limitPrice, {
      ranges: [
        {
          condition: () => true,
          threshold: 0.00000001,
          maximumDecimals: 7,
          minimumDecimals: Math.min(limitPrice.split('.')[1]?.length || 0, 7),
        },
      ],
    });
  }, [limitPrice]);

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

    if (!limitPrice || isNaN(parsedLimit) || !currentPrice || currentPrice <= 0) {
      return '';
    }

    // direction is the closing order's side: selling to close a long should
    // not sit below the market, and buying to close a short not above it.
    if (direction === 'short' && parsedLimit < currentPrice) {
      return strings('perps.order.limit_price_modal.limit_price_below');
    }
    if (direction === 'long' && parsedLimit > currentPrice) {
      return strings('perps.order.limit_price_modal.limit_price_above');
    }

    return '';
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
