import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { formatPrice } from '../../utils/formatUtils';
import { strings } from '../../../../../../locales/i18n';

import type { Position } from '../../controllers/types';
import { createStyles } from './PerpsTPSLBottomSheet.styles';
import { usePerpsPerformance } from '../../hooks';
import { usePerpsLivePrices } from '../../hooks/stream';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import {
  isValidTakeProfitPrice,
  isValidStopLossPrice,
  validateTPSLPrices,
  getTakeProfitErrorDirection,
  getStopLossErrorDirection,
  calculatePriceForPercentage,
  calculatePercentageForPrice,
  hasTPSLValuesChanged,
} from '../../utils/tpslValidation';

// Quick percentage buttons constants
const TAKE_PROFIT_PERCENTAGES = [1, 5, 20, 30];
const STOP_LOSS_PERCENTAGES = [1, 5, 20, 30];

interface PerpsTPSLBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (takeProfitPrice?: string, stopLossPrice?: string) => void;
  // Context data
  asset: string;
  currentPrice?: number;
  direction?: 'long' | 'short'; // For new orders
  position?: Position; // For existing positions
  initialTakeProfitPrice?: string;
  initialStopLossPrice?: string;
  isUpdating?: boolean;
}

const PerpsTPSLBottomSheet: React.FC<PerpsTPSLBottomSheetProps> = ({
  isVisible,
  onClose,
  onConfirm,
  asset,
  currentPrice: initialCurrentPrice,
  direction,
  position,
  initialTakeProfitPrice,
  initialStopLossPrice,
  isUpdating = false,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { startMeasure, endMeasure } = usePerpsPerformance();

  const [takeProfitPrice, setTakeProfitPrice] = useState(
    initialTakeProfitPrice ? formatPrice(initialTakeProfitPrice) : '',
  );
  const [stopLossPrice, setStopLossPrice] = useState(
    initialStopLossPrice ? formatPrice(initialStopLossPrice) : '',
  );
  const [takeProfitPercentage, setTakeProfitPercentage] = useState('');
  const [stopLossPercentage, setStopLossPercentage] = useState('');
  const [tpPriceInputFocused, setTpPriceInputFocused] = useState(false);
  const [tpPercentInputFocused, setTpPercentInputFocused] = useState(false);
  const [slPriceInputFocused, setSlPriceInputFocused] = useState(false);
  const [slPercentInputFocused, setSlPercentInputFocused] = useState(false);
  // Track selected percentage buttons to maintain visual state
  const [selectedTpPercentage, setSelectedTpPercentage] = useState<
    number | null
  >(null);
  const [selectedSlPercentage, setSelectedSlPercentage] = useState<
    number | null
  >(null);
  // Track if user is using percentage-based calculation (vs manual price input)
  const [tpUsingPercentage, setTpUsingPercentage] = useState(false);
  const [slUsingPercentage, setSlUsingPercentage] = useState(false);

  const { track } = usePerpsEventTracking();

  // Subscribe to real-time price only when visible and we have an asset
  // Use 1s debounce for TP/SL bottom sheet
  const priceData = usePerpsLivePrices({
    symbols: isVisible && asset ? [asset] : [],
    throttleMs: 1000,
  });
  const livePrice = priceData[asset]?.price
    ? parseFloat(priceData[asset].price)
    : undefined;

  // Use the current market price if available, otherwise use entry price
  // For new orders, use initialCurrentPrice
  // For existing positions, prefer live price over initial price over entry price
  const currentPrice =
    livePrice ||
    initialCurrentPrice ||
    (position?.entryPrice ? parseFloat(position.entryPrice) : 0);

  // Determine direction: from position size (positive = long, negative = short) or from prop
  const actualDirection = position
    ? parseFloat(position.size) > 0
      ? 'long'
      : 'short'
    : direction;

  useEffect(() => {
    if (isVisible) {
      startMeasure(PerpsMeasurementName.TP_SL_BOTTOM_SHEET_LOADED);
      bottomSheetRef.current?.onOpenBottomSheet(() => {
        // Measure TP/SL bottom sheet loaded when animation actually completes
        endMeasure(PerpsMeasurementName.TP_SL_BOTTOM_SHEET_LOADED);
      });
    }
  }, [isVisible, startMeasure, endMeasure]);

  // Calculate initial percentages only once when component first becomes visible
  useEffect(() => {
    if (isVisible && currentPrice) {
      // Calculate initial percentages when opening
      if (initialTakeProfitPrice && takeProfitPercentage === '') {
        const tpPrice = parseFloat(initialTakeProfitPrice);
        const percentage = ((tpPrice - currentPrice) / currentPrice) * 100;
        // For short positions, TP percentage is negative (price below current)
        setTakeProfitPercentage(percentage.toFixed(2));
      }

      if (initialStopLossPrice && stopLossPercentage === '') {
        const slPrice = parseFloat(initialStopLossPrice);
        const percentage =
          Math.abs((currentPrice - slPrice) / currentPrice) * 100;
        setStopLossPercentage(percentage.toFixed(2));
      }
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]); // Only run when visibility changes, not on price updates

  // Recalculate prices when current price changes but only if using percentage mode
  useEffect(() => {
    if (currentPrice && isVisible) {
      // Only update take profit price if user is using percentage-based calculation
      if (
        tpUsingPercentage &&
        takeProfitPercentage &&
        !isNaN(parseFloat(takeProfitPercentage))
      ) {
        const absPercentage = Math.abs(parseFloat(takeProfitPercentage));
        const price = calculatePriceForPercentage(absPercentage, true, {
          currentPrice,
          direction: actualDirection,
        });
        setTakeProfitPrice(formatPrice(price));
      }

      // Only update stop loss price if user is using percentage-based calculation
      if (
        slUsingPercentage &&
        stopLossPercentage &&
        !isNaN(parseFloat(stopLossPercentage))
      ) {
        const price = calculatePriceForPercentage(
          parseFloat(stopLossPercentage),
          false,
          { currentPrice, direction: actualDirection },
        );
        setStopLossPrice(formatPrice(price));
      }
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice, actualDirection]); // Update prices when current price changes

  const handleConfirm = useCallback(() => {
    // Parse the formatted prices back to plain numbers for storage
    const parseTakeProfitPrice = takeProfitPrice
      ? takeProfitPrice.replace(/[$,]/g, '')
      : undefined;
    const parseStopLossPrice = stopLossPrice
      ? stopLossPrice.replace(/[$,]/g, '')
      : undefined;

    // Track stop loss and take profit set events
    if (parseStopLossPrice) {
      track(MetaMetricsEvents.PERPS_STOP_LOSS_SET, {
        [PerpsEventProperties.ASSET]: asset,
        [PerpsEventProperties.DIRECTION]:
          actualDirection === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
        [PerpsEventProperties.STOP_LOSS_PRICE]: parseFloat(parseStopLossPrice),
        [PerpsEventProperties.INPUT_METHOD]: slUsingPercentage
          ? PerpsEventValues.INPUT_METHOD.PERCENTAGE_BUTTON
          : PerpsEventValues.INPUT_METHOD.MANUAL,
      });
    }

    if (parseTakeProfitPrice) {
      track(MetaMetricsEvents.PERPS_TAKE_PROFIT_SET, {
        [PerpsEventProperties.ASSET]: asset,
        [PerpsEventProperties.DIRECTION]:
          actualDirection === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
        [PerpsEventProperties.TAKE_PROFIT_PRICE]:
          parseFloat(parseTakeProfitPrice),
        [PerpsEventProperties.INPUT_METHOD]: tpUsingPercentage
          ? PerpsEventValues.INPUT_METHOD.PERCENTAGE_BUTTON
          : PerpsEventValues.INPUT_METHOD.MANUAL,
      });
    }

    onConfirm(parseTakeProfitPrice, parseStopLossPrice);
    // Don't close immediately - let the parent handle closing after update completes
  }, [
    takeProfitPrice,
    stopLossPrice,
    onConfirm,
    actualDirection,
    asset,
    slUsingPercentage,
    tpUsingPercentage,
    track,
  ]);

  // Handle close without saving
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Memoized callbacks for take profit price input
  const handleTakeProfitPriceChange = useCallback(
    (text: string) => {
      // Allow only numbers and decimal point
      const sanitized = text.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitized.split('.');
      if (parts.length > 2) return;
      setTakeProfitPrice(sanitized);

      // Update percentage based on price
      if (sanitized) {
        const percentage = calculatePercentageForPrice(sanitized, true, {
          currentPrice,
          direction: actualDirection,
        });

        // For short positions, show take profit percentage as negative
        // The function returns positive for valid directions, but UI convention
        // is to show negative percentages for shorts (price going down)
        const displayPercentage =
          actualDirection === 'short' &&
          percentage &&
          !percentage.startsWith('-')
            ? `-${percentage}`
            : percentage;
        setTakeProfitPercentage(displayPercentage);
      } else {
        setTakeProfitPercentage('');
      }
      setSelectedTpPercentage(null);
      setTpUsingPercentage(false); // User is manually entering price
    },
    [currentPrice, actualDirection],
  );

  // Memoized callbacks for take profit percentage input
  const handleTakeProfitPercentageChange = useCallback(
    (text: string) => {
      // Allow only numbers, decimal point, and minus sign
      const sanitized = text.replace(/[^0-9.-]/g, '');
      // Prevent multiple decimal points or minus signs
      const parts = sanitized.split('.');
      if (parts.length > 2) return;
      if ((sanitized.match(/-/g) || []).length > 1) return;
      // Ensure minus sign is only at the beginning
      if (sanitized.indexOf('-') > 0) return;

      setTakeProfitPercentage(sanitized);

      // Update price based on percentage
      if (sanitized && !isNaN(parseFloat(sanitized))) {
        // Use absolute value for calculation, the function handles direction
        const absPercentage = Math.abs(parseFloat(sanitized));
        const price = calculatePriceForPercentage(absPercentage, true, {
          currentPrice,
          direction: actualDirection,
        });
        setTakeProfitPrice(formatPrice(price));
        setSelectedTpPercentage(absPercentage);
      } else {
        setTakeProfitPrice('');
        setSelectedTpPercentage(null);
      }
      setTpUsingPercentage(true); // User is using percentage-based calculation
    },
    [currentPrice, actualDirection],
  );

  // Memoized callbacks for stop loss price input
  const handleStopLossPriceChange = useCallback(
    (text: string) => {
      // Allow only numbers and decimal point
      const sanitized = text.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitized.split('.');
      if (parts.length > 2) return;
      setStopLossPrice(sanitized);

      // Update percentage based on price
      if (sanitized) {
        const percentage = calculatePercentageForPrice(sanitized, false, {
          currentPrice,
          direction: actualDirection,
        });
        // Always show stop loss percentage as positive
        const absPercentage = percentage.startsWith('-')
          ? percentage.substring(1)
          : percentage;
        setStopLossPercentage(absPercentage);
      } else {
        setStopLossPercentage('');
      }
      setSelectedSlPercentage(null);
      setSlUsingPercentage(false); // User is manually entering price
    },
    [currentPrice, actualDirection],
  );

  // Memoized callbacks for stop loss percentage input
  const handleStopLossPercentageChange = useCallback(
    (text: string) => {
      // Allow only numbers and decimal point
      const sanitized = text.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitized.split('.');
      if (parts.length > 2) return;
      setStopLossPercentage(sanitized);

      // Update price based on percentage
      if (sanitized && !isNaN(parseFloat(sanitized))) {
        const price = calculatePriceForPercentage(
          parseFloat(sanitized),
          false,
          { currentPrice, direction: actualDirection },
        );
        setStopLossPrice(formatPrice(price));
        setSelectedSlPercentage(parseFloat(sanitized));
      } else {
        setStopLossPrice('');
        setSelectedSlPercentage(null);
      }
      setSlUsingPercentage(true); // User is using percentage-based calculation
    },
    [currentPrice, actualDirection],
  );

  // Memoized callbacks for percentage buttons
  const handleTakeProfitPercentageButton = useCallback(
    (percentage: number) => {
      const price = calculatePriceForPercentage(percentage, true, {
        currentPrice,
        direction: actualDirection,
      });

      setTakeProfitPrice(formatPrice(price));
      // For short positions, display take profit percentage as negative
      const displayPercentage =
        actualDirection === 'short' ? -percentage : percentage;
      setTakeProfitPercentage(displayPercentage.toString());
      setSelectedTpPercentage(percentage);
      setTpUsingPercentage(true); // Using percentage button
    },
    [currentPrice, actualDirection],
  );

  const handleStopLossPercentageButton = useCallback(
    (percentage: number) => {
      const price = calculatePriceForPercentage(percentage, false, {
        currentPrice,
        direction: actualDirection,
      });
      setStopLossPrice(formatPrice(price));
      // For short positions, stop loss percentage should be positive
      // (already positive since it's a loss when price goes up)
      setStopLossPercentage(percentage.toString());
      setSelectedSlPercentage(percentage);
      setSlUsingPercentage(true); // Using percentage button
    },
    [currentPrice, actualDirection],
  );

  // Handle "Off" button clicks
  const handleTakeProfitOff = useCallback(() => {
    setTakeProfitPrice('');
    setTakeProfitPercentage('');
    setSelectedTpPercentage(null);
    setTpUsingPercentage(false);
  }, []);

  const handleStopLossOff = useCallback(() => {
    setStopLossPrice('');
    setStopLossPercentage('');
    setSelectedSlPercentage(null);
    setSlUsingPercentage(false);
  }, []);

  const footerButtonProps = [
    {
      label: isUpdating
        ? strings('perps.tpsl.updating')
        : strings('perps.tpsl.set'),
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleConfirm,
      testID: 'perps-tpsl-set-button',
      isDisabled:
        isUpdating ||
        !validateTPSLPrices(takeProfitPrice, stopLossPrice, {
          currentPrice,
          direction: actualDirection,
        }) ||
        !hasTPSLValuesChanged(
          takeProfitPrice,
          stopLossPrice,
          initialTakeProfitPrice,
          initialStopLossPrice,
        ),
      loading: isUpdating,
    },
  ];

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={handleClose}
      style={styles.bottomSheet}
    >
      <BottomSheetHeader onClose={handleClose} style={styles.header}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.tpsl.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        {/* Price information */}
        <View style={styles.priceInfoContainer}>
          <View style={styles.priceInfoRow}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.tpsl.current_price')}
            </Text>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {currentPrice
                ? formatPrice(currentPrice)
                : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
            </Text>
          </View>
          {position?.liquidationPrice && (
            <View style={styles.priceInfoRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.tpsl.liquidation_price')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {formatPrice(position.liquidationPrice)}
              </Text>
            </View>
          )}
        </View>

        {/* Take Profit Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.sectionTitle}>
            {actualDirection === 'long'
              ? strings('perps.tpsl.take_profit_long')
              : strings('perps.tpsl.take_profit_short')}
          </Text>

          <View style={styles.percentageRow}>
            <TouchableOpacity
              style={[
                styles.percentageButton,
                !takeProfitPrice && styles.percentageButtonOff,
              ]}
              onPress={handleTakeProfitOff}
            >
              <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                {strings('perps.tpsl.off')}
              </Text>
            </TouchableOpacity>
            {TAKE_PROFIT_PERCENTAGES.map((percentage) => (
              <TouchableOpacity
                key={percentage}
                style={[
                  styles.percentageButton,
                  selectedTpPercentage === percentage &&
                    styles.percentageButtonActiveTP,
                ]}
                onPress={() => handleTakeProfitPercentageButton(percentage)}
                testID={`perps-tpsl-take-profit-percentage-button-${percentage}`}
              >
                <Text variant={TextVariant.BodySM} color={TextColor.Success}>
                  {actualDirection === 'short' ? '-' : '+'}
                  {percentage}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            {/* USD Input */}
            <View
              style={[
                styles.inputContainer,
                styles.inputContainerLeft,
                tpPriceInputFocused && styles.inputContainerActive,
                takeProfitPrice &&
                  !isValidTakeProfitPrice(takeProfitPrice, {
                    currentPrice,
                    direction: actualDirection,
                  }) &&
                  styles.inputContainerError,
              ]}
            >
              <TextInput
                style={styles.input}
                value={takeProfitPrice}
                onChangeText={handleTakeProfitPriceChange}
                placeholder={strings('perps.tpsl.trigger_price_placeholder')}
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                onFocus={() => setTpPriceInputFocused(true)}
                onBlur={() => {
                  setTpPriceInputFocused(false);
                  // Format on blur if there's a value
                  if (takeProfitPrice && !isNaN(parseFloat(takeProfitPrice))) {
                    setTakeProfitPrice(formatPrice(takeProfitPrice));
                  }
                }}
              />
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.tpsl.usd_label')}
              </Text>
            </View>

            {/* Percentage Input */}
            <View
              style={[
                styles.inputContainer,
                styles.inputContainerRight,
                tpPercentInputFocused && styles.inputContainerActive,
              ]}
            >
              <TextInput
                style={styles.input}
                value={takeProfitPercentage}
                onChangeText={handleTakeProfitPercentageChange}
                placeholder={strings('perps.tpsl.profit_percent_placeholder')}
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                onFocus={() => setTpPercentInputFocused(true)}
                onBlur={() => setTpPercentInputFocused(false)}
              />
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                %
              </Text>
            </View>
          </View>
          {Boolean(takeProfitPrice) &&
            !isValidTakeProfitPrice(takeProfitPrice, {
              currentPrice,
              direction: actualDirection,
            }) &&
            actualDirection && (
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Error}
                style={styles.helperText}
              >
                {strings('perps.order.validation.invalid_take_profit', {
                  direction: getTakeProfitErrorDirection(actualDirection),
                  positionType: actualDirection,
                })}
              </Text>
            )}
        </View>

        {/* Stop Loss Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.sectionTitle}>
            {actualDirection === 'long'
              ? strings('perps.tpsl.stop_loss_long')
              : strings('perps.tpsl.stop_loss_short')}
          </Text>

          <View style={styles.percentageRow}>
            <TouchableOpacity
              style={[
                styles.percentageButton,
                !stopLossPrice && styles.percentageButtonOff,
              ]}
              onPress={handleStopLossOff}
            >
              <Text variant={TextVariant.BodySM} color={TextColor.Default}>
                {strings('perps.tpsl.off')}
              </Text>
            </TouchableOpacity>
            {STOP_LOSS_PERCENTAGES.map((percentage) => (
              <TouchableOpacity
                key={percentage}
                style={[
                  styles.percentageButton,
                  selectedSlPercentage === percentage &&
                    styles.percentageButtonActiveSL,
                ]}
                onPress={() => handleStopLossPercentageButton(percentage)}
                testID={`perps-tpsl-stop-loss-percentage-button-${percentage}`}
              >
                <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                  {actualDirection === 'short' ? '+' : '-'}
                  {percentage}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputRow}>
            {/* USD Input */}
            <View
              style={[
                styles.inputContainer,
                styles.inputContainerLeft,
                slPriceInputFocused && styles.inputContainerActive,
                stopLossPrice &&
                  !isValidStopLossPrice(stopLossPrice, {
                    currentPrice,
                    direction: actualDirection,
                  }) &&
                  styles.inputContainerError,
              ]}
            >
              <TextInput
                style={styles.input}
                value={stopLossPrice}
                onChangeText={handleStopLossPriceChange}
                placeholder={strings('perps.tpsl.trigger_price_placeholder')}
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                onFocus={() => setSlPriceInputFocused(true)}
                onBlur={() => {
                  setSlPriceInputFocused(false);
                  // Format on blur if there's a value
                  if (stopLossPrice && !isNaN(parseFloat(stopLossPrice))) {
                    setStopLossPrice(formatPrice(stopLossPrice));
                  }
                }}
              />
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('perps.tpsl.usd_label')}
              </Text>
            </View>

            {/* Percentage Input */}
            <View
              style={[
                styles.inputContainer,
                styles.inputContainerRight,
                slPercentInputFocused && styles.inputContainerActive,
              ]}
            >
              <TextInput
                style={styles.input}
                value={stopLossPercentage}
                onChangeText={handleStopLossPercentageChange}
                placeholder={strings('perps.tpsl.loss_percent_placeholder')}
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                onFocus={() => setSlPercentInputFocused(true)}
                onBlur={() => setSlPercentInputFocused(false)}
              />
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                %
              </Text>
            </View>
          </View>
          {Boolean(stopLossPrice) &&
            !isValidStopLossPrice(stopLossPrice, {
              currentPrice,
              direction: actualDirection,
            }) &&
            actualDirection && (
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Error}
                style={styles.helperText}
              >
                {strings('perps.order.validation.invalid_stop_loss', {
                  direction: getStopLossErrorDirection(actualDirection),
                  positionType: actualDirection,
                })}
              </Text>
            )}
        </View>
      </View>

      <BottomSheetFooter
        buttonPropsArray={footerButtonProps}
        style={styles.footer}
      />

      {/* Loading Overlay */}
      {isUpdating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.default} />
            <Text
              variant={TextVariant.BodyLGMedium}
              color={TextColor.Default}
              style={styles.loadingText}
            >
              {strings('perps.tpsl.updating')}
            </Text>
          </View>
        </View>
      )}
    </BottomSheet>
  );
};

PerpsTPSLBottomSheet.displayName = 'PerpsTPSLBottomSheet';

// Enable WDYR tracking in development
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (PerpsTPSLBottomSheet as any).whyDidYouRender = {
    logOnDifferentValues: true,
    customName: 'PerpsTPSLBottomSheet',
  };
}

export default memo(
  PerpsTPSLBottomSheet,
  (prevProps, nextProps) =>
    // Only re-render if these props change
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.asset === nextProps.asset &&
    prevProps.direction === nextProps.direction &&
    prevProps.initialTakeProfitPrice === nextProps.initialTakeProfitPrice &&
    prevProps.initialStopLossPrice === nextProps.initialStopLossPrice &&
    prevProps.isUpdating === nextProps.isUpdating,
);
