import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { TouchableOpacity, View, Animated } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import Keypad from '../../../../Base/Keypad';
import {
  formatPerpsFiat,
  formatWithSignificantDigits,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { getPerpsDisplaySymbol } from '../../utils/marketUtils';
import { createStyles } from './PerpsLimitPriceBottomSheet.styles';
import { usePerpsLivePrices, usePerpsTopOfBook } from '../../hooks/stream';
import {
  PERPS_CONSTANTS,
  LIMIT_PRICE_CONFIG,
} from '../../constants/perpsConfig';
import { BigNumber } from 'bignumber.js';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';

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
  const { colors } = useTheme();
  const tw = useTailwind();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  // Cursor animation
  const cursorOpacity = useRef(new Animated.Value(1)).current;

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

  // Get top of book (bid/ask) data for Bid/Ask preset buttons
  // Note: Mid price comes from currentPrice above (from allMids stream)
  const topOfBook = usePerpsTopOfBook({ symbol: isVisible ? asset : '' });
  const bidPrice = topOfBook?.bestBid;
  const askPrice = topOfBook?.bestAsk;

  useEffect(() => {
    if (isVisible) {
      setInputMethod(null); // Reset input method tracking for new session
      bottomSheetRef.current?.onOpenBottomSheet();

      // Start cursor blinking animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      // Stop animation when not visible
      cursorOpacity.stopAnimation();
      cursorOpacity.setValue(1);
    }
  }, [isVisible, cursorOpacity]);

  const handleConfirm = () => {
    // Remove any formatting (commas, dollar signs) before passing the value
    const cleanPrice = limitPrice.replace(/[$,]/g, '');

    // Track limit price input method
    if (inputMethod) {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.SETTING_CHANGED,
        [PerpsEventProperties.SETTING_TYPE]: 'limit_price',
        [PerpsEventProperties.INPUT_METHOD]: inputMethod,
        [PerpsEventProperties.ASSET]: asset,
        [PerpsEventProperties.DIRECTION]: direction,
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
      setInputMethod(PerpsEventValues.INPUT_METHOD.KEYBOARD);
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
   * Get text color for limit price based on value
   * @param price - Price string to check
   * @returns Style object with color
   */
  const getLimitPriceTextStyle = useCallback(
    (price: string) => {
      const baseStyle = styles.limitPriceValue;
      const isEmptyOrZero = !price || price === '0';

      return [baseStyle, isEmptyOrZero && { color: colors.text.muted }];
    },
    [colors.text.muted, styles.limitPriceValue],
  );

  /**
   * Get animated cursor style
   * @returns Style array for animated cursor
   */
  const getCursorStyle = useCallback(
    () => [
      tw.style('w-0.5 h-5'),
      {
        backgroundColor: colors.primary.default,
        opacity: cursorOpacity,
      },
    ],
    [colors.primary.default, cursorOpacity, tw],
  );

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
   * Calculate limit price based on percentage from current market price
   * @param percentage - Percentage to add/subtract from current price
   * @returns Calculated price as string (e.g., "45123.50")
   *
   * For long orders: Negative percentages create buy limits below market
   * For short orders: Positive percentages create sell limits above market
   */
  const calculatePriceForPercentage = useCallback(
    (percentage: number) => {
      // Use the current market price (not limit price) for percentage calculations
      const basePrice = currentPrice;

      if (!basePrice || basePrice === 0) {
        return '';
      }

      const multiplier = 1 + percentage / 100;
      const calculatedPrice = BigNumber(basePrice)
        .multipliedBy(multiplier)
        .toString();
      // Return the raw numeric value as a string (without formatting)
      // The display will format it when needed
      return calculatedPrice;
    },
    [currentPrice],
  );

  const footerButtonProps = [
    {
      label: strings('perps.order.limit_price_modal.set'),
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleConfirm,
      isDisabled:
        !limitPrice ||
        limitPrice === '' ||
        limitPrice === '0' ||
        parseFloat(limitPrice.replace(/[$,]/g, '')) <= 0,
    },
  ];

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.order.limit_price_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        {/* Limit price input section */}
        <Text style={styles.inputLabel}>
          {strings('perps.order.limit_price')}
        </Text>
        <View style={styles.limitPriceDisplay}>
          <View style={tw.style('flex-row items-center flex-1')}>
            <Text style={getLimitPriceTextStyle(limitPrice)}>
              {formatLimitPriceValue(limitPrice)}
            </Text>
            {/* Blinking cursor */}
            <Animated.View style={getCursorStyle()} />
          </View>
          <Text style={styles.limitPriceCurrency}>USD</Text>
        </View>
        {limitPriceWarning && (
          <Text style={styles.errorText}>{limitPriceWarning}</Text>
        )}
        {/* Current market price below input */}
        <Text style={styles.marketPriceText}>
          {getPerpsDisplaySymbol(asset)}-USD{' '}
          {currentPrice !== undefined && currentPrice !== null
            ? formatPerpsFiat(currentPrice, {
                ranges: PRICE_RANGES_UNIVERSAL,
              })
            : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
        </Text>

        {/* Quick preset buttons - Mid/Bid/Ask + percentage presets */}
        <View style={styles.percentageButtonsRow}>
          {/* Mid price button - uses currentPrice which is the mid price from allMids stream */}
          <TouchableOpacity
            style={styles.percentageButton}
            onPress={() => {
              if (currentPrice) {
                setLimitPrice(
                  formatWithSignificantDigits(currentPrice, 4).value.toString(),
                );
                setInputMethod(PerpsEventValues.INPUT_METHOD.PRESET);
              }
            }}
          >
            <Text variant={TextVariant.BodyMD}>
              {strings('perps.order.limit_price_modal.mid_price')}
            </Text>
          </TouchableOpacity>

          {direction === 'long' ? (
            // For long orders: Mid, Bid, -1%, -2%
            <>
              {/* Bid price button */}
              <TouchableOpacity
                style={styles.percentageButton}
                onPress={() => {
                  const price = bidPrice || currentPriceData?.price;
                  if (price) {
                    setLimitPrice(
                      formatWithSignificantDigits(
                        parseFloat(price),
                        4,
                      ).value.toString(),
                    );
                    setInputMethod(PerpsEventValues.INPUT_METHOD.PRESET);
                  }
                }}
              >
                <Text variant={TextVariant.BodyMD}>
                  {strings('perps.order.limit_price_modal.bid_price')}
                </Text>
              </TouchableOpacity>

              {/* Percentage presets */}
              {LIMIT_PRICE_CONFIG.LONG_PRESETS.map((percentage) => (
                <TouchableOpacity
                  key={percentage}
                  style={styles.percentageButton}
                  onPress={() => {
                    const calculatedPrice =
                      calculatePriceForPercentage(percentage);
                    if (calculatedPrice) {
                      setLimitPrice(
                        formatWithSignificantDigits(
                          parseFloat(calculatedPrice),
                          4,
                        ).value.toString(),
                      );
                      setInputMethod(
                        PerpsEventValues.INPUT_METHOD.PERCENTAGE_BUTTON,
                      );
                    }
                  }}
                >
                  <Text variant={TextVariant.BodyMD}>
                    {percentage > 0 ? '+' : ''}
                    {percentage}%
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            // For short orders: Mid, Ask, +1%, +2%
            <>
              {/* Ask price button */}
              <TouchableOpacity
                style={styles.percentageButton}
                onPress={() => {
                  const price = askPrice || currentPriceData?.price;
                  if (price) {
                    setLimitPrice(
                      formatWithSignificantDigits(
                        parseFloat(price),
                        4,
                      ).value.toString(),
                    );
                    setInputMethod(PerpsEventValues.INPUT_METHOD.PRESET);
                  }
                }}
              >
                <Text variant={TextVariant.BodyMD}>
                  {strings('perps.order.limit_price_modal.ask_price')}
                </Text>
              </TouchableOpacity>

              {/* Percentage presets */}
              {LIMIT_PRICE_CONFIG.SHORT_PRESETS.map((percentage) => (
                <TouchableOpacity
                  key={percentage}
                  style={styles.percentageButton}
                  onPress={() => {
                    const calculatedPrice =
                      calculatePriceForPercentage(percentage);
                    if (calculatedPrice) {
                      setLimitPrice(
                        formatWithSignificantDigits(
                          parseFloat(calculatedPrice),
                          4,
                        ).value.toString(),
                      );
                      setInputMethod(
                        PerpsEventValues.INPUT_METHOD.PERCENTAGE_BUTTON,
                      );
                    }
                  }}
                >
                  <Text variant={TextVariant.BodyMD}>
                    {percentage > 0 ? '+' : ''}
                    {percentage}%
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>

        {/* Keypad */}
        <View style={styles.keypadContainer}>
          <Keypad
            value={limitPrice}
            // This is intentionaly not a real currecy
            // It is used to override the default decimals for USD with minimal changes
            currency="USD_PERPS"
            onChange={handleKeypadChange}
            decimals={5}
          />
        </View>
      </View>

      <View style={styles.footerContainer}>
        <BottomSheetFooter buttonPropsArray={footerButtonProps} />
      </View>
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
