import React, { useRef, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  getCandlePeriodsForDuration,
  CandlePeriod,
  TimeDuration,
} from '../../constants/chartConfig';
import { getPerpsCandlePeriodBottomSheetSelector } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { Box } from '@metamask/design-system-react-native';
import styleSheet from './PerpsCandlePeriodBottomSheet.styles';

interface PerpsCandlePeriodBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedPeriod: CandlePeriod;
  selectedDuration: TimeDuration;
  onPeriodChange?: (period: CandlePeriod) => void;
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
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  // Get available periods for the selected duration
  const availablePeriods = getCandlePeriodsForDuration(selectedDuration);

  const handlePeriodSelect = (period: CandlePeriod) => {
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
            testID={
              testID
                ? getPerpsCandlePeriodBottomSheetSelector.periodButton(
                    testID,
                    period.value,
                  )
                : undefined
            }
          >
            <Text
              variant={
                selectedPeriod === period.value
                  ? TextVariant.BodyMDBold
                  : TextVariant.BodyMD
              }
              color={
                selectedPeriod === period.value
                  ? TextColor.Primary
                  : TextColor.Default
              }
            >
              {period.label}
            </Text>
            {selectedPeriod === period.value && (
              <Icon
                name={IconName.Check}
                size={IconSize.Md}
                color={IconColor.Primary}
                style={styles.checkIcon}
              />
            )}
          </TouchableOpacity>
        ))}
      </Box>
    </BottomSheet>
  );
};

export default PerpsCandlePeriodBottomSheet;
