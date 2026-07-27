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
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { CandlePeriod, CANDLE_PERIODS } from '@metamask/perps-controller';
import { getPerpsCandlePeriodSelector } from '../../Perps.testIds';

const DEFAULT_CANDLE_PERIODS = [
  { label: '1min', value: CandlePeriod.OneMinute },
  { label: '3min', value: CandlePeriod.ThreeMinutes },
  { label: '5min', value: CandlePeriod.FiveMinutes },
  { label: '15min', value: CandlePeriod.FifteenMinutes },
] as const;

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
  testID?: string;
}

const PerpsCandlePeriodSelector: React.FC<PerpsCandlePeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  onMorePress,
  testID,
}) => {
  const normalizedSelectedPeriod = selectedPeriod?.toLowerCase();

  const isMorePeriodSelected = !DEFAULT_CANDLE_PERIODS.some(
    (period) => period.value?.toLowerCase() === normalizedSelectedPeriod,
  );

  const groupValue = useMemo(() => {
    if (isMorePeriodSelected) {
      return '';
    }

    return (
      DEFAULT_CANDLE_PERIODS.find(
        (period) => period.value?.toLowerCase() === normalizedSelectedPeriod,
      )?.value ?? ''
    );
  }, [isMorePeriodSelected, normalizedSelectedPeriod]);

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
    <Box twClassName="w-full items-center py-3" testID={testID}>
      <FilterButtonGroup
        value={groupValue}
        onChange={handleFilterChange}
        variant={FilterButtonVariant.Primary}
        twClassName="gap-1 grow justify-center"
      >
        {DEFAULT_CANDLE_PERIODS.map((period) => (
          <FilterButton
            key={period.value}
            value={period.value}
            size={FilterButtonSize.Sm}
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
