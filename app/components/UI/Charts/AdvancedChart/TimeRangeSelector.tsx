import React, { useMemo } from 'react';
import { Dimensions, Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';
import { ChartType } from './AdvancedChart.types';
import { TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT } from '../../AssetOverview/Price/tokenOverviewChart.constants';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

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

/** padding 4px 16px, gap spacing/1, rounded 8 — filter control spec */
const SEGMENT_BUTTON_BASE =
  'min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-lg px-4 py-1 rounded-xl';

/** @see TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT */
const TIME_RANGE_SKELETON_HEIGHT = TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT;
/** Root `Box` uses `px-4` (16px each side). */
const HORIZONTAL_INSET_PX = 32;

interface TimeRangeSelectorProps {
  /** When true, shows a skeleton in the same outer layout as the real controls. */
  isChartLoading?: boolean;
  selected: TimeRange;
  onSelect: (range: TimeRange) => void;
  /** Optional subset of ranges to display. Defaults to all. */
  ranges?: TimeRange[];
  /** Current chart type -- drives the toggle icon appearance. */
  chartType?: ChartType;
  /** Called when the user taps the chart type toggle icon. */
  onChartTypeToggle?: () => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  isChartLoading = false,
  selected,
  onSelect,
  ranges = TIME_RANGES,
  chartType,
  onChartTypeToggle,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const skeletonBarWidth = useMemo(
    () => Dimensions.get('window').width - HORIZONTAL_INSET_PX,
    [],
  );

  const showChartLoadingSkeleton = isChartLoading;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full px-4"
      style={{ minHeight: TIME_RANGE_SKELETON_HEIGHT }}
    >
      {showChartLoadingSkeleton ? (
        <Box
          style={{ height: TIME_RANGE_SKELETON_HEIGHT }}
          twClassName="w-full flex-1 overflow-hidden rounded-lg"
        >
          <SkeletonPlaceholder
            backgroundColor={colors.background.section}
            highlightColor={colors.background.subsection}
          >
            <SkeletonPlaceholder.Item
              width={skeletonBarWidth}
              height={TIME_RANGE_SKELETON_HEIGHT}
              borderRadius={8}
            />
          </SkeletonPlaceholder>
        </Box>
      ) : (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="w-full flex-1 rounded-lg"
        >
          {ranges.map((range) => {
            const isSelected = selected === range;
            return (
              <Pressable
                key={range}
                style={({ pressed }) =>
                  tw.style(
                    SEGMENT_BUTTON_BASE,
                    isSelected && 'bg-muted',
                    pressed && 'opacity-70',
                  )
                }
                onPress={() => onSelect(range)}
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  twClassName={
                    isSelected ? 'text-text-default' : 'text-text-alternative'
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
                  name={IconName.TrendUp}
                  size={IconSize.Lg}
                  color={IconColor.IconAlternative}
                />
              ) : (
                <Icon
                  name={IconName.Candlestick}
                  size={IconSize.Lg}
                  color={IconColor.IconAlternative}
                />
              )}
            </Pressable>
          ) : null}
        </Box>
      )}
    </Box>
  );
};

export default TimeRangeSelector;
