/**
 * TradingView widget initialization and onChartReady orchestrator.
 */

/* eslint-disable @metamask/design-tokens/color-no-hex */

import { getState, suppressChartUserInteraction } from './state';
import {
  sendToReactNative,
  clearMmLayoutSettleFallbackTimer,
  queueTryCompleteLayoutSettleAfterData,
  abortDeferredLayoutSettleAndNotify,
} from './bridge';
import { getLineChrome } from './lineChrome';
import { getSeriesColorOverrides, generatePaletteShades } from './theme';
import { getApproxBarDurationSec } from './timeUtils';
import {
  VARIABLE_TICK_SIZE,
  SUPPORTED_RESOLUTIONS,
  filterBarsForRange,
  fetchOlderBars,
  OHLCV_BASE_URL,
} from './datafeed';
import { detectResolution } from './resolution';
import {
  applySeriesColors,
  applyChartScaleLayout,
  applyLineTimeScaleVisibility,
  updateCandleVolumeScaleColumnVisibility,
} from './chartLayout';
import {
  applyChartContainerOverflowUnclip,
  scheduleHidePriceScaleModeButtons,
  installTradingViewExternalOpenBridge,
} from './tvDomHacks';
import { refreshLineChartOverlays, createLastPriceLine } from './lastPrice';
import {
  ensureNoLineChartEndIcons,
  scheduleLineEndDotAfterVisibleRangeChange,
} from './lineEndDot';
import {
  hideCustomCrosshairLabels,
  updateCustomCrosshairLabels,
  scheduleLastCloseLabelUpdate,
  subscribeLastCloseLabelUpdates,
} from './overlays';
import { handleMessage } from './messageHandler';

import type { TVWidgetConstructor, TVCrosshairParams, OHLCVBar } from './types';

declare const TradingView: TVWidgetConstructor;

/** TV only supports a fixed set of IANA timezone IDs. */
const TV_SUPPORTED_TIMEZONES = [
  'Etc/UTC',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Tunis',
  'America/Anchorage',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Caracas',
  'America/Chicago',
  'America/El_Salvador',
  'America/Halifax',
  'America/Juneau',
  'America/Lima',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Phoenix',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Toronto',
  'America/Vancouver',
  'Asia/Astana',
  'Asia/Ashkhabad',
  'Asia/Bahrain',
  'Asia/Bangkok',
  'Asia/Chongqing',
  'Asia/Colombo',
  'Asia/Dhaka',
  'Asia/Dubai',
  'Asia/Ho_Chi_Minh',
  'Asia/Hong_Kong',
  'Asia/Jakarta',
  'Asia/Jerusalem',
  'Asia/Karachi',
  'Asia/Kabul',
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Kuala_Lumpur',
  'Asia/Kuwait',
  'Asia/Manila',
  'Asia/Muscat',
  'Asia/Nicosia',
  'Asia/Qatar',
  'Asia/Riyadh',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Taipei',
  'Asia/Tehran',
  'Asia/Tokyo',
  'Asia/Yangon',
  'Atlantic/Azores',
  'Atlantic/Reykjavik',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Sydney',
  'Europe/Amsterdam',
  'Europe/Athens',
  'Europe/Belgrade',
  'Europe/Berlin',
  'Europe/Bratislava',
  'Europe/Brussels',
  'Europe/Bucharest',
  'Europe/Budapest',
  'Europe/Copenhagen',
  'Europe/Dublin',
  'Europe/Helsinki',
  'Europe/Istanbul',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Luxembourg',
  'Europe/Madrid',
  'Europe/Malta',
  'Europe/Moscow',
  'Europe/Oslo',
  'Europe/Paris',
  'Europe/Prague',
  'Europe/Riga',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Tallinn',
  'Europe/Vienna',
  'Europe/Vilnius',
  'Europe/Warsaw',
  'Europe/Zurich',
  'Pacific/Auckland',
  'Pacific/Chatham',
  'Pacific/Fakaofo',
  'Pacific/Honolulu',
  'Pacific/Norfolk',
  'US/Mountain',
];

const CANONICAL_TO_TV: Record<string, string> = {
  'America/Denver': 'US/Mountain',
  'Asia/Ashgabat': 'Asia/Ashkhabad',
  'Asia/Almaty': 'Asia/Astana',
};

function resolveUserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC';
    const mapped = CANONICAL_TO_TV[tz] || tz;
    return TV_SUPPORTED_TIMEZONES.indexOf(mapped) !== -1 ? mapped : 'Etc/UTC';
  } catch {
    return 'Etc/UTC';
  }
}

/**
 * Builds the TradingView custom datafeed that reads from the shared state.
 */
function buildCustomDatafeed() {
  const s = getState();
  return {
    onReady(callback: (config: Record<string, unknown>) => void) {
      setTimeout(() => {
        callback({
          supported_resolutions: [...SUPPORTED_RESOLUTIONS],
          supports_marks: false,
          supports_timescale_marks: false,
          supports_time: true,
        });
      }, 0);
    },
    searchSymbols(
      _u: unknown,
      _e: unknown,
      _t: unknown,
      onResult: (result: unknown[]) => void,
    ) {
      onResult([]);
    },
    resolveSymbol(
      symbolName: string,
      onResolve: (info: Record<string, unknown>) => void,
    ) {
      setTimeout(() => {
        onResolve({
          name: symbolName,
          ticker: symbolName,
          description: symbolName,
          type: 'crypto',
          session: '24x7',
          timezone: 'Etc/UTC',
          exchange: '',
          minmov: 1,
          pricescale: 100,
          variable_tick_size: VARIABLE_TICK_SIZE,
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: true,
          supported_resolutions: [...SUPPORTED_RESOLUTIONS],
          volume_precision: 0,
          data_status: 'endofday',
        });
      }, 0);
    },
    getBars(
      _si: unknown,
      _res: unknown,
      periodParams: {
        from: number;
        to: number;
        countBack: number;
        firstDataRequest: boolean;
      },
      onResult: (bars: OHLCVBar[], meta: { noData: boolean }) => void,
      onError: (reason: string) => void,
    ) {
      try {
        const fromMs = periodParams.from * 1000;
        const toMs = periodParams.to * 1000;
        const countBack = periodParams.countBack;
        const firstRequest = periodParams.firstDataRequest;

        const deliverBars = (bars: OHLCVBar[], meta: { noData: boolean }) => {
          onResult(bars, meta);
          if (s.__mmLayoutSettlePending && periodParams.firstDataRequest) {
            queueTryCompleteLayoutSettleAfterData();
          }
        };

        const bars = filterBarsForRange(s.ohlcvData, fromMs, toMs, countBack);
        if (bars.length > 0) {
          deliverBars(bars, { noData: false });
          return;
        }
        if (firstRequest || s.ohlcvData.length === 0) {
          deliverBars([], { noData: true });
          return;
        }

        const oldestTs = s.ohlcvData[0].time;
        fetchOlderBars(
          { onResult, oldestAtDefer: oldestTs },
          {
            getOhlcvPagination: () => s.ohlcvPagination,
            getOhlcvGeneration: () => s.ohlcvGeneration,
            getOhlcvData: () => s.ohlcvData,
            setOhlcvData: (d) => {
              s.ohlcvData = d;
            },
            updatePagination: (cursor, hasNext) => {
              s.ohlcvPagination.nextCursor = cursor;
              s.ohlcvPagination.hasMore = hasNext;
            },
            onLayoutSettlePending: () => {
              if (s.__mmLayoutSettlePending)
                queueTryCompleteLayoutSettleAfterData();
            },
            sendDebug: (msg) => sendToReactNative('DEBUG', { message: msg }),
          },
        );
      } catch (error: unknown) {
        abortDeferredLayoutSettleAndNotify();
        onError(error instanceof Error ? error.message : String(error));
      }
    },
    subscribeBars(
      _si: unknown,
      _res: unknown,
      onTick: (tick: OHLCVBar) => void,
      listenerGuid: string,
    ) {
      s.realtimeCallbacks[listenerGuid] = onTick;
    },
    unsubscribeBars(listenerGuid: string) {
      delete s.realtimeCallbacks[listenerGuid];
    },
  };
}

let libraryLoadAttempts = 0;
const maxLibraryLoadAttempts = 50;

export function initChart(): void {
  const s = getState();
  if (s.chartWidget) return;

  if (typeof TradingView === 'undefined') {
    libraryLoadAttempts++;
    if (libraryLoadAttempts >= maxLibraryLoadAttempts) {
      const errorMsg =
        'TradingView library failed to initialize after ' +
        maxLibraryLoadAttempts * 100 +
        'ms';
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.textContent = errorMsg;
      sendToReactNative('ERROR', { message: errorMsg });
      return;
    }
    setTimeout(initChart, 100);
    return;
  }

  if (s.ohlcvData.length === 0) return;

  try {
    const theme = s.CONFIG.theme;
    const features = {
      disabledFeatures: s.CONFIG.disabledFeatures || [],
      enableDrawingTools: s.CONFIG.enableDrawingTools ?? false,
    };
    const lcInit = getLineChrome();
    const initCustomLabels = lcInit.useCustomPriceLabels;
    const initCustomDashed = lcInit.useCustomDashedLastPriceLine;
    const disabledFeatures = (features.disabledFeatures || []).slice();
    if (!features.enableDrawingTools) {
      disabledFeatures.push('left_toolbar', 'context_menus');
    }

    const visibleToSec = Math.ceil((s.visibleToMs ?? Date.now()) / 1000);
    const initBarPadSec = getApproxBarDurationSec(s.ohlcvData) * 2;
    const tfOption =
      s.visibleFromMs != null
        ? {
            type: 'time-range',
            from: Math.floor(s.visibleFromMs / 1000),
            to: visibleToSec + initBarPadSec,
          }
        : undefined;

    const userTimezone = resolveUserTimezone();

    s.chartWidget = new TradingView.widget({
      symbol: s.currentSymbol,
      interval: s.currentResolution || '5',
      timeframe: tfOption,
      container: 'tv_chart_container',
      datafeed: buildCustomDatafeed(),
      library_path: s.CONFIG.libraryUrl,
      locale: 'en',
      timezone: userTimezone,
      fullscreen: false,
      autosize: true,
      theme: 'Dark',
      disabled_features: disabledFeatures.concat(
        'use_localstorage_for_settings',
      ),
      enabled_features: ['study_templates', 'iframe_loading_same_origin'],
      custom_themes: {
        dark: {
          color1: generatePaletteShades(theme.successColor),
          color3: generatePaletteShades(theme.errorColor),
        },
      },
      overrides: Object.assign(
        {
          'paneProperties.background': theme.backgroundColor,
          'paneProperties.backgroundType': 'solid',
          'paneProperties.vertGridProperties.color': 'transparent',
          'paneProperties.horzGridProperties.color': 'transparent',
          'scalesProperties.textColor': theme.textColor,
          'scalesProperties.lineColor': theme.backgroundColor || '#131416',
          'timeScale.borderColor': theme.backgroundColor || '#131416',
          'scalesProperties.fontSize': 12,
          'scalesProperties.showStudyLastValue': false,
          'scalesProperties.showSeriesLastValue': !initCustomLabels,
          'scalesProperties.showSymbolLabels': false,
          'scalesProperties.showRightScale': true,
          'scalesProperties.showLeftScale': false,
          'scalesProperties.showPriceScaleCrosshairLabel': !initCustomLabels,
          'scalesProperties.showTimeScaleCrosshairLabel': !initCustomLabels,
          'scalesProperties.crosshairLabelBgColorDark': '#FFFFFF',
          'scalesProperties.crosshairLabelBgColorLight': '#FFFFFF',
          'mainSeriesProperties.showPriceLine': !initCustomDashed,
          'mainSeriesProperties.candleStyle.upColor': theme.successColor,
          'mainSeriesProperties.candleStyle.downColor': theme.errorColor,
          'mainSeriesProperties.candleStyle.borderUpColor': theme.successColor,
          'mainSeriesProperties.candleStyle.borderDownColor': theme.errorColor,
          'mainSeriesProperties.candleStyle.wickUpColor': theme.successColor,
          'mainSeriesProperties.candleStyle.wickDownColor': theme.errorColor,
        },
        getSeriesColorOverrides(theme.successColor),
      ),
      loading_screen: {
        backgroundColor: theme.backgroundColor,
        foregroundColor: theme.successColor,
      },
    });

    s.chartWidget.onChartReady(() => {
      suppressChartUserInteraction(1500);
      s.isChartReady = true;
      s.__mmLayoutSettlePending = false;
      clearMmLayoutSettleFallbackTimer();
      document.getElementById('loading-overlay')?.classList.add('hidden');

      s.pendingMessages.forEach((msg) => {
        handleMessage({ data: msg });
      });
      s.pendingMessages = [];

      applySeriesColors();
      applyChartScaleLayout(s.currentChartType, {
        hideCustomCrosshairLabels,
        scheduleLastCloseLabelUpdate,
      });
      scheduleHidePriceScaleModeButtons();

      if (s.currentChartType === 2) {
        refreshLineChartOverlays();
      } else {
        ensureNoLineChartEndIcons();
        createLastPriceLine();
      }

      try {
        s.chartWidget
          .activeChart()
          .selection()
          .onChanged()
          .subscribe(null, () => {
            s.chartWidget.activeChart().selection().clear();
          });
      } catch {
        /* */
      }

      let chartTimeScaleLayoutDebounce: ReturnType<typeof setTimeout> | null =
        null;
      try {
        s.chartWidget
          .activeChart()
          .getTimeScale()
          .barSpacingChanged()
          .subscribe(null, () => {
            if (chartTimeScaleLayoutDebounce)
              clearTimeout(chartTimeScaleLayoutDebounce);
            chartTimeScaleLayoutDebounce = setTimeout(() => {
              chartTimeScaleLayoutDebounce = null;
              if (!s.chartWidget) return;
              try {
                applyChartContainerOverflowUnclip();
                scheduleLastCloseLabelUpdate();
                if (s.currentChartType === 2) {
                  try {
                    requestAnimationFrame(() => refreshLineChartOverlays());
                  } catch {
                    /* */
                  }
                }
              } catch {
                /* */
              }
            }, 80);
          });
      } catch {
        /* */
      }

      subscribeLastCloseLabelUpdates();
      sendToReactNative('CHART_READY', {});
      installTradingViewExternalOpenBridge();

      // Chart interaction analytics
      let zoomDebounce: ReturnType<typeof setTimeout> | null = null;
      let panDebounce: ReturnType<typeof setTimeout> | null = null;
      let zoomLastFired = 0;

      const scheduleChartInteractZoom = () => {
        if (Date.now() < s.__mmSuppressChartInteractUntil) return;
        if (zoomDebounce) clearTimeout(zoomDebounce);
        zoomDebounce = setTimeout(() => {
          zoomDebounce = null;
          if (
            Date.now() < s.__mmSuppressChartInteractUntil ||
            !s.chartWidget ||
            !s.isChartReady
          )
            return;
          sendToReactNative('CHART_INTERACTED', { interaction_type: 'zoom' });
          zoomLastFired = Date.now();
        }, 450);
      };

      const scheduleChartInteractPan = () => {
        if (Date.now() < s.__mmSuppressChartInteractUntil) return;
        if (Date.now() - zoomLastFired < 500) return;
        if (panDebounce) clearTimeout(panDebounce);
        panDebounce = setTimeout(() => {
          panDebounce = null;
          if (
            Date.now() < s.__mmSuppressChartInteractUntil ||
            Date.now() - zoomLastFired < 500
          )
            return;
          if (!s.chartWidget || !s.isChartReady) return;
          sendToReactNative('CHART_INTERACTED', { interaction_type: 'pan' });
        }, 450);
      };

      try {
        s.chartWidget
          .activeChart()
          .getTimeScale()
          .barSpacingChanged()
          .subscribe(null, scheduleChartInteractZoom);
      } catch {
        /* */
      }
      try {
        s.chartWidget
          .activeChart()
          .onVisibleRangeChanged()
          .subscribe(null, () => {
            scheduleChartInteractPan();
            if (getLineChrome().useCustomLineEndMarker)
              scheduleLineEndDotAfterVisibleRangeChange();
          });
      } catch {
        /* */
      }

      // Crosshair
      try {
        s.ohlcvBarVisible = false;
        s.ohlcvBarShownAt = 0;
        s.ohlcvDismissUntil = 0;
        s.__mmTooltipChartInteractSent = false;

        s.chartWidget
          .activeChart()
          .crossHairMoved()
          .subscribe(null, (...args: unknown[]) => {
            const params = args[0] as TVCrosshairParams | undefined;
            if (
              !params ||
              params.price === undefined ||
              params.time === undefined
            ) {
              hideCustomCrosshairLabels();
              return;
            }
            if (Date.now() < s.ohlcvDismissUntil) {
              hideCustomCrosshairLabels();
              return;
            }
            updateCustomCrosshairLabels(params);
            if (!s.ohlcvBarVisible) s.ohlcvBarShownAt = Date.now();
            s.ohlcvBarVisible = true;
            const targetTime = params.time * 1000;
            let closestBar: OHLCVBar | null = null;
            let minDiff = Infinity;
            for (const bar of s.ohlcvData) {
              const diff = Math.abs(bar.time - targetTime);
              if (diff < minDiff) {
                minDiff = diff;
                closestBar = bar;
              }
            }
            if (closestBar) {
              if (!s.__mmTooltipChartInteractSent) {
                sendToReactNative('CHART_INTERACTED', {
                  interaction_type: 'tooltip',
                });
                s.__mmTooltipChartInteractSent = true;
              }
              sendToReactNative('CROSSHAIR_MOVE', {
                data: {
                  time: closestBar.time,
                  open: closestBar.open,
                  high: closestBar.high,
                  low: closestBar.low,
                  close: closestBar.close,
                  volume: closestBar.volume,
                },
              });
            }
          });

        let mouseDownTime = 0;
        s.chartWidget.subscribe('mouse_down', () => {
          mouseDownTime = Date.now();
          s.ohlcvDismissUntil = 0;
        });
        s.chartWidget.subscribe('mouse_up', () => {
          if (!s.ohlcvBarVisible) return;
          const pressDuration = Date.now() - mouseDownTime;
          if (pressDuration < 400) {
            if (Date.now() - s.ohlcvBarShownAt < 500) return;
            s.ohlcvBarVisible = false;
            s.ohlcvBarShownAt = 0;
            s.ohlcvDismissUntil = Date.now() + 800;
            hideCustomCrosshairLabels();
            setTimeout(() => {
              s.__mmTooltipChartInteractSent = false;
              sendToReactNative('CROSSHAIR_MOVE', { data: null });
            }, 50);
          }
        });
      } catch {
        /* */
      }
    });
  } catch (error: unknown) {
    sendToReactNative('ERROR', {
      message:
        'Failed to initialize chart: ' +
        (error instanceof Error ? error.message : String(error)),
    });
  }
}
