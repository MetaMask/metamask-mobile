import React, { useMemo, useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import type { InterestHistoryResponse } from '../../types/moneyInterestHistory';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';
import {
  getSelectedRange,
  type EarningsRange,
  getBucketPoints,
  isAvailableBucket,
} from './earningsHistory';
import EarningsChartPlot from './EarningsChartPlot';
import EarningsChartRangeSelector from './EarningsChartRangeSelector';
import {
  clampUsdToCents,
  formatAxisUsd,
  getNiceUsdChartMaximum,
  getXAxisLabels,
} from './EarningsChart.utils';
import { useEarningsChartScrub } from './useEarningsChartScrub';

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

const EarningsChart = ({
  historicalEarningsResponse,
  isLoading,
  isError,
  onRetry,
  selectedRange,
  onRangeChange,
  setScrollEnabled,
}: EarningsChartProps): React.ReactElement => {
  const [plotWidth, setPlotWidth] = useState(0);
  const locale = I18n.locale;
  const { points, chartAmountsUsd, xAxisLabels, yAxisValuesUsd } =
    useMemo(() => {
      const selectedRangeData = getSelectedRange(
        historicalEarningsResponse,
        selectedRange,
      );
      const chartPoints = getBucketPoints(selectedRangeData);
      const chartAmounts = chartPoints.map((point) =>
        point.amountUsd === null ? null : clampUsdToCents(point.amountUsd),
      );
      const maximumAmountUsd = Math.max(
        0,
        ...chartPoints.map((point, index) =>
          isAvailableBucket(point) && chartAmounts[index] !== null
            ? chartAmounts[index]
            : 0,
        ),
      );
      const chartMaximum = getNiceUsdChartMaximum(maximumAmountUsd);
      const valuesUsd = [chartMaximum, chartMaximum / 2];
      const axisValuesUsd = valuesUsd.filter(
        (valueUsd, index) =>
          index === 0 ||
          formatAxisUsd(valueUsd) !== formatAxisUsd(valuesUsd[index - 1]),
      );

      return {
        points: chartPoints,
        chartAmountsUsd: chartAmounts,
        xAxisLabels: getXAxisLabels(chartPoints, selectedRange, locale),
        yAxisValuesUsd: axisValuesUsd,
      };
    }, [historicalEarningsResponse, locale, selectedRange]);
  const chartMaximumUsd = yAxisValuesUsd[0];
  const {
    activeIndex,
    handlePointPressIn,
    handlePointPressOut,
    panResponder,
    resetSelection,
  } = useEarningsChartScrub({
    points,
    plotWidth,
    setScrollEnabled,
  });

  const handleRangeChange = (range: EarningsRange): void => {
    resetSelection();
    onRangeChange(range);
  };

  const renderChartContent = (): React.ReactNode => {
    if (isLoading) {
      return (
        <Skeleton
          height={160}
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
          twClassName="h-40 gap-3 px-4"
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
          twClassName="h-40 px-4"
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
      <EarningsChartPlot
        points={points}
        chartAmountsUsd={chartAmountsUsd}
        xAxisLabels={xAxisLabels}
        yAxisValuesUsd={yAxisValuesUsd}
        chartMaximumUsd={chartMaximumUsd}
        activeIndex={activeIndex}
        plotWidth={plotWidth}
        locale={locale}
        panResponder={panResponder}
        onPointPressIn={handlePointPressIn}
        onPointPressOut={handlePointPressOut}
        onPlotLayout={setPlotWidth}
        setScrollEnabled={setScrollEnabled}
      />
    );
  };

  return (
    <Box>
      {renderChartContent()}
      <EarningsChartRangeSelector
        selectedRange={selectedRange}
        onRangeChange={handleRangeChange}
      />
    </Box>
  );
};

export default EarningsChart;
