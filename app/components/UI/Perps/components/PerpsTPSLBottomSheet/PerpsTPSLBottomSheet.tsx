import React, { useRef, useState, useCallback, useEffect } from 'react';
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
import { usePerpsPrices } from '../../hooks';
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
  // direction, // TODO: Use for validation
  // position, // TODO: Use for existing position TP/SL
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

  // Get real-time price updates
  const priceData = usePerpsPrices([asset]);
  const livePrice = priceData[asset];
  const currentPrice = livePrice?.price
    ? parseFloat(livePrice.price)
    : initialCurrentPrice || 0;

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();

      // Calculate initial percentages if prices are provided
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
      const multiplier = isProfit ? 1 + percentage / 100 : 1 - percentage / 100;
      const calculatedPrice = currentPrice * multiplier;
      return formatPrice(calculatedPrice);
    },
    [currentPrice],
  );

  const calculatePercentageForPrice = useCallback(
    (price: string, isProfit: boolean) => {
      if (!currentPrice || !price) return '';
      const priceNum = parseFloat(price.replace(/[$,]/g, ''));
      if (isNaN(priceNum)) return '';

      if (isProfit) {
        const percentage = ((priceNum - currentPrice) / currentPrice) * 100;
        return percentage.toFixed(2);
      }
      const percentage = ((currentPrice - priceNum) / currentPrice) * 100;
      return percentage.toFixed(2);
    },
    [currentPrice],
  );

  const footerButtonProps = [
    {
      label: 'Set',
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleConfirm,
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
        </View>
      </View>

      <BottomSheetFooter buttonPropsArray={footerButtonProps} />
    </BottomSheet>
  );
};

PerpsTPSLBottomSheet.displayName = 'PerpsTPSLBottomSheet';

export default PerpsTPSLBottomSheet;
