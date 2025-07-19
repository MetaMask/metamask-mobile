import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
  type NavigationProp,
} from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
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
import { Theme } from '../../../../../util/theme/models';
import { formatPrice } from '../../utils/formatUtils';
import type { PerpsNavigationParamList } from '../../controllers/types';
import { strings } from '../../../../../../locales/i18n';

interface TPSLRouteParams {
  currentPrice: number;
  takeProfitPrice?: string;
  stopLossPrice?: string;
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    priceDisplay: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 24,
      alignItems: 'center',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      marginBottom: 8,
    },
    inputContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    inputContainerActive: {
      borderColor: colors.primary.default,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      paddingVertical: 0,
    },
    inputPrefix: {
      marginRight: 8,
    },
    toggle: {
      marginLeft: 16,
    },
    percentageRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    percentageButton: {
      flex: 1,
      marginHorizontal: 4,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      alignItems: 'center',
    },
    percentageButtonActive: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
    },
    percentageButtonDisabled: {
      opacity: 0.5,
      backgroundColor: colors.background.disabled || colors.background.alternative,
    },
    helperText: {
      marginTop: 4,
    },
  });

const PerpsTPSLBottomSheet: React.FC = () => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<RouteProp<{ params: TPSLRouteParams }, 'params'>>();
  const {
    currentPrice,
    takeProfitPrice: initialTP,
    stopLossPrice: initialSL,
  } = route.params || {};

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const [takeProfitEnabled, setTakeProfitEnabled] = useState(!!initialTP);
  const [stopLossEnabled, setStopLossEnabled] = useState(!!initialSL);
  const [takeProfitPrice, setTakeProfitPrice] = useState(
    initialTP ? formatPrice(initialTP) : '',
  );
  const [stopLossPrice, setStopLossPrice] = useState(
    initialSL ? formatPrice(initialSL) : '',
  );
  const [tpInputFocused, setTpInputFocused] = useState(false);
  const [slInputFocused, setSlInputFocused] = useState(false);

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet();
  }, []);

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

    // Navigate directly to order screen
    navigation.navigate(Routes.PERPS.ORDER, {
      tpslUpdate: {
        takeProfitPrice: parseTakeProfitPrice,
        stopLossPrice: parseStopLossPrice,
      },
    });
  };

  const handleClose = () => {
    navigation.goBack();
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

  return (
    <BottomSheet ref={bottomSheetRef}>
      <BottomSheetHeader onClose={handleClose}>
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
                } else {
                  setTakeProfitPrice('');
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
                    takeProfitPrice ===
                      calculatePriceForPercentage(percentage, true) &&
                    styles.percentageButtonActive,
                  !takeProfitEnabled && styles.percentageButtonDisabled,
                ]}
                onPress={() =>
                  takeProfitEnabled &&
                  setTakeProfitPrice(
                    calculatePriceForPercentage(percentage, true),
                  )
                }
                disabled={!takeProfitEnabled}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={
                    !takeProfitEnabled
                      ? TextColor.Disabled
                      : takeProfitPrice ===
                        calculatePriceForPercentage(percentage, true)
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
                } else {
                  setStopLossPrice('');
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
                    stopLossPrice ===
                      calculatePriceForPercentage(percentage, false) &&
                    styles.percentageButtonActive,
                  !stopLossEnabled && styles.percentageButtonDisabled,
                ]}
                onPress={() =>
                  stopLossEnabled &&
                  setStopLossPrice(
                    calculatePriceForPercentage(percentage, false),
                  )
                }
                disabled={!stopLossEnabled}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={
                    !stopLossEnabled
                      ? TextColor.Disabled
                      : stopLossPrice ===
                        calculatePriceForPercentage(percentage, false)
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
