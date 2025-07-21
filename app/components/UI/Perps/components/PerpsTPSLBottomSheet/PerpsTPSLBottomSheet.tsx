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

  const [takeProfitEnabled, setTakeProfitEnabled] = useState(
    !!initialTakeProfitPrice,
  );
  const [stopLossEnabled, setStopLossEnabled] = useState(
    !!initialStopLossPrice,
  );
  const [takeProfitPrice, setTakeProfitPrice] = useState(
    initialTakeProfitPrice ? formatPrice(initialTakeProfitPrice) : '',
  );
  const [stopLossPrice, setStopLossPrice] = useState(
    initialStopLossPrice ? formatPrice(initialStopLossPrice) : '',
  );
  const [tpInputFocused, setTpInputFocused] = useState(false);
  const [slInputFocused, setSlInputFocused] = useState(false);
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
    }
  }, [isVisible]);

  const handleConfirm = () => {
    // Parse the formatted prices back to plain numbers for storage
    const parseTakeProfitPrice =
      takeProfitEnabled && takeProfitPrice
        ? takeProfitPrice.replace(/[$,]/g, '')
        : undefined;
    const parseStopLossPrice =
      stopLossEnabled && stopLossPrice
        ? stopLossPrice.replace(/[$,]/g, '')
        : undefined;

    onConfirm(parseTakeProfitPrice, parseStopLossPrice);
    onClose();
  };

  // Quick percentage buttons
  const takeProfitPercentages = [5, 10, 25, 50];
  const stopLossPercentages = [5, 10, 25, 50];

  const calculatePriceForPercentage = useCallback(
    (percentage: number, isProfit: boolean) => {
      if (!currentPrice) return '';
      const multiplier = isProfit ? 1 + percentage / 100 : 1 - percentage / 100;
      const calculatedPrice = currentPrice * multiplier;
      return formatPrice(calculatedPrice);
    },
    [currentPrice],
  );

  const footerButtonProps = [
    {
      label: strings('perps.order.tpsl_modal.save'),
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
          {strings('perps.order.tpsl_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        {/* Current price display */}
        <View style={styles.priceDisplay}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('perps.order.tpsl_modal.current_price', {
              price: currentPrice ? formatPrice(currentPrice) : '$---',
            })}
          </Text>
        </View>

        {/* Take Profit Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.sectionTitle}>
            {strings('perps.order.take_profit')}
          </Text>

          <View
            style={[
              styles.inputContainer,
              tpInputFocused && styles.inputContainerActive,
            ]}
          >
            <Text variant={TextVariant.BodyLGMedium} style={styles.inputPrefix}>
              $
            </Text>
            {takeProfitEnabled ? (
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
                  // Clear selected percentage when user manually types
                  setSelectedTpPercentage(null);
                }}
                placeholder="0.00"
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                onFocus={() => setTpInputFocused(true)}
                onBlur={() => {
                  setTpInputFocused(false);
                  // Format on blur if there's a value
                  if (takeProfitPrice && !isNaN(parseFloat(takeProfitPrice))) {
                    setTakeProfitPrice(formatPrice(takeProfitPrice));
                  }
                }}
              />
            ) : (
              <View style={styles.input} />
            )}
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => {
                setTakeProfitEnabled(!takeProfitEnabled);
                if (!takeProfitEnabled) {
                  setTakeProfitPrice(calculatePriceForPercentage(10, true));
                  setSelectedTpPercentage(10);
                } else {
                  setTakeProfitPrice('');
                  setSelectedTpPercentage(null);
                }
              }}
            >
              <Text
                variant={TextVariant.BodyMD}
                color={
                  takeProfitEnabled ? TextColor.Success : TextColor.Alternative
                }
              >
                {takeProfitEnabled
                  ? strings('perps.order.tpsl_modal.on')
                  : strings('perps.order.tpsl_modal.off')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.percentageRow}>
            {takeProfitPercentages.map((percentage) => (
              <TouchableOpacity
                key={percentage}
                style={[
                  styles.percentageButton,
                  takeProfitEnabled &&
                    selectedTpPercentage === percentage &&
                    styles.percentageButtonActive,
                  !takeProfitEnabled && styles.percentageButtonDisabled,
                ]}
                onPress={() => {
                  if (takeProfitEnabled) {
                    setTakeProfitPrice(
                      calculatePriceForPercentage(percentage, true),
                    );
                    setSelectedTpPercentage(percentage);
                  }
                }}
                disabled={!takeProfitEnabled}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={
                    !takeProfitEnabled
                      ? TextColor.Muted
                      : selectedTpPercentage === percentage
                      ? TextColor.Primary
                      : TextColor.Default
                  }
                >
                  +{percentage}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
            style={styles.helperText}
          >
            {strings('perps.order.tpsl_modal.take_profit_helper')}
          </Text>
        </View>

        {/* Stop Loss Section */}
        <View style={styles.section}>
          <Text variant={TextVariant.BodyLGMedium} style={styles.sectionTitle}>
            {strings('perps.order.stop_loss')}
          </Text>

          <View
            style={[
              styles.inputContainer,
              slInputFocused && styles.inputContainerActive,
            ]}
          >
            <Text variant={TextVariant.BodyLGMedium} style={styles.inputPrefix}>
              $
            </Text>
            {stopLossEnabled ? (
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
                  // Clear selected percentage when user manually types
                  setSelectedSlPercentage(null);
                }}
                placeholder="0.00"
                placeholderTextColor={colors.text.muted}
                keyboardType="numeric"
                onFocus={() => setSlInputFocused(true)}
                onBlur={() => {
                  setSlInputFocused(false);
                  // Format on blur if there's a value
                  if (stopLossPrice && !isNaN(parseFloat(stopLossPrice))) {
                    setStopLossPrice(formatPrice(stopLossPrice));
                  }
                }}
              />
            ) : (
              <View style={styles.input} />
            )}
            <TouchableOpacity
              style={styles.toggle}
              onPress={() => {
                setStopLossEnabled(!stopLossEnabled);
                if (!stopLossEnabled) {
                  setStopLossPrice(calculatePriceForPercentage(10, false));
                  setSelectedSlPercentage(10);
                } else {
                  setStopLossPrice('');
                  setSelectedSlPercentage(null);
                }
              }}
            >
              <Text
                variant={TextVariant.BodyMD}
                color={
                  stopLossEnabled ? TextColor.Error : TextColor.Alternative
                }
              >
                {stopLossEnabled
                  ? strings('perps.order.tpsl_modal.on')
                  : strings('perps.order.tpsl_modal.off')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.percentageRow}>
            {stopLossPercentages.map((percentage) => (
              <TouchableOpacity
                key={percentage}
                style={[
                  styles.percentageButton,
                  stopLossEnabled &&
                    selectedSlPercentage === percentage &&
                    styles.percentageButtonActive,
                  !stopLossEnabled && styles.percentageButtonDisabled,
                ]}
                onPress={() => {
                  if (stopLossEnabled) {
                    setStopLossPrice(
                      calculatePriceForPercentage(percentage, false),
                    );
                    setSelectedSlPercentage(percentage);
                  }
                }}
                disabled={!stopLossEnabled}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={
                    !stopLossEnabled
                      ? TextColor.Muted
                      : selectedSlPercentage === percentage
                      ? TextColor.Primary
                      : TextColor.Default
                  }
                >
                  -{percentage}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
            style={styles.helperText}
          >
            {strings('perps.order.tpsl_modal.stop_loss_helper')}
          </Text>
        </View>
      </View>

      <BottomSheetFooter buttonPropsArray={footerButtonProps} />
    </BottomSheet>
  );
};

PerpsTPSLBottomSheet.displayName = 'PerpsTPSLBottomSheet';

export default PerpsTPSLBottomSheet;
