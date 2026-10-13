import React from 'react';
import { View, Platform } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import AdvancedChart from '../../Charts/AdvancedChart/AdvancedChart';
import { ChartType } from '../../Charts/AdvancedChart/AdvancedChart.types';
import TimeRangeSelector from '../../Charts/AdvancedChart/TimeRangeSelector';
import IndicatorBar from '../../Charts/AdvancedChart/IndicatorBar';
import IntervalBar from '../../Charts/AdvancedChart/IntervalBar';
import LinePriceChart from '../PriceChart/PriceChart';
import NoDataOverlay from '../NoDataOverlay/NoDataOverlay';
import { AMBIENT_NEGATIVE_COLOR } from '../../TokenDetails/components/abTestConfig';
import type { TimePeriod } from '../../../../components/hooks/useTokenHistoricalPrices';
import {
  LINE_CHART_TIME_RANGES,
  TIME_PERIOD_MS,
} from './tokenOverviewChart.constants';
import { usePriceChartContext } from './Price.context';

/** Interval selector in line mode, granularity selector in candle mode. */
const IntervalBarRow = () => {
  const {
    chartType,
    displayInterval,
    handleChartTypeSelect,
    handleInlineIntervalSelect,
    handleLineTimeRangeSelect,
    isLineMode,
    styles,
    timeRange,
  } = usePriceChartContext();

  return (
    <View style={styles.intervalBarContainer}>
      <View style={styles.timeRangeSelectorWrap}>
        <Box twClassName="w-full">
          <IntervalBar
            intervals={isLineMode ? LINE_CHART_TIME_RANGES : undefined}
            selectedInterval={isLineMode ? timeRange : displayInterval}
            onIntervalSelect={
              isLineMode
                ? handleLineTimeRangeSelect
                : handleInlineIntervalSelect
            }
            chartType={chartType}
            onChartTypeSelect={handleChartTypeSelect}
          />
        </Box>
      </View>
    </View>
  );
};

/**
 * Below-chart controls: the time-range selector when technical indicators are
 * off, the indicator bar when they are on, and height-matched spacers so
 * switching modes never shifts the content underneath.
 */
const BottomChrome = () => {
  const {
    activeIndicators,
    chartType,
    handleIndicatorToggle,
    handleLineTimeRangeSelect,
    handleMAPress,
    handleTimeRangeSelect,
    initialAmbientColor,
    isInitialChartPending,
    isLineMode,
    isLoading,
    isTechnicalIndicatorsEnabled,
    maLabel,
    shouldShowTechnicalIndicators,
    showCandleEmptyState,
    styles,
    timeRange,
    toggleChartType,
  } = usePriceChartContext();

  if (isLineMode) {
    if (isTechnicalIndicatorsEnabled) {
      // Match the IndicatorBar / Skeleton height so switching modes doesn't shift buttons
      return (
        <Box twClassName="w-full mt-4 mb-6" style={styles.indicatorBarSpacer} />
      );
    }
    return (
      <View style={styles.timeRangeContainer}>
        <View style={styles.timeRangeSelectorWrap}>
          <TimeRangeSelector
            isChartLoading={isLoading}
            selected={timeRange}
            onSelect={handleLineTimeRangeSelect}
            chartType={chartType}
            onChartTypeToggle={toggleChartType}
            selectedColor={initialAmbientColor}
          />
        </View>
      </View>
    );
  }

  if (showCandleEmptyState && isTechnicalIndicatorsEnabled) {
    // Match the IndicatorBar / Skeleton height so switching modes doesn't shift buttons
    return (
      <Box twClassName="w-full mt-4 mb-6" style={styles.indicatorBarSpacer} />
    );
  }

  if (shouldShowTechnicalIndicators && chartType === ChartType.Candles) {
    return (
      <Box twClassName="w-full mt-4 mb-6">
        <IndicatorBar
          maLabel={maLabel}
          onMAPress={handleMAPress}
          activeIndicators={activeIndicators}
          onIndicatorToggle={handleIndicatorToggle}
        />
      </Box>
    );
  }

  if (
    isTechnicalIndicatorsEnabled &&
    chartType === ChartType.Candles &&
    !shouldShowTechnicalIndicators
  ) {
    return (
      <Box twClassName="w-full px-4 mt-4 mb-6">
        <Skeleton height={37} width="100%" />
      </Box>
    );
  }

  if (!shouldShowTechnicalIndicators && !isTechnicalIndicatorsEnabled) {
    return (
      <View style={styles.timeRangeContainer}>
        <View style={styles.timeRangeSelectorWrap}>
          <TimeRangeSelector
            isChartLoading={isInitialChartPending}
            selected={timeRange}
            onSelect={handleTimeRangeSelect}
            chartType={chartType}
            onChartTypeToggle={toggleChartType}
            selectedColor={initialAmbientColor}
          />
        </View>
      </View>
    );
  }

  return <Box twClassName="pb-4" />;
};

/**
 * The chart itself plus its surrounding chrome. `AdvancedChart` stays mounted
 * even in line mode or the candle empty state so the WebView is not torn down
 * and rebuilt every time the user toggles.
 */
export const PriceChartSection = () => {
  const {
    activeIndicators,
    ambientSuccessGreen,
    chartHeight,
    chartLoading,
    chartPresets,
    chartType,
    chartWebViewSessionKey,
    distributedRealtimePrices,
    handleAdvancedChartError,
    handleAdvancedChartInitFailed,
    handleAdvancedChartLayoutSettled,
    handleAdvancedChartSkeletonHidden,
    handleChartInteracted,
    handleChartTradingViewClicked,
    handleCrosshairMove,
    handleLineChartInteraction,
    hasChartBeenRevealed,
    hasInsufficientCoverage,
    indicatorsArray,
    initialAmbientColor,
    isInitialChartPending,
    isLineMode,
    isLoading,
    isTechnicalIndicatorsEnabled,
    ohlcvData,
    ohlcvPagination,
    ohlcvSeriesKey,
    priceDiff,
    realtimeBar,
    selectedMAs,
    shouldShowTechnicalIndicators,
    showCandleEmptyState,
    showChartIndicators,
    styles,
    theme,
    timeRange,
    tokenDetailsLegendOverlay,
    visibleFromMs,
    visibleToMs,
  } = usePriceChartContext();

  const showVolume = isTechnicalIndicatorsEnabled
    ? chartType === ChartType.Candles && activeIndicators.has('Volume')
    : chartType === ChartType.Candles;

  return (
    <>
      {/* ── Skeleton bar (flag ON, candle mode only) ───────────────────── */}
      {isTechnicalIndicatorsEnabled &&
        !isLineMode &&
        !showCandleEmptyState &&
        isInitialChartPending && (
          <View style={styles.intervalBarContainer}>
            <View style={styles.timeRangeSelectorWrap}>
              <Box twClassName="w-full px-4">
                <Skeleton height={29} width="100%" />
              </Box>
            </View>
          </View>
        )}

      {/* ── IntervalBar (flag ON) ──────────────────────────────────────── */}
      {isTechnicalIndicatorsEnabled &&
        (isLineMode ||
          shouldShowTechnicalIndicators ||
          showCandleEmptyState) && <IntervalBarRow />}

      {/* ── Chart area ─────────────────────────────────────────────────── */}
      {isLineMode && (
        <Box
          twClassName={
            isTechnicalIndicatorsEnabled
              ? 'w-full overflow-hidden'
              : 'mt-3 w-full overflow-hidden'
          }
          style={{ height: chartHeight }}
        >
          <LinePriceChart
            prices={distributedRealtimePrices}
            priceDiff={priceDiff}
            isLoading={isLoading}
            onChartIndexChange={handleLineChartInteraction}
            chartColorOverride={initialAmbientColor ?? undefined}
            hasInsufficientCoverage={hasInsufficientCoverage}
            timePeriodMs={
              TIME_PERIOD_MS[timeRange.toLowerCase() as TimePeriod] ?? undefined
            }
          />
        </Box>
      )}

      {/* ── Candle empty state (no OHLCV data / chart error / init failed) ── */}
      {showCandleEmptyState && (
        <Box
          twClassName={isTechnicalIndicatorsEnabled ? 'w-full' : 'mt-3 w-full'}
          style={{ height: chartHeight }}
        >
          <NoDataOverlay
            chartHeight={chartHeight}
            chartPlaceholderFill={theme.colors.border.muted}
          />
        </Box>
      )}

      {/* Keep AdvancedChart mounted but hidden in line mode or candle empty state */}
      <Box
        twClassName={isTechnicalIndicatorsEnabled ? 'w-full' : 'mt-3 w-full'}
        style={
          isLineMode || showCandleEmptyState
            ? styles.hiddenChartContainer
            : undefined
        }
      >
        <View
          testID="advanced-chart-touch-container"
          style={[styles.chartContainer, { height: chartHeight }]}
        >
          {Platform.OS === 'ios' && (
            <View style={styles.edgeOverlay} pointerEvents="box-only" />
          )}
          <AdvancedChart
            ohlcvData={ohlcvData}
            ohlcvSeriesKey={ohlcvSeriesKey}
            webViewInstanceKey={
              isTechnicalIndicatorsEnabled ? chartWebViewSessionKey : undefined
            }
            realtimeBar={realtimeBar}
            height={chartHeight}
            showVolume={showVolume}
            volumeOverlay
            chartType={chartType}
            indicators={showChartIndicators ? indicatorsArray : []}
            selectedMAs={showChartIndicators ? selectedMAs : []}
            subPaneHeightRatio={chartPresets.subPaneHeightRatio}
            useSubscriptPriceFormat={chartPresets.useSubscriptPriceFormat}
            isLoading={
              isTechnicalIndicatorsEnabled
                ? !hasChartBeenRevealed && chartLoading
                : chartLoading
            }
            ohlcvPagination={ohlcvPagination}
            visibleFromMs={visibleFromMs}
            visibleToMs={visibleToMs}
            onCrosshairMove={handleCrosshairMove}
            onChartInteracted={handleChartInteracted}
            onChartTradingViewClicked={handleChartTradingViewClicked}
            onSkeletonHidden={handleAdvancedChartSkeletonHidden}
            onChartLayoutSettled={
              isTechnicalIndicatorsEnabled
                ? handleAdvancedChartLayoutSettled
                : undefined
            }
            onError={handleAdvancedChartError}
            onInitFailed={handleAdvancedChartInitFailed}
            lineColorOverride={initialAmbientColor}
            successColorOverride={
              initialAmbientColor ? ambientSuccessGreen : undefined
            }
            errorColorOverride={
              initialAmbientColor ? AMBIENT_NEGATIVE_COLOR : undefined
            }
            legendOverlay={tokenDetailsLegendOverlay}
          />
        </View>
      </Box>

      {/* ── Bottom chrome ──────────────────────────────────────────────── */}
      <BottomChrome />
    </>
  );
};
