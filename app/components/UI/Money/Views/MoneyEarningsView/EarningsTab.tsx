import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useMoneyHistoricalEarnings } from '../../hooks/useMoneyHistoricalEarnings';
import useMoneyAccountProjectedEarnings from '../../hooks/useMoneyAccountProjectedEarnings';
import type { InterestHistoryResponse } from '../../types/moneyInterestHistory';
import EarningsChart from './EarningsChart';
import EarningsHero from './EarningsHero';
import EarningsSummary from './EarningsSummary';
import {
  getAuthoritativeRangeTotalUsd,
  getBucketPoints,
  getSelectedRange,
  isAvailableBucket,
  type EarningsRange,
} from './earningsHistory';
import { hasInvalidInterestHistoryResponse } from './earningsHistoryValidation';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const EarningsTab = (): React.ReactElement => {
  const tw = useTailwind();
  const {
    data,
    isLoading,
    isError,
    refetch: refetchHistoricalEarnings,
  } = useMoneyHistoricalEarnings();
  const [selectedRange, setSelectedRange] = useState<EarningsRange>('30D');
  const scrollViewRef = useRef<ScrollView>(null);
  const setScrollEnabled = useCallback((enabled: boolean): void => {
    scrollViewRef.current?.setNativeProps({ scrollEnabled: enabled });
  }, []);

  const hasMalformedHistory =
    data !== undefined &&
    (!isRecord(data) || hasInvalidInterestHistoryResponse(data));
  const historicalEarningsResponse: InterestHistoryResponse | undefined =
    !hasMalformedHistory && isRecord(data)
      ? (data as InterestHistoryResponse)
      : undefined;

  const selectedRangeData = useMemo(
    () => getSelectedRange(historicalEarningsResponse, selectedRange),
    [historicalEarningsResponse, selectedRange],
  );

  const chartPoints = useMemo(
    () => getBucketPoints(selectedRangeData),
    [selectedRangeData],
  );
  const thirtyDayTotalUsd = useMemo(
    () =>
      getAuthoritativeRangeTotalUsd(
        getSelectedRange(historicalEarningsResponse, '30D'),
      ) ?? Number.NaN,
    [historicalEarningsResponse],
  );
  const oneYearTotalUsd = useMemo(
    () =>
      getAuthoritativeRangeTotalUsd(
        getSelectedRange(historicalEarningsResponse, '1Y'),
      ) ?? Number.NaN,
    [historicalEarningsResponse],
  );
  const selectedRangeTotalUsd = useMemo(
    () => getAuthoritativeRangeTotalUsd(selectedRangeData) ?? Number.NaN,
    [selectedRangeData],
  );
  const { projectedAmount: projectedOneYearUsd } =
    useMoneyAccountProjectedEarnings();
  const hasUnavailableRange =
    selectedRangeData !== undefined &&
    (selectedRangeData.availability.earnings !== 'available' ||
      selectedRangeData.availability.usd_pricing !== 'available');
  const hasHistoricalEarnings =
    !isLoading &&
    !isError &&
    !hasMalformedHistory &&
    Number.isFinite(thirtyDayTotalUsd) &&
    Number.isFinite(oneYearTotalUsd) &&
    Number.isFinite(selectedRangeTotalUsd) &&
    chartPoints.some(isAvailableBucket);

  const handleRetry = useCallback(() => {
    refetchHistoricalEarnings();
  }, [refetchHistoricalEarnings]);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={tw.style('flex-1')}
      contentContainerStyle={tw.style('gap-6 px-4 py-6')}
      showsVerticalScrollIndicator={false}
    >
      {hasHistoricalEarnings && selectedRangeData ? (
        <EarningsHero
          totalEarnedUsd={oneYearTotalUsd}
          periodEarningsUsd={selectedRangeTotalUsd}
          periodStart={selectedRangeData.range_start}
          periodEndExclusive={selectedRangeData.range_end}
          periodGranularity={selectedRangeData.granularity}
        />
      ) : null}
      <EarningsChart
        historicalEarningsResponse={historicalEarningsResponse}
        isLoading={isLoading}
        isError={isError || hasMalformedHistory || hasUnavailableRange}
        onRetry={handleRetry}
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        setScrollEnabled={setScrollEnabled}
      />
      {hasHistoricalEarnings ? (
        <Box twClassName="py-4">
          <EarningsSummary
            thisMonthUsd={thirtyDayTotalUsd}
            lifetimeUsd={oneYearTotalUsd}
            projectedOneYearUsd={projectedOneYearUsd}
          />
        </Box>
      ) : null}
    </ScrollView>
  );
};

export default EarningsTab;
