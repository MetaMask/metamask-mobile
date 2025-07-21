import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
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
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

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

  // Use the current price passed as prop, don't subscribe to updates
  // For existing positions, use the position's entry price as reference
  const currentPrice = position?.entryPrice
    ? parseFloat(position.entryPrice)
    : (initialCurrentPrice || 0);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  // Calculate initial percentages when component mounts or props change
  useEffect(() => {
    if (isVisible) {
      // Calculate initial percentages when opening
      if (initialTakeProfitPrice && currentPrice) {
        const tpPrice = parseFloat(initialTakeProfitPrice);
        const percentage = ((tpPrice - currentPrice) / currentPrice) * 100;
        setTakeProfitPercentage(percentage.toFixed(2));
      }

      if (initialStopLossPrice && currentPrice) {
        const slPrice = parseFloat(initialStopLossPrice);
        const percentage = ((currentPrice - slPrice) / currentPrice) * 100;
        setStopLossPercentage(percentage.toFixed(2));
      }
    }
  }, [isVisible, initialTakeProfitPrice, initialStopLossPrice, currentPrice]);

  // Helper functions to validate individual prices
  const isValidTakeProfitPrice = useCallback((price: string) => {
    if (!currentPrice || !direction || !price) return true;
    const tpPrice = parseFloat(price.replace(/[$,]/g, ''));
    if (isNaN(tpPrice)) return true;
    const isLong = direction === 'long';
    return isLong ? tpPrice > currentPrice : tpPrice < currentPrice;
  }, [currentPrice, direction]);

  const isValidStopLossPrice = useCallback((price: string) => {
    if (!currentPrice || !direction || !price) return true;
    const slPrice = parseFloat(price.replace(/[$,]/g, ''));
    if (isNaN(slPrice)) return true;
    const isLong = direction === 'long';
    return isLong ? slPrice < currentPrice : slPrice > currentPrice;
  }, [currentPrice, direction]);

  const handleConfirm = () => {
    // Parse the formatted prices back to plain numbers for storage
    const parseTakeProfitPrice = takeProfitPrice
      ? takeProfitPrice.replace(/[$,]/g, '')
      : undefined;
    const parseStopLossPrice = stopLossPrice
      ? stopLossPrice.replace(/[$,]/g, '')
      : undefined;

    onConfirm(parseTakeProfitPrice, parseStopLossPrice);
    onClose();
  };

  // Quick percentage buttons
  const takeProfitPercentages = [5, 10, 15, 20];
  const stopLossPercentages = [5, 10, 15, 20];

  const calculatePriceForPercentage = useCallback(
    (percentage: number, isProfit: boolean) => {
      if (!currentPrice) return '';

      // For long positions: profit = price up, loss = price down
      // For short positions: profit = price down, loss = price up
      const isLong = direction === 'long';
      const multiplier = isProfit
        ? (isLong ? 1 + percentage / 100 : 1 - percentage / 100)
        : (isLong ? 1 - percentage / 100 : 1 + percentage / 100);

      const calculatedPrice = currentPrice * multiplier;
      return formatPrice(calculatedPrice);
    },
    [currentPrice, direction],
  );

  const calculatePercentageForPrice = useCallback(
    (price: string, isProfit: boolean) => {
      if (!currentPrice || !price) return '';
      const priceNum = parseFloat(price.replace(/[$,]/g, ''));
      if (isNaN(priceNum)) return '';

      const isLong = direction === 'long';
      const priceDiff = priceNum - currentPrice;
      const percentage = Math.abs((priceDiff / currentPrice) * 100);

      // Validate direction consistency
      if (isProfit) {
        // For profit: long needs higher price, short needs lower price
        const isValidDirection = isLong ? priceDiff > 0 : priceDiff < 0;
        return isValidDirection ? percentage.toFixed(2) : `-${percentage.toFixed(2)}`;
      }
      // For loss: long needs lower price, short needs higher price
      const isValidDirection = isLong ? priceDiff < 0 : priceDiff > 0;
      return isValidDirection ? percentage.toFixed(2) : `-${percentage.toFixed(2)}`;
    },
    [currentPrice, direction],
  );

  // Validate take profit and stop loss prices based on direction
  const validatePrices = useCallback(() => {
    if (!currentPrice || !direction) return true;

    const isLong = direction === 'long';
    let isValid = true;

    if (takeProfitPrice) {
      const tpPrice = parseFloat(takeProfitPrice.replace(/[$,]/g, ''));
      if (!isNaN(tpPrice)) {
        // Long: TP must be above current price, Short: TP must be below
        isValid = isValid && (isLong ? tpPrice > currentPrice : tpPrice < currentPrice);
      }
    }

    if (stopLossPrice) {
      const slPrice = parseFloat(stopLossPrice.replace(/[$,]/g, ''));
      if (!isNaN(slPrice)) {
        // Long: SL must be below current price, Short: SL must be above
        isValid = isValid && (isLong ? slPrice < currentPrice : slPrice > currentPrice);
      }
    }

    return isValid;
  }, [currentPrice, direction, takeProfitPrice, stopLossPrice]);

  const footerButtonProps = [
    {
      label: 'Set',
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleConfirm,
      disabled: !validatePrices(),
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
          Set take profit and stop loss
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        {/* Current price display */}
        <View style={styles.priceDisplay}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {`${asset} - ${currentPrice ? formatPrice(currentPrice) : '$---'}`}
            {position && ` (Entry: ${formatPrice(position.entryPrice)})`}
          </Text>
        </View>

        {/* Take Profit Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.sectionTitle}>
            {strings('perps.order.take_profit')}
          </Text>

          <View style={styles.inputRow}>
            {/* USD Input */}
            <View
              style={[
                styles.inputContainer,
                styles.inputContainerLeft,
                tpPriceInputFocused && styles.inputContainerActive,
                takeProfitPrice && !isValidTakeProfitPrice(takeProfitPrice) && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={styles.input}
                value={takeProfitPrice}
                onChangeText={(text) => {
                  // Allow only numbers and decimal point
                  const sanitized = text.replace(/[^0-9.]/g, '');
                  // Prevent multiple decimal points
                  const parts = sanitized.split('.');
                  if (parts.length > 2) return;
                  setTakeProfitPrice(sanitized);

                  // Update percentage based on price
                  if (sanitized) {
                    const percentage = calculatePercentageForPrice(
                      sanitized,
                      true,
                    );
                    setTakeProfitPercentage(percentage);
                  } else {
                    setTakeProfitPercentage('');
                  }
                  setSelectedTpPercentage(null);
                }}
                placeholder="0"
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
                USD
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
                onChangeText={(text) => {
                  // Allow only numbers and decimal point
                  const sanitized = text.replace(/[^0-9.]/g, '');
                  // Prevent multiple decimal points
                  const parts = sanitized.split('.');
                  if (parts.length > 2) return;
                  setTakeProfitPercentage(sanitized);

                  // Update price based on percentage
                  if (sanitized && !isNaN(parseFloat(sanitized))) {
                    const price = calculatePriceForPercentage(
                      parseFloat(sanitized),
                      true,
                    );
                    setTakeProfitPrice(price);
                    setSelectedTpPercentage(parseFloat(sanitized));
                  } else {
                    setTakeProfitPrice('');
                    setSelectedTpPercentage(null);
                  }
                }}
                placeholder="0"
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

          <View style={styles.percentageRow}>
            {takeProfitPercentages.map((percentage) => (
              <TouchableOpacity
                key={percentage}
                style={[
                  styles.percentageButton,
                  selectedTpPercentage === percentage &&
                  styles.percentageButtonActive,
                ]}
                onPress={() => {
                  const price = calculatePriceForPercentage(percentage, true);
                  setTakeProfitPrice(price);
                  setTakeProfitPercentage(percentage.toString());
                  setSelectedTpPercentage(percentage);
                }}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={
                    selectedTpPercentage === percentage
                      ? TextColor.Inverse
                      : TextColor.Default
                  }
                >
                  +{percentage}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {takeProfitPrice && !isValidTakeProfitPrice(takeProfitPrice) && direction && (
            <Text variant={TextVariant.BodySM} color={TextColor.Error} style={styles.helperText}>
              {strings('perps.validation.invalid_take_profit', {
                direction: direction === 'long' ? 'above' : 'below',
                positionType: direction
              })}
            </Text>
          )}
        </View>

        {/* Stop Loss Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.sectionTitle}>
            {strings('perps.order.stop_loss')}
          </Text>

          <View style={styles.inputRow}>
            {/* USD Input */}
            <View
              style={[
                styles.inputContainer,
                styles.inputContainerLeft,
                slPriceInputFocused && styles.inputContainerActive,
                stopLossPrice && !isValidStopLossPrice(stopLossPrice) && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={styles.input}
                value={stopLossPrice}
                onChangeText={(text) => {
                  // Allow only numbers and decimal point
                  const sanitized = text.replace(/[^0-9.]/g, '');
                  // Prevent multiple decimal points
                  const parts = sanitized.split('.');
                  if (parts.length > 2) return;
                  setStopLossPrice(sanitized);

                  // Update percentage based on price
                  if (sanitized) {
                    const percentage = calculatePercentageForPrice(
                      sanitized,
                      false,
                    );
                    setStopLossPercentage(percentage);
                  } else {
                    setStopLossPercentage('');
                  }
                  setSelectedSlPercentage(null);
                }}
                placeholder="0"
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
                USD
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
                onChangeText={(text) => {
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
                    );
                    setStopLossPrice(price);
                    setSelectedSlPercentage(parseFloat(sanitized));
                  } else {
                    setStopLossPrice('');
                    setSelectedSlPercentage(null);
                  }
                }}
                placeholder="0"
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

          <View style={styles.percentageRow}>
            {stopLossPercentages.map((percentage) => (
              <TouchableOpacity
                key={percentage}
                style={[
                  styles.percentageButton,
                  selectedSlPercentage === percentage &&
                  styles.percentageButtonActive,
                ]}
                onPress={() => {
                  const price = calculatePriceForPercentage(percentage, false);
                  setStopLossPrice(price);
                  setStopLossPercentage(percentage.toString());
                  setSelectedSlPercentage(percentage);
                }}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={
                    selectedSlPercentage === percentage
                      ? TextColor.Inverse
                      : TextColor.Default
                  }
                >
                  -{percentage}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {stopLossPrice && !isValidStopLossPrice(stopLossPrice) && direction && (
            <Text variant={TextVariant.BodySM} color={TextColor.Error} style={styles.helperText}>
              {strings('perps.validation.invalid_stop_loss', {
                direction: direction === 'long' ? 'below' : 'above',
                positionType: direction
              })}
            </Text>
          )}
        </View>
      </View>

      <BottomSheetFooter buttonPropsArray={footerButtonProps} />
    </BottomSheet>
  );
};

PerpsTPSLBottomSheet.displayName = 'PerpsTPSLBottomSheet';

export default memo(
  PerpsTPSLBottomSheet,
  (prevProps, nextProps) =>
    // Only re-render if these props change
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.asset === nextProps.asset &&
    prevProps.direction === nextProps.direction &&
    prevProps.initialTakeProfitPrice === nextProps.initialTakeProfitPrice &&
    prevProps.initialStopLossPrice === nextProps.initialStopLossPrice,
);
