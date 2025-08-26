import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
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
import { formatPrice } from '../../utils/formatUtils';
import { createStyles } from './PerpsLimitPriceBottomSheet.styles';
import { usePerpsLivePrices } from '../../hooks/stream';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';

interface PerpsLimitPriceBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (limitPrice: string) => void;
  asset: string;
  limitPrice?: string;
  currentPrice?: number;
  direction?: 'long' | 'short';
}

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
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

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
    }
  }, [isVisible]);

  const handleConfirm = () => {
    // Remove any formatting (commas, dollar signs) before passing the value
    const cleanPrice = limitPrice.replace(/[$,]/g, '');
    onConfirm(cleanPrice);
    onClose();
  };

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      setLimitPrice(value || '');
    },
    [],
  );

  const calculatePriceForPercentage = useCallback(
    (percentage: number) => {
      // Use the current market price (not limit price) for percentage calculations
      const basePrice = currentPrice;

      if (!basePrice || basePrice === 0) {
        return '';
      }

      const multiplier = 1 + percentage / 100;
      const calculatedPrice = basePrice * multiplier;
      // Return the raw numeric value as a string (without formatting)
      // The display will format it when needed
      return calculatedPrice.toFixed(2);
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
              : formatPrice(limitPrice, {
                  minimumDecimals: 2,
                  maximumDecimals: 2,
                })}
          </Text>
          <Text style={styles.limitPriceCurrency}>USD</Text>
        </View>

        {/* Current market price below input */}
        <Text style={styles.marketPriceText}>
          {asset}-USD{' '}
          {currentPrice
            ? formatPrice(currentPrice, {
                minimumDecimals: 2,
                maximumDecimals: 2,
              })
            : PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY}
        </Text>

        {/* Quick percentage buttons - TAT-1411: Direction-specific presets */}
        <View style={styles.percentageButtonsRow}>
          {direction === 'long' ? (
            // For long orders: buy below market (-1%, -2%, -5%, -10%)
            <>
              <TouchableOpacity
                style={styles.percentageButton}
                onPress={() => setLimitPrice(calculatePriceForPercentage(-1))}
              >
                <Text variant={TextVariant.BodyMD}>-1%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.percentageButton}
                onPress={() => setLimitPrice(calculatePriceForPercentage(-2))}
              >
                <Text variant={TextVariant.BodyMD}>-2%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.percentageButton}
                onPress={() => setLimitPrice(calculatePriceForPercentage(-5))}
              >
                <Text variant={TextVariant.BodyMD}>-5%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.percentageButton}
                onPress={() => setLimitPrice(calculatePriceForPercentage(-10))}
              >
                <Text variant={TextVariant.BodyMD}>-10%</Text>
              </TouchableOpacity>
            </>
          ) : (
            // For short orders: sell above market (+1%, +2%, +5%, +10%)
            <>
              <TouchableOpacity
                style={styles.percentageButton}
                onPress={() => setLimitPrice(calculatePriceForPercentage(1))}
              >
                <Text variant={TextVariant.BodyMD}>+1%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.percentageButton}
                onPress={() => setLimitPrice(calculatePriceForPercentage(2))}
              >
                <Text variant={TextVariant.BodyMD}>+2%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.percentageButton}
                onPress={() => setLimitPrice(calculatePriceForPercentage(5))}
              >
                <Text variant={TextVariant.BodyMD}>+5%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.percentageButton}
                onPress={() => setLimitPrice(calculatePriceForPercentage(10))}
              >
                <Text variant={TextVariant.BodyMD}>+10%</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Keypad */}
        <View style={styles.keypadContainer}>
          <Keypad
            value={limitPrice}
            onChange={handleKeypadChange}
            currency="USD"
            decimals={2}
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
