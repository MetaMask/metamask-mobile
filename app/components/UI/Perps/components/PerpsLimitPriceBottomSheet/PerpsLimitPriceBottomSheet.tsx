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
  PRICE_RANGES_POSITION_VIEW,
} from '../../utils/formatUtils';
import { createStyles } from './PerpsLimitPriceBottomSheet.styles';
import { usePerpsLivePrices } from '../../hooks/stream';
import {
  PERPS_CONSTANTS,
  LIMIT_PRICE_CONFIG,
} from '../../constants/perpsConfig';
import { BigNumber } from 'bignumber.js';

interface PerpsLimitPriceBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (limitPrice: string) => void;
  asset: string;
  limitPrice?: string;
  currentPrice?: number;
  direction?: 'long' | 'short';
}

/**
 * PerpsLimitPriceBottomSheet
 * Modal for setting limit order prices with direction-specific presets
 *
 * Features:
 * - Direction-aware presets (Long: -1%, -2%, -5%, -10% | Short: +1%, +2%, +5%, +10%)
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
}) => {
  const { colors } = useTheme();
  const tw = useTailwind();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  // Cursor animation
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  // Initialize with initial limit price or empty to show placeholder
  const [limitPrice, setLimitPrice] = useState(initialLimitPrice || '');

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

  useEffect(() => {
    if (isVisible) {
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
    // Only call onConfirm; parent controls visibility. Avoid calling onClose here
    // to distinguish between confirm vs dismiss (onClose used for cancel/dismiss).
    onConfirm(cleanPrice);
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      setLimitPrice(value || '');
    },
    [],
  );

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
            <Text
              style={[
                styles.limitPriceValue,
                (!limitPrice || limitPrice === '0') && {
                  color: colors.text.muted,
                },
              ]}
            >
              {!limitPrice || limitPrice === '0'
                ? ''
                : formatPerpsFiat(limitPrice, {
                    ranges: [
                      {
                        condition: () => true,
                        threshold: 0.00000001,
                        maximumDecimals: 7,
                        minimumDecimals: Math.min(
                          limitPrice.split('.')[1]?.length || 0,
                          7,
                        ),
                      },
                    ],
                  })}
            </Text>
            {/* Blinking cursor */}
            <Animated.View
              style={[
                tw.style('w-0.5 h-5'),
                {
                  backgroundColor: colors.primary.default,
                  opacity: cursorOpacity,
                },
              ]}
            />
          </View>
          <Text style={styles.limitPriceCurrency}>USD</Text>
        </View>

        {/* Current market price below input */}
        <Text style={styles.marketPriceText}>
          {asset}-USD{' '}
          {currentPrice
            ? formatPerpsFiat(currentPrice, {
                ranges: PRICE_RANGES_POSITION_VIEW,
              })
            : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
        </Text>

        {/* Quick percentage buttons - Direction-specific presets using config */}
        <View style={styles.percentageButtonsRow}>
          {direction === 'long' ? (
            // For long orders: buy below market using LONG_PRESETS
            <>
              {LIMIT_PRICE_CONFIG.LONG_PRESETS.map((percentage) => (
                <TouchableOpacity
                  key={percentage}
                  style={styles.percentageButton}
                  onPress={() =>
                    setLimitPrice(
                      formatWithSignificantDigits(
                        parseFloat(calculatePriceForPercentage(percentage)),
                        4,
                      ).value.toString(),
                    )
                  }
                >
                  <Text variant={TextVariant.BodyMD}>
                    {percentage > 0 ? '+' : ''}
                    {percentage}%
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            // For short orders: sell above market using SHORT_PRESETS
            <>
              {LIMIT_PRICE_CONFIG.SHORT_PRESETS.map((percentage) => (
                <TouchableOpacity
                  key={percentage}
                  style={styles.percentageButton}
                  onPress={() =>
                    setLimitPrice(calculatePriceForPercentage(percentage))
                  }
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

// Enable WDYR tracking in development
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (PerpsLimitPriceBottomSheet as any).whyDidYouRender = {
    logOnDifferentValues: true,
    customName: 'PerpsLimitPriceBottomSheet',
  };
}

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
