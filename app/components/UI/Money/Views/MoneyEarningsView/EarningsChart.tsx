import React, { useMemo, useState } from 'react';
import BigNumber from 'bignumber.js';
import { Pressable } from 'react-native';
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
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import type { InterestHistoryResponse } from '../../hooks/useMoneyHistoricalEarnings';
import { moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import {
  EARNINGS_RANGES,
  getBucketDisplayDateRange,
  getBucketPoints,
  getLatestAvailableBucketIndex,
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
const MINIMUM_BAR_HEIGHT = 2;

interface BucketSelection {
  range: EarningsRange;
  bucketStart: string | undefined;
}

const formatDate = (timestamp: string): string =>
  getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));

const formatSignedUsd = (amount: number): string => {
  const formattedAmount = moneyFormatUsd(new BigNumber(amount));
  return amount > 0 ? `+${formattedAmount}` : formattedAmount;
};

const formatPointDateRange = (point: EarningsPoint): string => {
  const { start, end } = getBucketDisplayDateRange(point);
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

const getLatestAvailablePoint = (
  points: EarningsPoint[],
): EarningsPoint | undefined => {
  const latestIndex = getLatestAvailableBucketIndex(points);
  return latestIndex === -1 ? undefined : points[latestIndex];
};

const createSelection = (
  range: EarningsRange,
  points: EarningsPoint[],
): BucketSelection => ({
  range,
  bucketStart: getLatestAvailablePoint(points)?.start,
});

const EarningsChart = ({
  entries,
  isLoading,
  isError,
  onRetry,
  selectedRange,
  onRangeChange,
}: EarningsChartProps): React.ReactElement => {
  const tw = useTailwind();
  const initialPoints = useMemo(
    () => getBucketPoints(getSelectedRange(entries, selectedRange)),
    [entries, selectedRange],
  );
  const [selection, setSelection] = useState<BucketSelection>(() =>
    createSelection(selectedRange, initialPoints),
  );
  const selectedRangeData = useMemo(
    () => getSelectedRange(entries, selectedRange),
    [entries, selectedRange],
  );
  const points = useMemo(
    () => getBucketPoints(selectedRangeData),
    [selectedRangeData],
  );
  const selectedPoint = useMemo(() => {
    if (selection.range === selectedRange) {
      const selectedPointForRange = points.find(
        (point) =>
          point.start === selection.bucketStart && isAvailableBucket(point),
      );
      if (selectedPointForRange) {
        return selectedPointForRange;
      }
    }

    return getLatestAvailablePoint(points);
  }, [points, selectedRange, selection]);
  const maximumAmount = useMemo(
    () =>
      Math.max(
        0,
        ...points.map(({ amount }) => (amount !== null ? amount : 0)),
      ),
    [points],
  );
  const handleRangeChange = (range: EarningsRange): void => {
    const nextPoints = getBucketPoints(getSelectedRange(entries, range));
    setSelection(createSelection(range, nextPoints));
    onRangeChange(range);
  };

  const handlePointPress = (point: EarningsPoint): void => {
    if (!isAvailableBucket(point)) {
      return;
    }

    setSelection({
      range: selectedRange,
      bucketStart: point.start,
    });
  };

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
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.End}
        style={tw.style('h-[160px] gap-px')}
        testID={MoneyEarningsViewTestIds.CHART}
      >
        {points.map((point, index) => {
          const isAvailable = isAvailableBucket(point);
          const isSelected = selectedPoint?.start === point.start;
          const barHeight =
            isAvailable && point.amount === 0
              ? MINIMUM_BAR_HEIGHT
              : isAvailable && point.amount !== null && maximumAmount > 0
                ? Math.max(
                    MINIMUM_BAR_HEIGHT,
                    (point.amount / maximumAmount) * CHART_HEIGHT,
                  )
                : 0;
          const dateLabel = formatPointDateRange(point);

          return (
            <Pressable
              key={point.start}
              disabled={!isAvailable}
              onPress={() => handlePointPress(point)}
              testID={MoneyEarningsViewTestIds.CHART_SLOT(index)}
              accessibilityRole="button"
              accessibilityLabel={
                isAvailable
                  ? strings('money.earnings.chart_bucket_accessibility_label', {
                      date: dateLabel,
                      amount: formatSignedUsd(point.amount ?? 0),
                    })
                  : strings(
                      'money.earnings.chart_bucket_unavailable_accessibility_label',
                      { date: dateLabel },
                    )
              }
              accessibilityState={{
                selected: isSelected,
                disabled: !isAvailable,
              }}
              style={({ pressed }) =>
                tw.style(
                  'h-full flex-1 justify-end',
                  pressed && isAvailable && 'opacity-70',
                )
              }
            >
              {isAvailable ? (
                <Box
                  testID={MoneyEarningsViewTestIds.CHART_FILL(index)}
                  twClassName={`w-full rounded-t-sm ${
                    isSelected ? 'bg-primary-default' : 'bg-primary-muted'
                  }`}
                  style={{ height: barHeight }}
                />
              ) : null}
            </Pressable>
          );
        })}
      </Box>
    );
  };

  return (
    <Box twClassName="gap-4">
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
