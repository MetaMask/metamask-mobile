import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { ChartType } from './AdvancedChart.types';
import ChartTypeToggle from './ChartTypeToggle';
import { TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT } from '../../AssetOverview/Price/tokenOverviewChart.constants';

export type TimeRange = '1H' | '1D' | '1W' | '1M' | '1Y';

/** Valid OHLCV API time period values */
export type OHLCVTimePeriod = '1h' | '1d' | '1w' | '1m' | '1y';

export interface TimeRangeConfig {
  /** API timePeriod query parameter */
  timePeriod: OHLCVTimePeriod;
  /** Optional interval override. When undefined, API uses its default for the timePeriod. */
  interval?: string;
  /** Duration of this time range in milliseconds (used to compute the initial visible viewport). */
  durationMs: number;
}

export const TIME_RANGE_CONFIGS: Record<TimeRange, TimeRangeConfig> = {
  '1H': { timePeriod: '1h', durationMs: 60 * 60 * 1000 },
  '1D': { timePeriod: '1d', durationMs: 24 * 60 * 60 * 1000 },
  '1W': { timePeriod: '1w', durationMs: 7 * 24 * 60 * 60 * 1000 },
  '1M': { timePeriod: '1m', durationMs: 30 * 24 * 60 * 60 * 1000 },
  '1Y': { timePeriod: '1y', durationMs: 365 * 24 * 60 * 60 * 1000 },
};

const TIME_RANGES: TimeRange[] = ['1H', '1D', '1W', '1M', '1Y'];

/** Padding 4px 16px with fully rounded pill corners. */
const SEGMENT_BUTTON_BASE =
  'min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-full px-4 py-1';

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
  /** Optional subset of ranges to display. Defaults to all. */
  ranges?: TimeRange[];
  /** Current chart type -- drives the toggle icon appearance. */
  chartType?: ChartType;
  /** Called when the user taps the single chart-type toggle button (main branch style). */
  onChartTypeToggle?: () => void;
  /** Called when the user selects a chart type from the segmented toggle. */
  onChartTypeSelect?: (type: ChartType) => void;
  /** Override background color for the selected pill (A/B test). */
  selectedColor?: string;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selected,
  onSelect,
  ranges = TIME_RANGES,
  chartType,
  onChartTypeToggle,
  onChartTypeSelect,
  selectedColor,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full px-4"
      style={{ minHeight: TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT }}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="w-full flex-1 rounded-full"
      >
        {ranges.map((range) => {
          const isSelected = selected === range;
          return (
            <Pressable
              key={range}
              style={({ pressed }) =>
                tw.style(
                  SEGMENT_BUTTON_BASE,
                  isSelected &&
                    (selectedColor
                      ? { backgroundColor: selectedColor }
                      : 'bg-muted'),
                  pressed && 'opacity-70',
                )
              }
              onPress={() => onSelect(range)}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                twClassName={
                  isSelected
                    ? selectedColor
                      ? 'text-success-inverse'
                      : 'text-text-default'
                    : selectedColor
                      ? undefined
                      : 'text-text-alternative'
                }
                style={
                  !isSelected && selectedColor
                    ? { color: selectedColor }
                    : undefined
                }
              >
                {range}
              </Text>
            </Pressable>
          );
        })}
        {onChartTypeToggle ? (
          <Pressable
            style={({ pressed }) =>
              tw.style(SEGMENT_BUTTON_BASE, pressed && 'opacity-70')
            }
            onPress={onChartTypeToggle}
            accessibilityRole="button"
            accessibilityLabel={
              chartType === ChartType.Candles
                ? 'Switch to line chart'
                : 'Switch to candlestick chart'
            }
          >
            {chartType === ChartType.Candles ? (
              <Icon
                name={IconName.Diagram}
                size={IconSize.Lg}
                twClassName={
                  selectedColor
                    ? `text-[${selectedColor}]`
                    : 'text-icon-alternative'
                }
              />
            ) : (
              <Icon
                name={IconName.Candlestick}
                size={IconSize.Lg}
                twClassName={
                  selectedColor
                    ? `text-[${selectedColor}]`
                    : 'text-icon-alternative'
                }
              />
            )}
          </Pressable>
        ) : onChartTypeSelect ? (
          <ChartTypeToggle
            chartType={chartType}
            onChartTypeSelect={onChartTypeSelect}
          />
        ) : null}
      </Box>
    </Box>
  );
};

export default TimeRangeSelector;
