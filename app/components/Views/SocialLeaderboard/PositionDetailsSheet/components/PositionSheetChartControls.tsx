import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { playSelection } from '../../../../../util/haptics';
import { PositionDetailsSheetSelectorsIDs } from '../PositionDetailsSheet.testIds';
import { CHART_PERIODS, type ChartPeriod } from '../utils/chartWindow';

const PERIOD_LABEL_KEYS: Record<ChartPeriod, string> = {
  '1D': 'asset_overview.chart_time_period_navigation.1d',
  '1W': 'asset_overview.chart_time_period_navigation.1w',
  '1M': 'asset_overview.chart_time_period_navigation.1m',
  All: 'asset_overview.chart_time_period_navigation.all',
};

export type HeadlineValueMode = 'price' | 'marketCap';

const ValueSegment = ({
  label,
  isSelected,
  onPress,
  testID,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  testID: string;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: isSelected }}
    onPress={onPress}
    testID={testID}
  >
    <Box
      alignItems={BoxAlignItems.Center}
      twClassName={`h-7 justify-center rounded-full px-3 ${isSelected ? 'bg-muted' : ''}`}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={isSelected ? TextColor.TextDefault : TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Box>
  </Pressable>
);

export interface PositionSheetChartControlsProps {
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  /** Spot sheets with a known market cap. Perps never show this. */
  showValueToggle: boolean;
  valueMode: HeadlineValueMode;
  onValueModeChange: (mode: HeadlineValueMode) => void;
}

const PositionSheetChartControls = ({
  period,
  onPeriodChange,
  showValueToggle,
  valueMode,
  onValueModeChange,
}: PositionSheetChartControlsProps) => {
  const handlePeriodChange = useCallback(
    (next: string) => {
      playSelection()?.catch(() => undefined);
      onPeriodChange(next as ChartPeriod);
    },
    [onPeriodChange],
  );

  const handleValueMode = useCallback(
    (mode: HeadlineValueMode) => {
      playSelection()?.catch(() => undefined);
      onValueModeChange(mode);
    },
    [onValueModeChange],
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="justify-between px-4 pb-6 pt-4"
      testID={PositionDetailsSheetSelectorsIDs.CHART_CONTROLS}
    >
      <FilterButtonGroup
        value={period}
        onChange={handlePeriodChange}
        variant={FilterButtonVariant.Secondary}
        twClassName="gap-1"
        testID={PositionDetailsSheetSelectorsIDs.CHART_PERIODS}
      >
        {CHART_PERIODS.map((option) => (
          <FilterButton
            key={option}
            value={option}
            size={FilterButtonSize.Sm}
            isSelected={option === period}
            testID={PositionDetailsSheetSelectorsIDs.chartPeriod(option)}
          >
            {strings(PERIOD_LABEL_KEYS[option])}
          </FilterButton>
        ))}
      </FilterButtonGroup>
      {showValueToggle ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="rounded-full border border-border-muted p-0.5"
          testID={PositionDetailsSheetSelectorsIDs.VALUE_TOGGLE}
        >
          <ValueSegment
            label={strings('social_leaderboard.position_sheet.price_toggle')}
            isSelected={valueMode === 'price'}
            onPress={() => handleValueMode('price')}
            testID={PositionDetailsSheetSelectorsIDs.VALUE_TOGGLE_PRICE}
          />
          <ValueSegment
            label={strings(
              'social_leaderboard.position_sheet.market_cap_toggle',
            )}
            isSelected={valueMode === 'marketCap'}
            onPress={() => handleValueMode('marketCap')}
            testID={PositionDetailsSheetSelectorsIDs.VALUE_TOGGLE_MARKET_CAP}
          />
        </Box>
      ) : null}
    </Box>
  );
};

export default PositionSheetChartControls;
