import React, { useCallback, useMemo } from 'react';
import {
  Box,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
  SelectButton,
  SelectButtonSize,
  SelectButtonVariant,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CandlePeriod, CANDLE_PERIODS } from '@metamask/perps-controller';
import { getPerpsCandlePeriodSelector } from '../../Perps.testIds';

export interface PerpsCandlePeriodOption {
  label: string;
  value: CandlePeriod;
}

export const DEFAULT_CANDLE_PERIODS = [
  { label: '1min', value: CandlePeriod.OneMinute },
  { label: '3min', value: CandlePeriod.ThreeMinutes },
  { label: '5min', value: CandlePeriod.FiveMinutes },
  { label: '15min', value: CandlePeriod.FifteenMinutes },
] as const satisfies readonly PerpsCandlePeriodOption[];

const getCandlePeriodLabel = (period: CandlePeriod | string): string => {
  const candlePeriod = CANDLE_PERIODS.find(
    (p) => p.value?.toLowerCase() === period?.toLowerCase(),
  );
  return candlePeriod?.label || period;
};

interface PerpsCandlePeriodSelectorProps {
  selectedPeriod: CandlePeriod | string;
  onPeriodChange?: (period: CandlePeriod) => void;
  onMorePress?: () => void;
  visiblePeriods?: readonly PerpsCandlePeriodOption[];
  twClassName?: string;
  groupTwClassName?: string;
  filterVariant?: FilterButtonVariant;
  periodButtonTwClassName?: string;
  moreButtonTwClassName?: string;
  textVariant?: TextVariant;
  testID?: string;
}

const PerpsCandlePeriodSelector: React.FC<PerpsCandlePeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  onMorePress,
  visiblePeriods = DEFAULT_CANDLE_PERIODS,
  twClassName = 'w-full items-center py-3',
  groupTwClassName = 'gap-1 grow justify-center',
  filterVariant = FilterButtonVariant.Primary,
  periodButtonTwClassName,
  moreButtonTwClassName,
  textVariant,
  testID,
}) => {
  const normalizedSelectedPeriod = selectedPeriod?.toLowerCase();

  const isMorePeriodSelected = !visiblePeriods.some(
    (period) => period.value?.toLowerCase() === normalizedSelectedPeriod,
  );

  const groupValue = useMemo(() => {
    if (isMorePeriodSelected) {
      return '';
    }

    return (
      visiblePeriods.find(
        (period) => period.value?.toLowerCase() === normalizedSelectedPeriod,
      )?.value ?? ''
    );
  }, [isMorePeriodSelected, normalizedSelectedPeriod, visiblePeriods]);

  const handleFilterChange = useCallback(
    (value: string) => {
      onPeriodChange?.(value as CandlePeriod);
    },
    [onPeriodChange],
  );

  const moreButtonValue = isMorePeriodSelected
    ? getCandlePeriodLabel(selectedPeriod)
    : null;

  return (
    <Box twClassName={twClassName} testID={testID}>
      <FilterButtonGroup
        value={groupValue}
        onChange={handleFilterChange}
        variant={filterVariant}
        twClassName={groupTwClassName}
        testID={testID ? getPerpsCandlePeriodSelector.group(testID) : undefined}
      >
        {visiblePeriods.map((period) => (
          <FilterButton
            key={period.value}
            value={period.value}
            size={FilterButtonSize.Sm}
            twClassName={periodButtonTwClassName}
            textProps={textVariant ? { variant: textVariant } : undefined}
            testID={
              testID
                ? getPerpsCandlePeriodSelector.periodButton(
                    testID,
                    period.value,
                  )
                : undefined
            }
          >
            {period.label}
          </FilterButton>
        ))}
        <SelectButton
          placeholder={strings('perps.chart.candle_period_selector.show_more')}
          value={moreButtonValue}
          variant={
            isMorePeriodSelected
              ? SelectButtonVariant.Primary
              : SelectButtonVariant.Tertiary
          }
          size={SelectButtonSize.Sm}
          twClassName={moreButtonTwClassName}
          textProps={textVariant ? { variant: textVariant } : undefined}
          onPress={onMorePress}
          testID={
            testID ? getPerpsCandlePeriodSelector.moreButton(testID) : undefined
          }
        />
      </FilterButtonGroup>
    </Box>
  );
};

export default PerpsCandlePeriodSelector;
