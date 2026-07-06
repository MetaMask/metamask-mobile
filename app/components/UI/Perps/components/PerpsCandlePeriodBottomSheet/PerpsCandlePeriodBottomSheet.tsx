import React, { useRef, useEffect, useCallback } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  FilterButton,
  FilterButtonSize,
  FilterButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import {
  getCandlePeriodsForDuration,
  CandlePeriod,
  TimeDuration,
  CANDLE_PERIODS,
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { getPerpsCandlePeriodBottomSheetSelector } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

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

const PERIOD_COLUMNS = 5;

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
  const surfaceClass = useElevatedSurface();
  const { track } = usePerpsEventTracking();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      // Track candle periods bottom sheet viewed when it becomes visible
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.CANDLE_PERIOD_VIEWED,
        [PERPS_EVENT_PROPERTY.ASSET]: asset || '',
        [PERPS_EVENT_PROPERTY.CANDLE_PERIOD]: selectedPeriod,
        [PERPS_EVENT_PROPERTY.SOURCE]:
          PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
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

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handlePeriodSelect = useCallback(
    (period: CandlePeriod) => {
      bottomSheetRef.current?.onCloseBottomSheet(() => {
        onPeriodChange?.(period);
      });
    },
    [onPeriodChange],
  );

  const renderPeriodRow = (periods: { label: string; value: CandlePeriod }[]) =>
    Array.from({ length: PERIOD_COLUMNS }, (_, index) => {
      const period = periods[index];

      if (!period) {
        return <Box key={`period-spacer-${index}`} twClassName="flex-1" />;
      }

      const isSelected = selectedPeriod === period.value;

      return (
        <Box key={period.value} twClassName="flex-1">
          <FilterButton
            isSelected={isSelected}
            variant={FilterButtonVariant.Primary}
            size={FilterButtonSize.Md}
            onPress={() => handlePeriodSelect(period.value)}
            isFullWidth
            testID={
              testID
                ? getPerpsCandlePeriodBottomSheetSelector.periodButton(
                    testID,
                    period.value,
                  )
                : undefined
            }
          >
            {period.label}
          </FilterButton>
        </Box>
      );
    });

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={onClose}
      testID={testID}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: 'close-button' }}
      >
        {strings('perps.chart.candle_intervals')}
      </BottomSheetHeader>
      <Box twClassName="px-4">
        {showAllPeriods && periodSections ? (
          periodSections.map((section, sectionIndex) => (
            <Box
              key={section.title}
              twClassName={sectionIndex > 0 ? 'mt-4' : undefined}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                twClassName="py-2"
              >
                {section.title}
              </Text>
              <Box twClassName="flex-row gap-2">
                {renderPeriodRow(section.periods)}
              </Box>
            </Box>
          ))
        ) : (
          <Box twClassName="flex-row gap-2">
            {renderPeriodRow(availablePeriods)}
          </Box>
        )}
      </Box>
    </BottomSheet>
  );
};

export default PerpsCandlePeriodBottomSheet;
