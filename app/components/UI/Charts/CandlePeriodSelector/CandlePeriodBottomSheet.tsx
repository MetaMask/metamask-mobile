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
} from '@metamask/perps-controller';
import {
  getCandlePeriodBottomSheetSelectors,
  CandlePeriodBottomSheetSelectorsIDs,
} from './testIds';
import { strings } from '../../../../../locales/i18n';

interface CandlePeriodBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  selectedPeriod: CandlePeriod;
  selectedDuration: TimeDuration;
  onPeriodChange?: (period: CandlePeriod) => void;
  showAllPeriods?: boolean;
  testID?: string;
  /**
   * Fires when the sheet becomes visible. Provided so feature-specific
   * analytics can be wired without coupling this shared component to any one
   * feature's tracking layer.
   */
  onViewed?: (selectedPeriod: CandlePeriod) => void;
}

const PERIOD_COLUMNS = 5;

type CandlePeriodOption = Readonly<{
  label: string;
  value: CandlePeriod;
}>;

const CandlePeriodBottomSheet: React.FC<CandlePeriodBottomSheetProps> = ({
  isVisible,
  onClose,
  selectedPeriod,
  selectedDuration,
  onPeriodChange,
  showAllPeriods = false,
  testID,
  onViewed,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const onViewedRef = useRef(onViewed);
  onViewedRef.current = onViewed;

  useEffect(() => {
    if (isVisible) {
      onViewedRef.current?.(selectedPeriod);
      bottomSheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, selectedPeriod]);

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
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handlePeriodSelect = useCallback(
    (period: CandlePeriod) => {
      bottomSheetRef.current?.onCloseBottomSheet(() => {
        onPeriodChange?.(period);
      });
    },
    [onPeriodChange],
  );

  const renderPeriodRow = (periods: readonly CandlePeriodOption[]) =>
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
                ? getCandlePeriodBottomSheetSelectors.periodButton(
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
    <BottomSheet ref={bottomSheetRef} onClose={onClose} testID={testID}>
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: CandlePeriodBottomSheetSelectorsIDs.CLOSE_BUTTON,
        }}
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
                twClassName="pb-2"
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

export default CandlePeriodBottomSheet;
