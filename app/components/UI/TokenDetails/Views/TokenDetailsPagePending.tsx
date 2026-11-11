import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  Skeleton,
} from '@metamask/design-system-react-native';
import {
  MarketInsightsEntryCardSkeleton,
  selectMarketInsightsEnabled,
} from '../../MarketInsights';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import TokenDetailsActionsSection from '../components/sections/TokenDetailsActionsSection';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { TokenDetailsIds } from '../testIds';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';
import { ChartType } from '../../Charts/AdvancedChart/AdvancedChart.types';
import ChartCandleSkeleton from '../../Charts/ChartCandleSkeleton';
import ChartLineSkeleton from '../../Charts/ChartLineSkeleton';
import IndicatorBar from '../../Charts/AdvancedChart/IndicatorBar';
import IntervalBar from '../../Charts/AdvancedChart/IntervalBar';
import TimeRangeSelector, {
  type TimeRange,
} from '../../Charts/AdvancedChart/TimeRangeSelector';
import { useTokenChartPreferences } from '../../AssetOverview/Price/hooks/useTokenChartPreferences';
import { TokenPriceTitleHub } from '../../AssetOverview/Price/TokenPriceTitleHub';
import {
  LINE_CHART_TIME_RANGES,
  TOKEN_OVERVIEW_CHART_HEIGHT,
} from '../../AssetOverview/Price/tokenOverviewChart.constants';

const PENDING_BODY_SKELETON_TEST_ID = 'token-details-pending-body-skeleton';

/**
 * Fills the space under the action buttons the way the loaded page does:
 * the market-insights card when that flag is on, then a balance row, a
 * second card, and the position line plus Buy button.
 */
const PendingBodySkeleton = (): React.ReactElement => {
  const isMarketInsightsEnabled = useSelector(selectMarketInsightsEnabled);

  return (
    <Box twClassName="w-full flex-1" testID={PENDING_BODY_SKELETON_TEST_ID}>
      {isMarketInsightsEnabled ? <MarketInsightsEntryCardSkeleton /> : null}
      <Box twClassName="mt-6 gap-3 px-4">
        <Skeleton twClassName="h-5 w-28 rounded-md" />
        <Box twClassName="flex-row items-center gap-3">
          <Skeleton twClassName="h-10 w-10 rounded-full" />
          <Box twClassName="flex-1 gap-2">
            <Skeleton twClassName="h-4 w-2/5 rounded-md" />
            <Skeleton twClassName="h-3.5 w-1/4 rounded-md" />
          </Box>
          <Skeleton twClassName="h-4 w-16 rounded-md" />
        </Box>
      </Box>
      <Box twClassName="mt-4 px-4">
        <Skeleton twClassName="h-[72px] w-full rounded-xl" />
      </Box>
      <Box twClassName="mt-auto gap-3 px-4 pb-6 pt-4">
        <Box twClassName="flex-row items-center justify-between">
          <Skeleton twClassName="h-4 w-24 rounded-md" />
          <Skeleton twClassName="h-4 w-12 rounded-md" />
        </Box>
        <Skeleton twClassName="h-12 w-full rounded-full" />
      </Box>
    </Box>
  );
};

const maLabelFrom = (indicators: string[]): string => {
  const movingAverages = indicators.filter((name) => /^MA\d+$/.test(name));
  if (movingAverages.length === 0) {
    return 'MA';
  }
  if (movingAverages.length === 1) {
    return movingAverages[0];
  }
  return `MA x${movingAverages.length}`;
};

/**
 * Shown while `/v2/assets` is still deciding the new page versus the legacy
 * page. The header uses the route token so it is visible immediately.
 *
 * The subtitle intentionally hides the contract address and omits the live
 * price: we do not yet know whether the token resolves to the memecoin TDP
 * (which hides the address) or the legacy TDP (which shows it). Displaying
 * either one here would cause a visible flicker on the transition.
 *
 * The body mirrors the loaded price section. The price stays a skeleton
 * because it is not known yet. Interval, indicator, and action controls are
 * the real buttons, and only the chart is a skeleton. Below the buttons, a
 * body skeleton stands in for the insights card, the balance block, and the
 * position line with its Buy button.
 */
const TokenDetailsPagePending = ({
  token,
}: {
  token: TokenDetailsRouteParams;
}) => {
  const navigation = useNavigation();
  const {
    chartType,
    chartInterval,
    indicators,
    setChartType,
    setChartInterval,
    setIndicators,
  } = useTokenChartPreferences();
  const isTechnicalIndicatorsEnabled = useSelector(
    selectTokenDetailsTechnicalIndicatorsEnabled,
  );
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const isLineMode = chartType === ChartType.Line;

  const handleLineRange = (range: string): void => {
    const match = LINE_CHART_TIME_RANGES.find((item) => item === range);
    if (!match) {
      return;
    }
    setTimeRange(match);
  };

  const handleIndicatorToggle = (name: string): void => {
    const next = new Set(indicators);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setIndicators([...next]);
  };

  const toggleChartType = (): void => {
    setChartType(
      chartType === ChartType.Candles ? ChartType.Line : ChartType.Candles,
    );
  };

  const chart = (
    <Box
      twClassName={`w-full ${isTechnicalIndicatorsEnabled ? 'mt-1' : 'mt-3'}`}
      style={{ height: TOKEN_OVERVIEW_CHART_HEIGHT }}
    >
      {chartType === ChartType.Candles ? (
        <ChartCandleSkeleton height={TOKEN_OVERVIEW_CHART_HEIGHT} />
      ) : (
        <ChartLineSkeleton height={TOKEN_OVERVIEW_CHART_HEIGHT} />
      )}
    </Box>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="flex-1"
      testID={TokenDetailsIds.pending}
    >
      <TokenDetailsInlineHeader
        token={token}
        securityData={null}
        onBackPress={() => navigation.goBack()}
        hideContractAddress
      />
      <TokenPriceTitleHub
        price={0}
        displayDiff={null}
        comparePrice={null}
        periodLabel={undefined}
        currentCurrency=""
        isLoading
      />
      {isTechnicalIndicatorsEnabled ? (
        <>
          <Box twClassName="w-full py-2">
            <IntervalBar
              intervals={isLineMode ? LINE_CHART_TIME_RANGES : undefined}
              selectedInterval={isLineMode ? timeRange : chartInterval}
              onIntervalSelect={isLineMode ? handleLineRange : setChartInterval}
              chartType={chartType}
              onChartTypeSelect={setChartType}
            />
          </Box>
          {chart}
          {isLineMode ? (
            <Box twClassName="pb-4" />
          ) : (
            <Box twClassName="mt-4 mb-4 w-full">
              <IndicatorBar
                maLabel={maLabelFrom(indicators)}
                activeIndicators={new Set(indicators)}
                onIndicatorToggle={handleIndicatorToggle}
              />
            </Box>
          )}
        </>
      ) : (
        <>
          {chart}
          <Box twClassName="w-full pt-3 pb-6">
            <TimeRangeSelector
              selected={timeRange}
              onSelect={setTimeRange}
              chartType={chartType}
              onChartTypeToggle={toggleChartType}
            />
          </Box>
        </>
      )}
      <TokenDetailsActionsSection
        token={token}
        showSkeletonWhileLoading={false}
      />
      <PendingBodySkeleton />
    </Box>
  );
};

export default TokenDetailsPagePending;
