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
  hasTPSLValuesChanged,
  calculateRoEForPrice,
  calculatePriceForRoE,
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

  // Get position details for RoE calculations
  const entryPrice = position?.entryPrice ? parseFloat(position.entryPrice) : 0;
  const margin = position?.marginUsed ? parseFloat(position.marginUsed) : 0;
  const size = position?.size ? parseFloat(position.size) : 0;

  // Calculate initial RoE percentages only once when component first becomes visible
  useEffect(() => {
    if (isVisible && position) {
      // Calculate initial RoE percentages when opening
      if (initialTakeProfitPrice && takeProfitPercentage === '' && entryPrice && margin && size) {
        const roe = calculateRoEForPrice(
          initialTakeProfitPrice,
          entryPrice,
          margin,
          Math.abs(size),
          actualDirection || 'long'
        );
        setTakeProfitPercentage(roe);
      }

      if (initialStopLossPrice && stopLossPercentage === '' && entryPrice && margin && size) {
        const roe = calculateRoEForPrice(
          initialStopLossPrice,
          entryPrice,
          margin,
          Math.abs(size),
          actualDirection || 'long'
        );
        // Stop loss RoE is negative, show as positive for UI
        setStopLossPercentage(Math.abs(parseFloat(roe)).toFixed(2));
      }
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]); // Only run when visibility changes, not on price updates

  // Recalculate prices when RoE percentage changes but only if using percentage mode and we have position data
  useEffect(() => {
    if (position && isVisible && entryPrice && margin && size) {
      // Only update take profit price if user is using RoE-based calculation
      if (
        tpUsingPercentage &&
        takeProfitPercentage &&
        !isNaN(parseFloat(takeProfitPercentage))
      ) {
        const price = calculatePriceForRoE(
          parseFloat(takeProfitPercentage),
          entryPrice,
          margin,
          Math.abs(size),
          actualDirection || 'long'
        );
        setTakeProfitPrice(formatPrice(price));
      }

      // Only update stop loss price if user is using RoE-based calculation
      if (
        slUsingPercentage &&
        stopLossPercentage &&
        !isNaN(parseFloat(stopLossPercentage))
      ) {
        // Stop loss uses negative RoE
        const price = calculatePriceForRoE(
          -parseFloat(stopLossPercentage),
          entryPrice,
          margin,
          Math.abs(size),
          actualDirection || 'long'
        );
        setStopLossPrice(formatPrice(price));
      }
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tpUsingPercentage, slUsingPercentage, takeProfitPercentage, stopLossPercentage]); // Update prices when RoE percentages change

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

      // Update RoE percentage based on price
      if (sanitized && entryPrice && margin && size) {
        const roe = calculateRoEForPrice(
          sanitized,
          entryPrice,
          margin,
          Math.abs(size),
          actualDirection || 'long'
        );
        setTakeProfitPercentage(roe);
      } else {
        setTakeProfitPercentage('');
      }
      setSelectedTpPercentage(null);
      setTpUsingPercentage(false); // User is manually entering price
    },
    [entryPrice, margin, size, actualDirection],
  );

  // Memoized callbacks for take profit RoE percentage input
  const handleTakeProfitPercentageChange = useCallback(
    (text: string) => {
      // Allow only numbers and decimal point (no minus for RoE input)
      const sanitized = text.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitized.split('.');
      if (parts.length > 2) return;

      setTakeProfitPercentage(sanitized);

      // Update price based on RoE percentage
      if (sanitized && !isNaN(parseFloat(sanitized)) && entryPrice && margin && size) {
        const price = calculatePriceForRoE(
          parseFloat(sanitized),
          entryPrice,
          margin,
          Math.abs(size),
          actualDirection || 'long'
        );
        setTakeProfitPrice(formatPrice(price));
        setSelectedTpPercentage(parseFloat(sanitized));
      } else {
        setTakeProfitPrice('');
        setSelectedTpPercentage(null);
      }
      setTpUsingPercentage(true); // User is using RoE-based calculation
    },
    [entryPrice, margin, size, actualDirection],
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

      // Update RoE percentage based on price
      if (sanitized && entryPrice && margin && size) {
        const roe = calculateRoEForPrice(
          sanitized,
          entryPrice,
          margin,
          Math.abs(size),
          actualDirection || 'long'
        );
        // Always show stop loss RoE as positive
        setStopLossPercentage(Math.abs(parseFloat(roe)).toFixed(2));
      } else {
        setStopLossPercentage('');
      }
      setSelectedSlPercentage(null);
      setSlUsingPercentage(false); // User is manually entering price
    },
    [entryPrice, margin, size, actualDirection],
  );

  // Memoized callbacks for stop loss RoE percentage input
  const handleStopLossPercentageChange = useCallback(
    (text: string) => {
      // Allow only numbers and decimal point
      const sanitized = text.replace(/[^0-9.]/g, '');
      // Prevent multiple decimal points
      const parts = sanitized.split('.');
      if (parts.length > 2) return;
      setStopLossPercentage(sanitized);

      // Update price based on RoE percentage
      if (sanitized && !isNaN(parseFloat(sanitized)) && entryPrice && margin && size) {
        // Stop loss uses negative RoE
        const price = calculatePriceForRoE(
          -parseFloat(sanitized),
          entryPrice,
          margin,
          Math.abs(size),
          actualDirection || 'long'
        );
        setStopLossPrice(formatPrice(price));
        setSelectedSlPercentage(parseFloat(sanitized));
      } else {
        setStopLossPrice('');
        setSelectedSlPercentage(null);
      }
      setSlUsingPercentage(true); // User is using RoE-based calculation
    },
    [entryPrice, margin, size, actualDirection],
  );

  // Memoized callbacks for RoE percentage buttons
  const handleTakeProfitPercentageButton = useCallback(
    (percentage: number) => {
      if (!entryPrice || !margin || !size) return;

      const price = calculatePriceForRoE(
        percentage,
        entryPrice,
        margin,
        Math.abs(size),
        actualDirection || 'long'
      );

      setTakeProfitPrice(formatPrice(price));
      setTakeProfitPercentage(percentage.toString());
      setSelectedTpPercentage(percentage);
      setTpUsingPercentage(true); // Using RoE percentage button
    },
    [entryPrice, margin, size, actualDirection],
  );

  const handleStopLossPercentageButton = useCallback(
    (percentage: number) => {
      if (!entryPrice || !margin || !size) return;

      // Stop loss uses negative RoE
      const price = calculatePriceForRoE(
        -percentage,
        entryPrice,
        margin,
        Math.abs(size),
        actualDirection || 'long'
      );

      setStopLossPrice(formatPrice(price));
      setStopLossPercentage(percentage.toString());
      setSelectedSlPercentage(percentage);
      setSlUsingPercentage(true); // Using RoE percentage button
    },
    [entryPrice, margin, size, actualDirection],
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
                %RoE
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
                %RoE
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
