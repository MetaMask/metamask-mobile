import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import I18n from '../../../../../../locales/i18n';
import { useMoneyHistoricalEarnings } from '../../hooks/useMoneyHistoricalEarnings';
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
import Logger from '../../../../../util/Logger';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const EarningsTab = (): React.ReactElement => {
  const tw = useTailwind();
  const locale = I18n.locale;
  const {
    data,
    // isLoading,
    isError,
    refetch: refetchHistoricalEarnings,
  } = useMoneyHistoricalEarnings();
  const isLoading = true;
  const [selectedRange, setSelectedRange] = useState<EarningsRange>('30D');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const setScrollEnabled = useCallback((enabled: boolean): void => {
    scrollViewRef.current?.setNativeProps({ scrollEnabled: enabled });
  }, []);

  const hasMalformedHistory =
    data !== undefined &&
    (!isRecord(data) || hasInvalidInterestHistoryResponse(data));
  const historicalEarningsResponse: InterestHistoryResponse | undefined =
    !hasMalformedHistory && isRecord(data) ? data : undefined;

  const selectedRangeData = useMemo(
    () => getSelectedRange(historicalEarningsResponse, selectedRange),
    [historicalEarningsResponse, selectedRange],
  );

  const chartPoints = useMemo(
    () => getBucketPoints(selectedRangeData),
    [selectedRangeData],
  );
  const activePoint = useMemo(
    () =>
      activePointIndex === null ? undefined : chartPoints[activePointIndex],
    [activePointIndex, chartPoints],
  );
  const selectedRangeTotalUsd = useMemo(
    () => getAuthoritativeRangeTotalUsd(selectedRangeData) ?? Number.NaN,
    [selectedRangeData],
  );
  const hasUnavailableRange =
    selectedRangeData !== undefined &&
    (selectedRangeData.availability.earnings !== 'available' ||
      selectedRangeData.availability.usd_pricing !== 'available');
  const hasHistoricalEarnings =
    !isLoading &&
    !isError &&
    !hasMalformedHistory &&
    Number.isFinite(selectedRangeTotalUsd) &&
    chartPoints.some(isAvailableBucket);

  const handleRetry = useCallback((): void => {
    refetchHistoricalEarnings({ throwOnError: true }).catch(
      (error: unknown) => {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          '[EarningsTab] Failed to refetch historical earnings',
        );
      },
    );
  }, [refetchHistoricalEarnings]);

  const handleRangeChange = useCallback((range: EarningsRange): void => {
    setActivePointIndex(null);
    setSelectedRange(range);
  }, []);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={tw.style('flex-1')}
      contentContainerStyle={tw.style('gap-6 px-4 py-2')}
      showsVerticalScrollIndicator={false}
    >
      {isLoading ? (
        <EarningsHero isLoading />
      ) : hasHistoricalEarnings && selectedRangeData ? (
        <EarningsHero
          totalEarnedUsd={activePoint?.amountUsd ?? selectedRangeTotalUsd}
          periodStart={activePoint?.start ?? selectedRangeData.range_start}
          periodEndExclusive={
            activePoint?.periodEndExclusive ?? selectedRangeData.range_end
          }
          periodGranularity={
            activePoint?.granularity ?? selectedRangeData.granularity
          }
          rangeStart={selectedRangeData.range_start}
          rangeEndExclusive={selectedRangeData.range_end}
        />
      ) : null}
      <EarningsChart
        historicalEarningsResponse={historicalEarningsResponse}
        isLoading={isLoading}
        isError={isError || hasMalformedHistory || hasUnavailableRange}
        onRetry={handleRetry}
        selectedRange={selectedRange}
        onRangeChange={handleRangeChange}
        onActiveIndexChange={setActivePointIndex}
        setScrollEnabled={setScrollEnabled}
      />
      {isLoading ? (
        <EarningsSummary isLoading />
      ) : hasHistoricalEarnings && selectedRangeData ? (
        <Box twClassName="pb-4">
          <EarningsSummary
            points={chartPoints}
            locale={locale}
            rangeStart={selectedRangeData.range_start}
            rangeEndExclusive={selectedRangeData.range_end}
          />
        </Box>
      ) : null}
    </ScrollView>
  );
};

export default EarningsTab;
