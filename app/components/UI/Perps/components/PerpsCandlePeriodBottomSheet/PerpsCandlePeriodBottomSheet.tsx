import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { getCandlePeriodsForDuration } from '../../constants/chartConfig';
import { Box } from '@metamask/design-system-react-native';

interface PerpsCandlePeriodBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedPeriod: string;
  selectedDuration: string; // New prop to determine available periods
  onPeriodChange?: (period: string) => void;
  testID?: string;
}

const PerpsCandlePeriodBottomSheet: React.FC<
  PerpsCandlePeriodBottomSheetProps
> = ({
  isVisible,
  onClose,
  selectedPeriod,
  selectedDuration,
  onPeriodChange,
  testID,
}) => {
  const { colors } = useTheme();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const styles = StyleSheet.create({
    container: {
      // paddingHorizontal: 16,
      paddingTop: 8,
      // paddingBottom: 24, // Extra bottom padding for safe area
    },
    periodOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12, // Reduced from 16 to make more compact
      paddingHorizontal: 16,
      // borderRadius: 8,
      marginBottom: 6, // Reduced from 8 for tighter spacing
      // borderWidth: 1,
      // borderColor: colors.border.muted,
      // backgroundColor: colors.background.default,
    },
    periodOptionActive: {
      backgroundColor: colors.primary.muted,
      borderColor: colors.primary.default,
      borderWidth: 2,
    },
    periodText: {
      // flex: 1,
    },
    periodTextActive: {
      color: colors.primary.default,
      fontWeight: '600',
    },
    checkIcon: {
      marginLeft: 8,
    },
    periodOptionLast: {
      marginBottom: 0,
    },
  });

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  // Get available periods for the selected duration
  const availablePeriods = getCandlePeriodsForDuration(selectedDuration);

  const handlePeriodSelect = (period: string) => {
    onPeriodChange?.(period);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      isFullscreen={false}
      testID={testID}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>Select Candle Period</Text>
      </BottomSheetHeader>
      <Box>
        {availablePeriods.map((period, index) => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.periodOption,
              selectedPeriod === period.value && styles.periodOptionActive,
              index === availablePeriods.length - 1 && styles.periodOptionLast,
            ]}
            onPress={() => handlePeriodSelect(period.value)}
            testID={`${testID}-period-${period.value}`}
          >
            <Text
              variant={TextVariant.BodyMD}
              color={
                selectedPeriod === period.value
                  ? TextColor.Primary
                  : TextColor.Default
              }
              style={[
                styles.periodText,
                selectedPeriod === period.value && styles.periodTextActive,
              ]}
            >
              {period.label}
            </Text>
            {selectedPeriod === period.value && (
              <Icon
                name={IconName.Check}
                size={IconSize.Md}
                color={colors.primary.default}
                style={styles.checkIcon}
              />
            )}
          </TouchableOpacity>
        ))}
      </Box>

      {/* <View style={styles.container}> */}

      {/* </View> */}
    </BottomSheet>
  );
};

PerpsCandlePeriodBottomSheet.displayName = 'PerpsCandlePeriodBottomSheet';

export default PerpsCandlePeriodBottomSheet;
