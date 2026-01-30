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
import { getPerpsCandlePeriodBottomSheetSelector } from '../../Perps.testIds';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PerpsCandlePeriodBottomSheet.styles';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';

interface PerpsCandlePeriodBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedPeriod: CandlePeriod;
  selectedDuration: TimeDuration;
  onPeriodChange?: (period: CandlePeriod) => void;
  showAllPeriods?: boolean;
  testID?: string;
  // For tracking
  asset?: string;
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
  asset,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { track } = usePerpsEventTracking();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      // Track candle periods bottom sheet viewed when it becomes visible
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.CANDLE_PERIOD_VIEWED,
        [PerpsEventProperties.ASSET]: asset || '',
        [PerpsEventProperties.CANDLE_PERIOD]: selectedPeriod,
        [PerpsEventProperties.SOURCE]:
          PerpsEventValues.SOURCE.PERP_ASSET_SCREEN,
      });

      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, track, asset, selectedPeriod]);

  const availablePeriods = showAllPeriods
    ? CANDLE_PERIODS
    : getCandlePeriodsForDuration(selectedDuration);

  const periodSections = showAllPeriods
    ? [
        {
          title: strings('perps.chart.time_periods.minutes'),
          periods: CANDLE_PERIODS.filter((period) =>
            [
              CandlePeriod.OneMinute,
              CandlePeriod.ThreeMinutes,
              CandlePeriod.FiveMinutes,
              CandlePeriod.FifteenMinutes,
              CandlePeriod.ThirtyMinutes,
            ].includes(period.value),
          ),
        },
        {
          title: strings('perps.chart.time_periods.hours'),
          periods: CANDLE_PERIODS.filter((period) =>
            [
              CandlePeriod.OneHour,
              CandlePeriod.TwoHours,
              CandlePeriod.FourHours,
              CandlePeriod.EightHours,
              CandlePeriod.TwelveHours,
            ].includes(period.value),
          ),
        },
        {
          title: strings('perps.chart.time_periods.days'),
          periods: CANDLE_PERIODS.filter((period) =>
            [
              CandlePeriod.OneDay,
              CandlePeriod.ThreeDays, // 2d maps to 3d
              CandlePeriod.OneWeek, // 7d
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
