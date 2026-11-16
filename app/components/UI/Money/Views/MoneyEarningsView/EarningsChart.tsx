import React, { useMemo } from 'react';
import BigNumber from 'bignumber.js';
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
import { moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import {
  EARNINGS_RANGES,
  getDailyEarningsPoints,
  getRangeEntries,
  sumEarnings,
  type EarningsRange,
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

const EarningsChart = ({
  entries,
  isLoading,
  isError,
  onRetry,
  selectedRange,
  onRangeChange,
}: EarningsChartProps): React.ReactElement => {
  const tw = useTailwind();
  const rangeEntries = useMemo(
    () => getRangeEntries(entries ?? [], selectedRange),
    [entries, selectedRange],
  );
  const points = useMemo(
    () => getDailyEarningsPoints(rangeEntries, selectedRange),
    [rangeEntries, selectedRange],
  );
  const total = useMemo(() => sumEarnings(rangeEntries), [rangeEntries]);
  const maximumAmount = useMemo(
    () => Math.max(0, ...points.map(({ amount }) => amount)),
    [points],
  );
  const dateRange =
    points.length > 0
      ? `${formatDate(points[0].timestamp)} – ${formatDate(
          points[points.length - 1].timestamp,
        )}`
      : undefined;

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
        accessible
        accessibilityRole="image"
        accessibilityLabel={strings(
          'money.earnings.chart_accessibility_label',
          {
            range: strings(RANGE_LABEL_KEYS[selectedRange]),
            total: formatSignedUsd(total),
          },
        )}
      >
        {points.map((point, index) => {
          const barHeight =
            point.amount > 0 && maximumAmount > 0
              ? Math.max(
                  MINIMUM_BAR_HEIGHT,
                  (point.amount / maximumAmount) * CHART_HEIGHT,
                )
              : 0;
          const isLatest = index === points.length - 1;

          return (
            <Box
              key={point.timestamp}
              style={[
                tw.style(
                  'flex-1 rounded-t-sm',
                  isLatest ? 'bg-primary-default' : 'bg-primary-muted',
                ),
                { height: barHeight },
              ]}
            />
          );
        })}
      </Box>
    );
  };

  return (
    <Box twClassName="gap-4">
      {!isLoading && !isError && points.length > 0 ? (
        <Box>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {selectedRange === '30D'
              ? strings('money.earnings.earned_last_30_days')
              : strings('money.earnings.earned_in_range', {
                  range: strings(RANGE_LABEL_KEYS[selectedRange]),
                })}
          </Text>
          <Text variant={TextVariant.DisplayMd} fontWeight={FontWeight.Medium}>
            {formatSignedUsd(total)}
          </Text>
          {dateRange ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {dateRange}
            </Text>
          ) : null}
        </Box>
      ) : null}

      {renderChartContent()}

      <FilterButtonGroup
        value={selectedRange}
        onChange={(range) => onRangeChange(range as EarningsRange)}
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
