import React, { useRef, forwardRef, useImperativeHandle, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { Theme } from '../../../../../util/theme/models';
import PerpsSlider from '../PerpsSlider';

export interface PerpsLeverageBottomSheetRef {
  open: () => void;
  close: () => void;
}

interface Props {
  leverage: number;
  onLeverageChange: (leverage: number) => void;
  minLeverage?: number;
  maxLeverage?: number;
  onClose?: () => void;
  currentPrice?: number;
  liquidationPrice?: number;
}

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
      maxHeight: 500,
    },
    contentContainer: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    leverageDisplay: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    leverageText: {
      fontSize: 48,
      fontWeight: '600',
      color: colors.text.default,
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      marginBottom: 24,
    },
    warningIcon: {
      marginRight: 8,
    },
    priceInfoContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
      marginBottom: 32,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    sliderContainer: {
      marginBottom: 16,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    quickSelectButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24,
      marginBottom: 16,
    },
    quickSelectButton: {
      flex: 1,
      marginHorizontal: 4,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
    },
    quickSelectButtonActive: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
    },
    quickSelectText: {
      fontWeight: '500',
    },
  });

const PerpsLeverageBottomSheet = forwardRef<PerpsLeverageBottomSheetRef, Props>(
  ({ leverage, onLeverageChange, minLeverage = 1, maxLeverage = 50, onClose, currentPrice = 121730, liquidationPrice = 103470 }, ref) => {
    const { colors } = useTheme();
    const bottomSheetRef = useRef<BottomSheetRef>(null);
    const [tempLeverage, setTempLeverage] = useState(leverage);
    const styles = createStyles(colors);

    useImperativeHandle(ref, () => ({
      open: () => {
        setTempLeverage(leverage);
        bottomSheetRef.current?.onOpenBottomSheet();
      },
      close: () => {
        bottomSheetRef.current?.onCloseBottomSheet();
      },
    }));

    const handleConfirm = () => {
      onLeverageChange(tempLeverage);
      bottomSheetRef.current?.onCloseBottomSheet();
      onClose?.();
    };

    const handleClose = () => {
      bottomSheetRef.current?.onCloseBottomSheet();
      onClose?.();
    };

    // Calculate liquidation percentage drop
    const calculateLiquidationDrop = (lev: number) =>
      // For long positions: drop = 100 / leverage - maintenance margin
      // Simplified calculation for display
       Math.floor(100 / lev * 0.85) // 85% of the theoretical max to account for fees
    ;

    // Updated quick select values to match design
    const quickSelectValues = [2, 5, 10, 20, 40];

    const footerButtonProps = [
      {
        label: `Set ${tempLeverage}x`,
        variant: ButtonVariants.Primary,
        size: ButtonSize.Lg,
        onPress: handleConfirm,
      },
    ];

    return (
      <BottomSheet ref={bottomSheetRef} shouldNavigateBack={false}>
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingMD}>Leverage</Text>
        </BottomSheetHeader>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Large leverage display */}
          <View style={styles.leverageDisplay}>
            <Text variant={TextVariant.DisplayMD} style={styles.leverageText}>
              {tempLeverage}x
            </Text>
          </View>

          {/* Liquidation warning */}
          <View style={styles.warningContainer}>
            <Icon
              name={IconName.Danger}
              size={IconSize.Sm}
              color={IconColor.Warning}
              style={styles.warningIcon}
            />
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              You will be liquidated if price drops by {calculateLiquidationDrop(tempLeverage)}%
            </Text>
          </View>

          {/* Price information */}
          <View style={styles.priceInfoContainer}>
            <View style={styles.priceRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                Liquidation price
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                ${liquidationPrice.toLocaleString()}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                Current price
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                ${currentPrice.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Slider */}
          <View style={styles.sliderContainer}>
            <PerpsSlider
              value={tempLeverage}
              onValueChange={setTempLeverage}
              minimumValue={minLeverage}
              maximumValue={maxLeverage}
              step={1}
              showPercentageLabels={false}
            />
            <View style={styles.sliderLabels}>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {minLeverage}x
              </Text>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {maxLeverage}x
              </Text>
            </View>
          </View>

          {/* Quick select buttons */}
          <View style={styles.quickSelectButtons}>
            {quickSelectValues.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickSelectButton,
                  tempLeverage === value && styles.quickSelectButtonActive,
                ]}
                onPress={() => setTempLeverage(value)}
              >
                <Text
                  variant={TextVariant.BodyLGMedium}
                  color={
                    tempLeverage === value
                      ? TextColor.Primary
                      : TextColor.Default
                  }
                  style={styles.quickSelectText}
                >
                  {value}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <BottomSheetFooter buttonPropsArray={footerButtonProps} />
      </BottomSheet>
    );
  }
);

PerpsLeverageBottomSheet.displayName = 'PerpsLeverageBottomSheet';

export default PerpsLeverageBottomSheet;
