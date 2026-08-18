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
import { strings } from '../../../../../locales/i18n';
import { CandlePeriod, CANDLE_PERIODS } from '@metamask/perps-controller';
import { getCandlePeriodSelectorSelectors } from './testIds';

export interface CandlePeriodOption {
  label: string;
  value: CandlePeriod;
}

export const DEFAULT_CANDLE_PERIODS = [
  { label: '1min', value: CandlePeriod.OneMinute },
  { label: '3min', value: CandlePeriod.ThreeMinutes },
  { label: '5min', value: CandlePeriod.FiveMinutes },
  { label: '15min', value: CandlePeriod.FifteenMinutes },
] as const satisfies readonly CandlePeriodOption[];

/**
 * Additional labels for candle-period values not present in
 * `@metamask/perps-controller`'s CANDLE_PERIODS list. Keep entries here rather
 * than lowercasing the comparison, because CandlePeriod values are
 * case-sensitive (e.g. `1m` = one minute, `1M` = one month).
 */
const EXTRA_CANDLE_PERIOD_LABELS: Readonly<Record<string, string>> = {
  [CandlePeriod.OneMonth]: '1M',
};

/**
 * Resolves a display label for a `CandlePeriod` value. Uses case-sensitive
 * matching to distinguish `1m` (minute) from `1M` (month). Falls back to the
 * raw period string if no label is registered.
 */
export const getCandlePeriodLabel = (period: CandlePeriod | string): string => {
  if (!period) return period;
  const known = CANDLE_PERIODS.find((p) => p.value === period);
  if (known) return known.label;
  const extra = EXTRA_CANDLE_PERIOD_LABELS[period];
  if (extra) return extra;
  return period;
};

interface CandlePeriodSelectorProps {
  selectedPeriod: CandlePeriod | string;
  onPeriodChange?: (period: CandlePeriod) => void;
  onMorePress?: () => void;
  visiblePeriods?: readonly CandlePeriodOption[];
  twClassName?: string;
  groupTwClassName?: string;
  filterVariant?: FilterButtonVariant;
  periodButtonTwClassName?: string;
  moreButtonTwClassName?: string;
  textVariant?: TextVariant;
  testID?: string;
}

const CandlePeriodSelector: React.FC<CandlePeriodSelectorProps> = ({
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
  const isMorePeriodSelected = !visiblePeriods.some(
    (period) => period.value === selectedPeriod,
  );

  const groupValue = useMemo(() => {
    if (isMorePeriodSelected) return '';
    return (
      visiblePeriods.find((period) => period.value === selectedPeriod)?.value ??
      ''
    );
  }, [isMorePeriodSelected, selectedPeriod, visiblePeriods]);

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
        testID={
          testID ? getCandlePeriodSelectorSelectors.group(testID) : undefined
        }
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
                ? getCandlePeriodSelectorSelectors.periodButton(
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
            testID
              ? getCandlePeriodSelectorSelectors.moreButton(testID)
              : undefined
          }
        />
      </FilterButtonGroup>
    </Box>
  );
};

export default CandlePeriodSelector;
