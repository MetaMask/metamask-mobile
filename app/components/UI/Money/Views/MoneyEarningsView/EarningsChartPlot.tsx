import React from 'react';
import { PanResponder, Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { formatSignedUsd } from '../../utils/moneyFormatFiat';
import { isAvailableBucket, type EarningsPoint } from './earningsHistory';
import {
  formatAxisUsd,
  formatPointDateRange,
  getChartBarHeight,
} from './EarningsChart.utils';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const CHART_CONTAINER_HEIGHT = 200;
const CHART_LEVEL_IDS = ['maximum', 'midpoint'] as const;

interface EarningsChartPlotProps {
  points: EarningsPoint[];
  chartAmountsUsd: (number | null)[];
  xAxisLabels: string[];
  yAxisValuesUsd: number[];
  chartMaximumUsd: number;
  activeIndex: number | null;
  locale: string;
  panResponder: ReturnType<typeof PanResponder.create>;
  onPointPressIn: (index: number, point: EarningsPoint) => void;
  onPointPressOut: () => void;
  onPlotLayout: (width: number) => void;
  setScrollEnabled?: (enabled: boolean) => void;
}

const EarningsChartPlot = ({
  points,
  chartAmountsUsd,
  xAxisLabels,
  yAxisValuesUsd,
  chartMaximumUsd,
  activeIndex,
  locale,
  panResponder,
  onPointPressIn,
  onPointPressOut,
  onPlotLayout,
  setScrollEnabled,
}: EarningsChartPlotProps): React.ReactElement => {
  const tw = useTailwind();

  return (
    <Box
      className="relative"
      style={{ height: CHART_CONTAINER_HEIGHT }}
      testID={MoneyEarningsViewTestIds.CHART}
    >
      <Box
        {...panResponder.panHandlers}
        testID={MoneyEarningsViewTestIds.CHART_PLOT}
        className="absolute left-0 right-12 top-0 h-40"
        onLayout={({ nativeEvent: { layout } }) => onPlotLayout(layout.width)}
        onTouchStart={() => setScrollEnabled?.(false)}
        onTouchEnd={() => setScrollEnabled?.(true)}
        onTouchCancel={() => setScrollEnabled?.(true)}
      >
        {yAxisValuesUsd.map((_, index) => (
          <Box
            key={`gridline-${CHART_LEVEL_IDS[index]}`}
            testID={MoneyEarningsViewTestIds.CHART_GRIDLINE(index)}
            className={`absolute left-0 right-0 h-px bg-border-muted ${
              index === 0 ? 'top-0' : 'top-1/2'
            }`}
          />
        ))}

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.End}
          className="absolute bottom-0 left-0 right-0 h-40"
        >
          {points.map((point, index) => {
            const isAvailable = isAvailableBucket(point);
            const isSelected = activeIndex === index;
            const chartAmountUsd = chartAmountsUsd[index];
            const barHeight = getChartBarHeight(
              isAvailable,
              chartAmountUsd,
              chartMaximumUsd,
            );
            const dateLabel = formatPointDateRange(point, locale);

            return (
              <Pressable
                key={point.start}
                onPressIn={() => onPointPressIn(index, point)}
                onPressOut={onPointPressOut}
                testID={MoneyEarningsViewTestIds.CHART_SLOT(index)}
                accessibilityRole="button"
                accessibilityLabel={
                  isAvailable
                    ? strings(
                        'money.earnings.chart_bucket_accessibility_label',
                        {
                          date: dateLabel,
                          amount: formatSignedUsd(point.amountUsd ?? 0),
                        },
                      )
                    : strings(
                        'money.earnings.chart_bucket_unavailable_accessibility_label',
                        { date: dateLabel },
                      )
                }
                accessibilityState={{
                  selected: isSelected,
                  disabled: !isAvailable,
                }}
                style={tw.style('h-full flex-1 items-center justify-end')}
              >
                {isAvailable ? (
                  <Box
                    testID={MoneyEarningsViewTestIds.CHART_FILL(index)}
                    className="w-1/2 max-w-7 bg-text-default"
                    style={[
                      { height: barHeight },
                      activeIndex !== null && !isSelected
                        ? tw.style('opacity-35')
                        : undefined,
                    ]}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </Box>
      </Box>

      <Box className="absolute bottom-0 left-0 right-12 h-10 flex-row">
        {points.map((point, index) => (
          <Text
            key={`x-label-${point.start}-${point.periodEndExclusive}`}
            testID={MoneyEarningsViewTestIds.CHART_X_LABEL(index)}
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            className="min-w-0 flex-1 text-center"
            numberOfLines={2}
          >
            {xAxisLabels[index]}
          </Text>
        ))}
      </Box>

      <Box className="absolute right-0 top-0 h-40 w-12">
        {yAxisValuesUsd.map((valueUsd, index) => (
          <Text
            key={`y-label-${CHART_LEVEL_IDS[index]}`}
            testID={MoneyEarningsViewTestIds.CHART_Y_LABEL(index)}
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            className={`absolute right-0 text-right ${
              index === 0 ? '-top-3' : 'top-1/2 -mt-3'
            }`}
            numberOfLines={1}
          >
            {formatAxisUsd(valueUsd)}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

export default EarningsChartPlot;
