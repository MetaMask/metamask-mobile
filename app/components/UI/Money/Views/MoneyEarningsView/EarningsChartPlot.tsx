import React, { useState } from 'react';
import { PanResponder, Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { isAvailableBucket, type EarningsPoint } from './earningsHistory';
import {
  formatAxisUsd,
  formatPointDateRange,
  formatPointPillLabel,
  formatSignedUsd,
} from './EarningsChart.utils';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const CHART_HEIGHT = 160;
const CHART_CONTAINER_HEIGHT = 200;
const MINIMUM_BAR_HEIGHT = 2;

interface EarningsChartPlotProps {
  points: EarningsPoint[];
  chartAmountsUsd: (number | null)[];
  xAxisLabels: string[];
  yAxisValuesUsd: number[];
  chartMaximumUsd: number;
  activeIndex: number | null;
  plotWidth: number;
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
  plotWidth,
  locale,
  panResponder,
  onPointPressIn,
  onPointPressOut,
  onPlotLayout,
  setScrollEnabled,
}: EarningsChartPlotProps): React.ReactElement => {
  const tw = useTailwind();
  const [pillWidth, setPillWidth] = useState<number | null>(null);

  return (
    <Box
      twClassName="relative"
      style={{ height: CHART_CONTAINER_HEIGHT }}
      testID={MoneyEarningsViewTestIds.CHART}
    >
      <Box
        {...panResponder.panHandlers}
        testID={MoneyEarningsViewTestIds.CHART_PLOT}
        twClassName="absolute left-0 right-12 top-0 h-40"
        onLayout={({ nativeEvent: { layout } }) => onPlotLayout(layout.width)}
        onTouchStart={() => setScrollEnabled?.(false)}
        onTouchEnd={() => setScrollEnabled?.(true)}
        onTouchCancel={() => setScrollEnabled?.(true)}
      >
        {yAxisValuesUsd.map((_, index) => (
          <Box
            key={`gridline-${index}`}
            testID={MoneyEarningsViewTestIds.CHART_GRIDLINE(index)}
            twClassName={`absolute left-0 right-0 h-px bg-border-muted ${
              index === 0 ? 'top-0' : 'top-1/2'
            }`}
          />
        ))}

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.End}
          twClassName="absolute bottom-0 left-0 right-0 h-40"
        >
          {points.map((point, index) => {
            const isAvailable = isAvailableBucket(point);
            const isSelected = activeIndex === index;
            const chartAmountUsd = chartAmountsUsd[index];
            const barHeight =
              isAvailable && chartAmountUsd === 0
                ? MINIMUM_BAR_HEIGHT
                : isAvailable && chartAmountUsd !== null && chartMaximumUsd > 0
                  ? Math.max(
                      MINIMUM_BAR_HEIGHT,
                      (chartAmountUsd / chartMaximumUsd) * CHART_HEIGHT,
                    )
                  : 0;
            const dateLabel = formatPointDateRange(point, locale);

            return (
              <Pressable
                key={point.start}
                disabled={!isAvailable}
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
                    twClassName="w-1/2 max-w-7 rounded-t-md bg-text-default"
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

        {activeIndex !== null &&
        points[activeIndex] &&
        isAvailableBucket(points[activeIndex])
          ? (() => {
              const point = points[activeIndex];
              const barCenter =
                ((activeIndex + 0.5) / points.length) * plotWidth;
              // Center the pill under the bar, clamped to the plot bounds so
              // edge pills don't overflow. Hidden (opacity 0) until the first
              // onLayout gives us the measured width, then revealed in the
              // same frame to avoid a visible shift.
              const left =
                pillWidth !== null
                  ? Math.max(
                      0,
                      Math.min(
                        barCenter - pillWidth / 2,
                        plotWidth - pillWidth,
                      ),
                    )
                  : barCenter;

              return (
                <Box
                  pointerEvents="none"
                  testID={MoneyEarningsViewTestIds.CHART_PILL}
                  twClassName={`absolute -top-3 rounded-full bg-text-default px-2 py-0.5 ${
                    pillWidth === null ? 'opacity-0' : 'opacity-100'
                  }`}
                  style={{ left }}
                  onLayout={({ nativeEvent: { layout } }) => {
                    setPillWidth((currentPillWidth) =>
                      currentPillWidth === layout.width
                        ? currentPillWidth
                        : layout.width,
                    );
                  }}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    twClassName="text-primary-inverse"
                    numberOfLines={1}
                  >
                    {`${formatSignedUsd(point.amountUsd ?? 0)} · ${formatPointPillLabel(
                      point,
                      locale,
                    )}`}
                  </Text>
                </Box>
              );
            })()
          : null}
      </Box>

      <Box twClassName="absolute bottom-0 left-0 right-12 h-10 flex-row">
        {xAxisLabels.map((label, index) => (
          <Text
            key={`x-label-${index}`}
            testID={MoneyEarningsViewTestIds.CHART_X_LABEL(index)}
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="min-w-0 flex-1 text-center"
            numberOfLines={2}
          >
            {label}
          </Text>
        ))}
      </Box>

      <Box twClassName="absolute right-0 top-0 h-40 w-12">
        {yAxisValuesUsd.map((valueUsd, index) => (
          <Text
            key={`y-label-${index}`}
            testID={MoneyEarningsViewTestIds.CHART_Y_LABEL(index)}
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName={`absolute right-0 text-right ${
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
