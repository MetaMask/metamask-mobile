import React, { useCallback, useMemo, useRef, useState } from 'react';
import BigNumber from 'bignumber.js';
import { PanResponder, Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import type { InterestHistoryResponse } from '../../types/moneyInterestHistory';
import { DUST_THRESHOLD, moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import {
  EARNINGS_RANGES,
  getBucketDisplayDateRange,
  getBucketPoints,
  getSelectedRange,
  isAvailableBucket,
  type EarningsRange,
  type EarningsPoint,
} from './earningsHistory';

interface EarningsChartProps {
  historicalEarningsResponse: InterestHistoryResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedRange: EarningsRange;
  onRangeChange: (range: EarningsRange) => void;
  // Allows the chart to pause the parent ScrollView while the user touches the
  // plot area, so a slightly vertical scrub doesn't get hijacked by native
  // scroll gesture recognizers.
  setScrollEnabled?: (enabled: boolean) => void;
}

const RANGE_LABEL_KEYS: Record<EarningsRange, string> = {
  '1W': 'money.earnings.range_1w',
  '30D': 'money.earnings.range_1m',
  '3M': 'money.earnings.range_3m',
  '6M': 'money.earnings.range_6m',
  '1Y': 'money.earnings.range_1y',
};

const CHART_HEIGHT = 160;
const CHART_CONTAINER_HEIGHT = 200;
const MINIMUM_BAR_HEIGHT = 2;
type AxisLabelRange = '1W' | '1M' | '3M' | '6M' | '1Y';

const formatDate = (timestamp: string): string =>
  getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));

const formatSignedUsd = (amountUsd: number): string => {
  if (amountUsd !== 0 && Math.abs(amountUsd) < DUST_THRESHOLD) {
    const preciseAmount = new BigNumber(amountUsd)
      .toFixed(4)
      .replace(/0+$/, '')
      .replace(/\.$/, '');
    return `${amountUsd > 0 ? '+' : ''}$${preciseAmount}`;
  }

  const formattedAmountUsd = moneyFormatUsd(new BigNumber(amountUsd));
  return amountUsd > 0 ? `+${formattedAmountUsd}` : formattedAmountUsd;
};

const formatMonthLabel = (timestamp: string): string =>
  getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(timestamp));

const fmt = (
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options });

const formatThreeMonthAxisLabel = (start: Date, locale: string): string => {
  const month = fmt(locale, { month: 'short' }).format(start);
  const [firstCharacter, ...remainingCharacters] = Array.from(month);

  return remainingCharacters.length > 0
    ? `${firstCharacter}\n${remainingCharacters.join('')}`
    : month;
};

const axisLabel = (
  range: AxisLabelRange,
  start: Date,
  previous: Date | null,
  locale: string,
): string => {
  const monthChanged =
    !previous || previous.getUTCMonth() !== start.getUTCMonth();

  switch (range) {
    case '1W':
      return fmt(locale, { weekday: 'narrow' }).format(start);
    case '1M':
      return fmt(locale, { month: 'short', day: 'numeric' }).format(start);
    case '3M':
      return monthChanged ? formatThreeMonthAxisLabel(start, locale) : '';
    case '6M':
      return fmt(locale, { month: 'short' }).format(start);
    case '1Y':
      return fmt(locale, { month: 'narrow' }).format(start);
  }
};

const getAxisLabelRange = (range: EarningsRange): AxisLabelRange =>
  range === '30D' ? '1M' : range;

const formatPointDateRange = (point: EarningsPoint): string => {
  const { displayStart, displayEnd } = getBucketDisplayDateRange(point);
  const startLabel = formatDate(displayStart);
  const endLabel = formatDate(displayEnd);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

const formatPointPillLabel = (point: EarningsPoint): string =>
  point.granularity === 'week'
    ? formatPointDateRange(point)
    : point.granularity === 'month'
      ? formatMonthLabel(point.start)
      : formatDate(point.start);

const formatAxisUsd = (amountUsd: number): string => {
  if (amountUsd > 0 && amountUsd < DUST_THRESHOLD) {
    return '<$0.01';
  }

  return amountUsd >= 1
    ? `$${Math.round(amountUsd)}`
    : `$${amountUsd.toFixed(2)}`;
};

const clampUsdToCents = (amountUsd: number): number =>
  Math.abs(amountUsd) < DUST_THRESHOLD
    ? 0
    : Number(new BigNumber(amountUsd).toFixed(2));

const getNiceUsdChartMaximum = (maximumAmountUsd: number): number => {
  if (maximumAmountUsd <= 0) {
    return DUST_THRESHOLD;
  }

  if (maximumAmountUsd < 1) {
    const cents = Math.ceil(maximumAmountUsd * 100);
    return (cents % 2 === 0 ? cents : cents + 1) / 100;
  }

  const whole = Math.ceil(maximumAmountUsd);
  return whole % 2 === 0 ? whole : whole + 1;
};

const EarningsChart = ({
  historicalEarningsResponse,
  isLoading,
  isError,
  onRetry,
  selectedRange,
  onRangeChange,
  setScrollEnabled,
}: EarningsChartProps): React.ReactElement => {
  const tw = useTailwind();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [plotWidth, setPlotWidth] = useState(0);
  const [pillWidth, setPillWidth] = useState<number | null>(null);
  const isScrubbing = useRef(false);
  const scrubOriginX = useRef(0);
  const locale = I18n.locale;
  const selectedRangeData = useMemo(
    () => getSelectedRange(historicalEarningsResponse, selectedRange),
    [historicalEarningsResponse, selectedRange],
  );
  const points = useMemo(
    () => getBucketPoints(selectedRangeData),
    [selectedRangeData],
  );
  const chartAmountsUsd = useMemo(
    () =>
      points.map((point) =>
        point.amountUsd === null ? null : clampUsdToCents(point.amountUsd),
      ),
    [points],
  );
  const xAxisLabels = useMemo(() => {
    const axisRange = getAxisLabelRange(selectedRange);

    return points.map((point, index) =>
      axisLabel(
        axisRange,
        new Date(point.start),
        index === 0 ? null : new Date(points[index - 1].start),
        locale,
      ),
    );
  }, [locale, points, selectedRange]);
  const maximumAmountUsd = useMemo(
    () =>
      Math.max(
        0,
        ...points.map((point, index) =>
          isAvailableBucket(point) && chartAmountsUsd[index] !== null
            ? chartAmountsUsd[index]
            : 0,
        ),
      ),
    [chartAmountsUsd, points],
  );
  const yAxisValuesUsd = useMemo(() => {
    const chartMaximumUsd = getNiceUsdChartMaximum(maximumAmountUsd);
    const valuesUsd = [chartMaximumUsd, chartMaximumUsd / 2];
    return valuesUsd.filter(
      (valueUsd, index) =>
        index === 0 ||
        formatAxisUsd(valueUsd) !== formatAxisUsd(valuesUsd[index - 1]),
    );
  }, [maximumAmountUsd]);
  const chartMaximumUsd = yAxisValuesUsd[0];
  const handleRangeChange = (range: EarningsRange): void => {
    setActiveIndex(null);
    onRangeChange(range);
  };

  const handlePointPressIn = (index: number, point: EarningsPoint): void => {
    if (isAvailableBucket(point)) {
      scrubOriginX.current = ((index + 0.5) / points.length) * plotWidth;
      setActiveIndex(index);
    }
  };

  const selectPointAtX = useCallback(
    (locationX: number): void => {
      if (plotWidth <= 0 || points.length === 0) {
        return;
      }

      const clampedX = Math.max(0, Math.min(locationX, plotWidth));
      const index = Math.min(
        Math.floor((clampedX / plotWidth) * points.length),
        points.length - 1,
      );

      setActiveIndex(isAvailableBucket(points[index]) ? index : null);
    },
    [plotWidth, points, setActiveIndex],
  );
  const clearActiveSelection = useCallback((): void => {
    isScrubbing.current = false;
    setActiveIndex(null);
    setScrollEnabled?.(true);
  }, [setActiveIndex, setScrollEnabled]);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: () => {
          // Parent ScrollView is paused while the finger is on the plot, so
          // any movement here is a scrub.
          isScrubbing.current = true;
          return true;
        },
        // Once we're scrubbing, don't let an ancestor ScrollView reclaim the
        // gesture mid-drag on small vertical drift.
        onPanResponderTerminationRequest: () => !isScrubbing.current,
        onPanResponderGrant: (_event, gestureState) =>
          selectPointAtX(
            scrubOriginX.current + gestureState.moveX - gestureState.x0,
          ),
        onPanResponderMove: (_event, gestureState) =>
          selectPointAtX(
            scrubOriginX.current + gestureState.moveX - gestureState.x0,
          ),
        onPanResponderRelease: clearActiveSelection,
        onPanResponderTerminate: clearActiveSelection,
      }),
    [clearActiveSelection, selectPointAtX],
  );

  const renderChartContent = (): React.ReactNode => {
    if (isLoading) {
      return (
        <Skeleton
          height={CHART_HEIGHT}
          width="100%"
          testID={MoneyEarningsViewTestIds.LOADING}
        />
      );
    }

    if (isError) {
      return (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-[160px] gap-3 px-4"
          testID={MoneyEarningsViewTestIds.ERROR}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            accessibilityRole="alert"
          >
            {strings('money.earnings.error')}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={onRetry}
          >
            {strings('money.earnings.retry')}
          </Button>
        </Box>
      );
    }

    if (points.length === 0) {
      return (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-[160px] px-4"
          testID={MoneyEarningsViewTestIds.EMPTY}
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('money.earnings.empty')}
          </Text>
        </Box>
      );
    }

    return (
      <Box
        style={[tw.style('relative'), { height: CHART_CONTAINER_HEIGHT }]}
        testID={MoneyEarningsViewTestIds.CHART}
      >
        <Box
          {...panResponder.panHandlers}
          testID={MoneyEarningsViewTestIds.CHART_PLOT}
          style={tw.style('absolute left-0 right-12 top-0 h-[160px]')}
          onLayout={({ nativeEvent: { layout } }) => setPlotWidth(layout.width)}
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
            twClassName="absolute bottom-0 left-0 right-0 h-[160px]"
          >
            {points.map((point, index) => {
              const isAvailable = isAvailableBucket(point);
              const isSelected = activeIndex === index;
              const chartAmountUsd = chartAmountsUsd[index];
              const barHeight =
                isAvailable && chartAmountUsd === 0
                  ? MINIMUM_BAR_HEIGHT
                  : isAvailable &&
                      chartAmountUsd !== null &&
                      chartMaximumUsd > 0
                    ? Math.max(
                        MINIMUM_BAR_HEIGHT,
                        (chartAmountUsd / chartMaximumUsd) * CHART_HEIGHT,
                      )
                    : 0;
              const dateLabel = formatPointDateRange(point);

              return (
                <Pressable
                  key={point.start}
                  disabled={!isAvailable}
                  onPressIn={() => handlePointPressIn(index, point)}
                  onPressOut={() => {
                    if (!isScrubbing.current) {
                      setActiveIndex(null);
                    }
                  }}
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
            ? ((): React.ReactElement => {
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
                    style={[
                      tw.style(
                        'absolute -top-3 rounded-full bg-text-default px-2 py-0.5',
                        pillWidth === null ? 'opacity-0' : 'opacity-100',
                      ),
                      { left },
                    ]}
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

        <Box twClassName="absolute right-0 top-0 h-[160px] w-12">
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

  return (
    <Box>
      {renderChartContent()}

      <FilterButtonGroup
        value={selectedRange}
        onChange={(range) => handleRangeChange(range as EarningsRange)}
        variant={FilterButtonVariant.Secondary}
        twClassName="w-full justify-between"
        testID={MoneyEarningsViewTestIds.RANGE_SELECTOR}
      >
        {EARNINGS_RANGES.map((range) => {
          const label = strings(RANGE_LABEL_KEYS[range]);
          const isSelected = selectedRange === range;

          return (
            <FilterButton
              key={range}
              value={range}
              size={FilterButtonSize.Sm}
              isSelected={isSelected}
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected }}
            >
              {label}
            </FilterButton>
          );
        })}
      </FilterButtonGroup>
    </Box>
  );
};

export default EarningsChart;
