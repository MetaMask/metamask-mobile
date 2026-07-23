import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextField,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import Keypad from '../../../../Base/Keypad';
import {
  formatPerpsFiat,
  formatWithSignificantDigits,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import {
  DECIMAL_PRECISION_CONFIG,
  getPerpsDisplaySymbol,
  PERPS_CONSTANTS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { PerpsLimitPriceBottomSheetSelectorsIDs } from '../../Perps.testIds';
import { usePerpsLivePrices, usePerpsTopOfBook } from '../../hooks/stream';
import { LIMIT_PRICE_CONFIG } from '../../constants/perpsConfig';
import { isPriceOutsideDeviationBand } from '../../utils/orderUtils';
import { BigNumber } from 'bignumber.js';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

interface PerpsLimitPriceBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (limitPrice: string) => void;
  asset: string;
  limitPrice?: string;
  currentPrice?: number;
  direction?: 'long' | 'short';
  isClosingPosition?: boolean;
}

/**
 * PerpsLimitPriceBottomSheet
 * Modal for setting limit order prices with direction-specific presets
 *
 * Features:
 * - Direction-aware presets (Long: Mid, Bid, -1%, -2% | Short: Mid, Ask, +1%, +2%)
 * - Custom keypad for price input
 * - Real-time current market price display
 * - Automatic preset calculation based on current price
 */
const PerpsLimitPriceBottomSheet: React.FC<PerpsLimitPriceBottomSheetProps> = ({
  isVisible,
  onClose,
  onConfirm,
  asset,
  limitPrice: initialLimitPrice,
  currentPrice: passedCurrentPrice = 0,
  direction = 'long',
  isClosingPosition = false,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  // Initialize with initial limit price or empty to show placeholder
  const [limitPrice, setLimitPrice] = useState(initialLimitPrice || '');

  // Track input method for MetaMetrics (preset = Mid/Bid/Ask, percentage_button = %, keyboard = manual)
  const [inputMethod, setInputMethod] = useState<string | null>(null);

  // MetaMetrics tracking
  const { track } = usePerpsEventTracking();

  // Get real-time price data with 1000ms throttle for limit price bottom sheet
  // Only subscribe when visible
  const priceData = usePerpsLivePrices({
    symbols: isVisible ? [asset] : [],
    throttleMs: 1000,
  });
  const currentPriceData = priceData[asset];

  // Use live data directly - updates automatically every 1000ms
  const currentPrice = currentPriceData?.price
    ? parseFloat(currentPriceData.price)
    : passedCurrentPrice;

  // Mark price used as the reference for HyperLiquid's oracle price band. Falls
  // back to the mid/mark currentPrice when the mark price is missing or does
  // not parse to a finite positive number (otherwise a NaN reference would
  // silently skip the band check).
  const parsedMarkPrice = currentPriceData?.markPrice
    ? parseFloat(currentPriceData.markPrice)
    : NaN;
  const referencePrice =
    Number.isFinite(parsedMarkPrice) && parsedMarkPrice > 0
      ? parsedMarkPrice
      : currentPrice;

  // Get top of book (bid/ask) data for Bid/Ask preset buttons
  // Note: Mid price comes from currentPrice above (from allMids stream)
  const topOfBook = usePerpsTopOfBook({ symbol: isVisible ? asset : '' });
  const bidPrice = topOfBook?.bestBid;
  const askPrice = topOfBook?.bestAsk;

  useEffect(() => {
    if (isVisible) {
      setInputMethod(null); // Reset input method tracking for new session
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleConfirm = () => {
    // Remove any formatting (commas, dollar signs) before passing the value
    const cleanPrice = limitPrice.replace(/[$,]/g, '');

    // Track limit price input method
    if (inputMethod) {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.SETTING_CHANGED,
        [PERPS_EVENT_PROPERTY.SETTING_TYPE]: 'limit_price',
        [PERPS_EVENT_PROPERTY.INPUT_METHOD]: inputMethod,
        [PERPS_EVENT_PROPERTY.ASSET]: asset,
        [PERPS_EVENT_PROPERTY.DIRECTION]: direction,
      });
    }

    // Only call onConfirm; parent controls visibility. Avoid calling onClose here
    // to distinguish between confirm vs dismiss (onClose used for cancel/dismiss).
    onConfirm(cleanPrice);
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      // Enforce 9-digit limit (ignore non-digits like '.' or ',')
      const digitCount = (value.match(/\d/g) || []).length;
      if (digitCount > 9) {
        return; // Ignore input that would exceed 9 digits
      }
      setLimitPrice(value || '');
      setInputMethod(PERPS_EVENT_VALUE.INPUT_METHOD.KEYBOARD);
    },
    [],
  );

  /**
   * Format limit price with proper decimal handling
   * Shows raw input during typing (preserves ".", "0.", "0.00", etc.)
   * Only formats complete numbers
   * @param price - Price string to format
   * @returns Formatted price string with proper currency symbol
   */
  const formatLimitPriceValue = useCallback((price: string) => {
    if (!price || price === '0') {
      return '';
    }

    // Preserve raw input if it ends with a decimal point or has trailing zeros after decimal
    // Format the base number to get proper currency symbol, then append the typed decimal part
    if (price.endsWith('.') || /\.\d*0$/.test(price)) {
      const parts = price.split('.');
      const integerPart = parts[0] || '0';
      const decimalPart = parts.length > 1 ? `.${parts[1]}` : '.';

      // Format the integer part to get proper currency formatting
      const formatted = formatPerpsFiat(integerPart, {
        ranges: [
          {
            condition: () => true,
            threshold: 0,
            maximumDecimals: 0,
            minimumDecimals: 0,
          },
        ],
      });

      // Append the decimal part as typed by user
      return `${formatted}${decimalPart}`;
    }

    const formatConfig = {
      ranges: [
        {
          condition: () => true,
          threshold: 0.00000001,
          maximumDecimals: 7,
          minimumDecimals: Math.min(price.split('.')[1]?.length || 0, 7),
        },
      ],
    };

    return formatPerpsFiat(price, formatConfig);
  }, []);

  /**
   * Compute contextual warning based on limit price vs current price
   * Open Long: warn if limit > current (above)
   * Open Short: warn if limit < current (below)
   * Close Long (isClosingPosition && direction === 'short'): warn if limit < current (below)
   * Close Short (isClosingPosition && direction === 'long'): warn if limit > current (above)
   */
  const limitPriceWarning = React.useMemo(() => {
    // Sanitize inputs
    const parsedLimit = parseFloat(limitPrice.replace(/[$,]/g, ''));
    const price = Number(currentPrice);

    if (!limitPrice || isNaN(parsedLimit) || !price || price <= 0) {
      return '';
    }

    // Opening orders
    if (!isClosingPosition) {
      if (direction === 'long' && parsedLimit > price) {
        return strings('perps.order.limit_price_modal.limit_price_above');
      }
      if (direction === 'short' && parsedLimit < price) {
        return strings('perps.order.limit_price_modal.limit_price_below');
      }
      return '';
    }

    // Closing positions: direction prop is opposite of the underlying position
    // direction === 'short' => closing a LONG position
    if (isClosingPosition && direction === 'short' && parsedLimit < price) {
      return strings('perps.order.limit_price_modal.limit_price_below');
    }
    // direction === 'long' => closing a SHORT position
    if (isClosingPosition && direction === 'long' && parsedLimit > price) {
      return strings('perps.order.limit_price_modal.limit_price_above');
    }

    return '';
  }, [limitPrice, currentPrice, direction, isClosingPosition]);

  /**
   * HyperLiquid rejects orders whose price is more than 95% away from the
   * reference (mark) price ("oracleRejected"). Shows immediate feedback while
   * the price is being set; the authoritative gate is the shared rule enforced
   * in the Close button validation (usePerpsClosePositionValidation), which
   * re-evaluates as the market moves. Both use isPriceOutsideDeviationBand with
   * the same reference (mark) price.
   *
   * Only applied when closing a position. Opening a normal limit order is left
   * to the order form's own validation.
   */
  const exceedsMaxDeviation = React.useMemo(() => {
    if (!isClosingPosition) {
      return false;
    }
    const parsedLimit = parseFloat(limitPrice.replace(/[$,]/g, ''));
    return isPriceOutsideDeviationBand(
      parsedLimit,
      referencePrice,
      LIMIT_PRICE_CONFIG.MaxDeviationFromMarket,
    );
  }, [isClosingPosition, limitPrice, referencePrice]);

  /**
   * Calculate limit price based on percentage from the current limit price (or
   * market price when no limit price is set yet).
   * @param percentage - Percentage to add/subtract from current price
   * @returns Calculated price as string (e.g., "45123.50")
   *
   * For long orders: Negative percentages create buy limits below market
   * For short orders: Positive percentages create sell limits above market
   */
  const calculatePriceForPercentage = useCallback(
    (percentage: number) => {
      const parsedLimitPrice = limitPrice
        ? parseFloat(limitPrice.replace(/[$,]/g, ''))
        : 0;
      const basePrice = parsedLimitPrice > 0 ? parsedLimitPrice : currentPrice;

      if (!basePrice || basePrice === 0) {
        return '';
      }

      const multiplier = 1 + percentage / 100;
      const calculatedPrice = BigNumber(basePrice)
        .multipliedBy(multiplier)
        .toString();
      return calculatedPrice;
    },
    [currentPrice, limitPrice],
  );

  const isConfirmDisabled =
    !limitPrice ||
    limitPrice === '' ||
    limitPrice === '0' ||
    parseFloat(limitPrice.replace(/[$,]/g, '')) <= 0 ||
    exceedsMaxDeviation;

  const hasInputError = Boolean(exceedsMaxDeviation || limitPriceWarning);
  const formattedLimitPrice = formatLimitPriceValue(limitPrice);

  if (!isVisible) return null;

  return (
    <BottomSheet ref={bottomSheetRef} onClose={onClose}>
      <BottomSheetHeader onClose={onClose}>
        {strings('perps.order.limit_price_modal.title')}
      </BottomSheetHeader>

      <Box twClassName="gap-2 px-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('perps.order.limit_price')}
        </Text>
        <TextField
          testID={PerpsLimitPriceBottomSheetSelectorsIDs.PRICE_DISPLAY}
          value={formattedLimitPrice}
          isReadOnly
          isError={hasInputError}
          endAccessory={
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              USD
            </Text>
          }
          inputProps={{
            showSoftInputOnFocus: false,
          }}
        />
        {hasInputError ? (
          <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
            {exceedsMaxDeviation
              ? strings('perps.order.limit_price_modal.limit_price_too_far')
              : limitPriceWarning}
          </Text>
        ) : (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
          >
            {getPerpsDisplaySymbol(asset)}-USD{' '}
            {currentPrice !== undefined && currentPrice !== null
              ? formatPerpsFiat(currentPrice, {
                  ranges: PRICE_RANGES_UNIVERSAL,
                })
              : PERPS_CONSTANTS.FallbackPriceDisplay}
          </Text>
        )}

        <Box twClassName="mb-4 flex-row gap-2">
          <Button
            testID={PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_MID}
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            twClassName="flex-1"
            onPress={() => {
              if (currentPrice) {
                setLimitPrice(
                  formatWithSignificantDigits(
                    currentPrice,
                    DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
                  ).value.toString(),
                );
                setInputMethod(PERPS_EVENT_VALUE.INPUT_METHOD.PRESET);
              }
            }}
          >
            {strings('perps.order.limit_price_modal.mid_price')}
          </Button>

          {direction === 'long' ? (
            <>
              <Button
                testID={PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_BID}
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                twClassName="flex-1"
                onPress={() => {
                  const price = bidPrice || currentPriceData?.price;
                  if (price) {
                    setLimitPrice(
                      formatWithSignificantDigits(
                        parseFloat(price),
                        DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
                      ).value.toString(),
                    );
                    setInputMethod(PERPS_EVENT_VALUE.INPUT_METHOD.PRESET);
                  }
                }}
              >
                {strings('perps.order.limit_price_modal.bid_price')}
              </Button>

              {LIMIT_PRICE_CONFIG.LongPresets.map((percentage) => (
                <Button
                  key={percentage}
                  testID={`${PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_PERCENT}${percentage}`}
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  twClassName="flex-1"
                  onPress={() => {
                    const calculatedPrice =
                      calculatePriceForPercentage(percentage);
                    if (calculatedPrice) {
                      setLimitPrice(
                        formatWithSignificantDigits(
                          parseFloat(calculatedPrice),
                          DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
                        ).value.toString(),
                      );
                      setInputMethod(
                        PERPS_EVENT_VALUE.INPUT_METHOD.PERCENTAGE_BUTTON,
                      );
                    }
                  }}
                >
                  {`${percentage > 0 ? '+' : ''}${percentage}%`}
                </Button>
              ))}
            </>
          ) : (
            <>
              <Button
                testID={PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_ASK}
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                twClassName="flex-1"
                onPress={() => {
                  const price = askPrice || currentPriceData?.price;
                  if (price) {
                    setLimitPrice(
                      formatWithSignificantDigits(
                        parseFloat(price),
                        DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
                      ).value.toString(),
                    );
                    setInputMethod(PERPS_EVENT_VALUE.INPUT_METHOD.PRESET);
                  }
                }}
              >
                {strings('perps.order.limit_price_modal.ask_price')}
              </Button>

              {LIMIT_PRICE_CONFIG.ShortPresets.map((percentage) => (
                <Button
                  key={percentage}
                  testID={`${PerpsLimitPriceBottomSheetSelectorsIDs.PRESET_PERCENT}${percentage}`}
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  twClassName="flex-1"
                  onPress={() => {
                    const calculatedPrice =
                      calculatePriceForPercentage(percentage);
                    if (calculatedPrice) {
                      setLimitPrice(
                        formatWithSignificantDigits(
                          parseFloat(calculatedPrice),
                          DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
                        ).value.toString(),
                      );
                      setInputMethod(
                        PERPS_EVENT_VALUE.INPUT_METHOD.PERCENTAGE_BUTTON,
                      );
                    }
                  }}
                >
                  {`${percentage > 0 ? '+' : ''}${percentage}%`}
                </Button>
              ))}
            </>
          )}
        </Box>
      </Box>

      <Box twClassName="mb-4 px-4">
        <Keypad
          value={limitPrice}
          // This is intentionaly not a real currecy
          // It is used to override the default decimals for USD with minimal changes
          currency="USD_PERPS"
          onChange={handleKeypadChange}
          decimals={5}
        />
      </Box>

      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('perps.order.limit_price_modal.set'),
          onPress: handleConfirm,
          size: ButtonSize.Lg,
          isDisabled: isConfirmDisabled,
          testID: PerpsLimitPriceBottomSheetSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

PerpsLimitPriceBottomSheet.displayName = 'PerpsLimitPriceBottomSheet';

export default memo(PerpsLimitPriceBottomSheet, (prevProps, nextProps) => {
  // If bottom sheet is not visible in both states, skip re-render
  if (!prevProps.isVisible && !nextProps.isVisible) {
    return true;
  }

  // Only re-render if these critical props change
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.asset === nextProps.asset &&
    prevProps.limitPrice === nextProps.limitPrice &&
    prevProps.direction === nextProps.direction
  );
});
