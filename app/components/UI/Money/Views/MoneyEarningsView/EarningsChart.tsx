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
import type { InterestHistoryResponse } from '../../hooks/useMoneyHistoricalEarnings';
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
  entries: InterestHistoryResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedRange: EarningsRange;
  onRangeChange: (range: EarningsRange) => void;
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

const formatSignedUsd = (amount: number): string => {
  if (amount !== 0 && Math.abs(amount) < DUST_THRESHOLD) {
    return amount > 0 ? '+<$0.01' : '-<$0.01';
  }

  const formattedAmount = moneyFormatUsd(new BigNumber(amount));
  return amount > 0 ? `+${formattedAmount}` : formattedAmount;
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
  const { start, end } = getBucketDisplayDateRange(point);
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

const formatPointPillLabel = (point: EarningsPoint): string =>
  point.granularity === 'week'
    ? formatPointDateRange(point)
    : point.granularity === 'month'
      ? formatMonthLabel(point.start)
      : formatDate(point.start);

const formatAxisUsd = (amount: number): string => {
  if (amount > 0 && amount < DUST_THRESHOLD) {
    return '<$0.01';
  }

  return amount >= 1 ? `$${Math.round(amount)}` : `$${amount.toFixed(2)}`;
};

const getYAxisValues = (maximumAmount: number): number[] => {
  if (maximumAmount <= 0) {
    return [1, 0.5];
  }

  const magnitude = 10 ** Math.floor(Math.log10(maximumAmount));
  const normalizedMaximum = maximumAmount / magnitude;
  const step =
    normalizedMaximum <= 1
      ? 1
      : normalizedMaximum <= 2
        ? 2
        : normalizedMaximum <= 5
          ? 5
          : 10;
  const roundedMaximum = Math.ceil(normalizedMaximum / step) * step * magnitude;

  return [roundedMaximum, roundedMaximum / 2];
};

const EarningsChart = ({
  entries,
  isLoading,
  isError,
  onRetry,
  selectedRange,
  onRangeChange,
}: EarningsChartProps): React.ReactElement => {
  const tw = useTailwind();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [plotWidth, setPlotWidth] = useState(0);
  const isScrubbing = useRef(false);
  const scrubOriginX = useRef(0);
  const locale = I18n.locale;
  const selectedRangeData = useMemo(
    () => getSelectedRange(entries, selectedRange),
    [entries, selectedRange],
  );
  const points = useMemo(
    () => getBucketPoints(selectedRangeData),
    [selectedRangeData],
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
  const maximumAmount = useMemo(
    () =>
      Math.max(
        0,
        ...points.map((point) =>
          isAvailableBucket(point) && point.amount !== null ? point.amount : 0,
        ),
      ),
    [points],
  );
  const yAxisValues = useMemo(() => {
    const values = getYAxisValues(maximumAmount);
    return values.filter(
      (value, index) =>
        index === 0 ||
        formatAxisUsd(value) !== formatAxisUsd(values[index - 1]),
    );
  }, [maximumAmount]);
  const chartMaximum = yAxisValues[0];
  const handleRangeChange = (range: EarningsRange): void => {
    setActiveIndex(null);
    onRangeChange(range);
  };

  const handlePointPressIn = (index: number, point: EarningsPoint): void => {
    if (isAvailableBucket(point)) {
      scrubOriginX.current = (index / points.length) * plotWidth;
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
  }, [setActiveIndex]);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
          const isHorizontal =
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy);

          if (isHorizontal) {
            isScrubbing.current = true;
          }

          return isHorizontal;
        },
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
        >
          {yAxisValues.map((_, index) => (
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
              const barHeight =
                isAvailable && point.amount === 0
                  ? MINIMUM_BAR_HEIGHT
                  : isAvailable && point.amount !== null && chartMaximum > 0
                    ? Math.max(
                        MINIMUM_BAR_HEIGHT,
                        (point.amount / chartMaximum) * CHART_HEIGHT,
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
                            amount: formatSignedUsd(point.amount ?? 0),
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

          <Box
            pointerEvents="none"
            flexDirection={BoxFlexDirection.Row}
            twClassName="absolute bottom-0 left-0 right-0 h-[160px] overflow-visible"
          >
            {points.map((point, index) => {
              const isAvailable = isAvailableBucket(point);
              const isSelected = activeIndex === index;

              return (
                <Box
                  key={`pill-slot-${point.start}`}
                  alignItems={
                    index === 0
                      ? BoxAlignItems.Start
                      : index === points.length - 1
                        ? BoxAlignItems.End
                        : BoxAlignItems.Center
                  }
                  twClassName="h-full flex-1 overflow-visible"
                >
                  {isSelected && isAvailable ? (
                    <Box
                      testID={MoneyEarningsViewTestIds.CHART_PILL}
                      twClassName="-top-3 rounded-full bg-text-default px-2 py-0.5 overflow-visible"
                    >
                      <Text
                        variant={TextVariant.BodySm}
                        fontWeight={FontWeight.Medium}
                        twClassName="text-primary-inverse whitespace-nowrap"
                        numberOfLines={1}
                      >
                        {`${formatSignedUsd(point.amount ?? 0)} · ${formatPointPillLabel(
                          point,
                        )}`}
                      </Text>
                    </Box>
                  ) : null}
                </Box>
              );
            })}
          </Box>
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
          {yAxisValues.map((value, index) => (
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
              {formatAxisUsd(value)}
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
