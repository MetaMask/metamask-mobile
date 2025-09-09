import React, { useRef, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  getCandlePeriodsForDuration,
  CandlePeriod,
  TimeDuration,
  CANDLE_PERIODS,
} from '../../constants/chartConfig';
import { getPerpsCandlePeriodBottomSheetSelector } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PerpsCandlePeriodBottomSheet.styles';

interface PerpsCandlePeriodBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedPeriod: CandlePeriod;
  selectedDuration: TimeDuration;
  onPeriodChange?: (period: CandlePeriod) => void;
  showAllPeriods?: boolean;
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
  showAllPeriods = false,
  testID,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const availablePeriods = showAllPeriods
    ? CANDLE_PERIODS
    : getCandlePeriodsForDuration(selectedDuration);

  const periodSections = showAllPeriods
    ? [
        {
          title: 'Minutes',
          periods: CANDLE_PERIODS.filter((period) =>
            [
              CandlePeriod.ONE_MINUTE,
              CandlePeriod.THREE_MINUTES,
              CandlePeriod.FIVE_MINUTES,
              CandlePeriod.FIFTEEN_MINUTES,
              CandlePeriod.THIRTY_MINUTES,
            ].includes(period.value),
          ),
        },
        {
          title: 'Hours',
          periods: CANDLE_PERIODS.filter((period) =>
            [
              CandlePeriod.ONE_HOUR,
              CandlePeriod.TWO_HOURS,
              CandlePeriod.FOUR_HOURS,
              CandlePeriod.EIGHT_HOURS,
              CandlePeriod.TWELVE_HOURS,
            ].includes(period.value),
          ),
        },
        {
          title: 'Days',
          periods: CANDLE_PERIODS.filter((period) =>
            [
              CandlePeriod.ONE_DAY,
              CandlePeriod.THREE_DAYS, // 2d maps to 3d
              CandlePeriod.ONE_WEEK, // 7d
              CandlePeriod.ONE_MONTH, // 30d
            ].includes(period.value),
          ),
        },
      ]
    : null;

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
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.chart.candle_intervals')}
        </Text>
      </BottomSheetHeader>
      <Box>
        {showAllPeriods && periodSections ? (
          periodSections.map((section, sectionIndex) => (
            <Box
              key={section.title}
              style={sectionIndex > 0 ? styles.sectionSpacing : undefined}
            >
              <Text
                variant={TextVariant.BodyMDBold}
                color={TextColor.Alternative}
                style={styles.sectionTitle}
              >
                {section.title}
              </Text>
              <Box style={styles.periodOptionsGrid}>
                {section.periods.map((period) => (
                  <TouchableOpacity
                    key={period.value}
                    style={[
                      styles.periodOption,
                      selectedPeriod === period.value &&
                        styles.periodOptionActive,
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
                          : TextVariant.BodySMMedium
                      }
                      color={
                        selectedPeriod === period.value
                          ? TextColor.Inverse
                          : TextColor.Default
                      }
                    >
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Box>
            </Box>
          ))
        ) : (
          <Box style={styles.periodOptionsGrid}>
            {availablePeriods.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodOption,
                  selectedPeriod === period.value && styles.periodOptionActive,
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
                      : TextVariant.BodySMMedium
                  }
                  color={
                    selectedPeriod === period.value
                      ? TextColor.Inverse
                      : TextColor.Default
                  }
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Box>
        )}
      </Box>
    </BottomSheet>
  );
};

export default PerpsCandlePeriodBottomSheet;
