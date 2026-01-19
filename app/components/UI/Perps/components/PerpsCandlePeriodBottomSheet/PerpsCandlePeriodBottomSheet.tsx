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
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
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
              CandlePeriod.ONE_MINUTE,
              CandlePeriod.THREE_MINUTES,
              CandlePeriod.FIVE_MINUTES,
              CandlePeriod.FIFTEEN_MINUTES,
              CandlePeriod.THIRTY_MINUTES,
            ].includes(period.value),
          ),
        },
        {
          title: strings('perps.chart.time_periods.hours'),
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
          title: strings('perps.chart.time_periods.days'),
          periods: CANDLE_PERIODS.filter((period) =>
            [
              CandlePeriod.ONE_DAY,
              CandlePeriod.THREE_DAYS, // 2d maps to 3d
              CandlePeriod.ONE_WEEK, // 7d
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
      <HeaderCenter
        title={strings('perps.chart.candle_intervals')}
        onClose={onClose}
      />
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
