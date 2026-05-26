/**
 * Chart scale layout, series colors, and time-scale visibility.
 */

import { getState } from './state';
import { getSeriesColorOverrides } from './theme';
import { getLineChrome } from './lineChrome';
import {
  removeLineChartMarkupStyle,
  applyChartContainerOverflowUnclip,
  scheduleChartDomUnclip,
  applyHidePriceScaleModeButtons,
  eachChartDocument,
  tvScopedDomSelectors,
  removeInjectedStyleByIdFromChartDocs,
  removeCandleVolumeScaleMarkup,
  getChartMarkupTableContext,
} from './tvDomHacks';

/* eslint-disable @metamask/design-tokens/color-no-hex */

export function applySeriesColors(): void {
  const s = getState();
  if (!s.chartWidget) return;
  const color = s.CONFIG.theme.successColor;
  try {
    s.chartWidget.applyOverrides(getSeriesColorOverrides(color));
    const series = s.chartWidget.activeChart().getSeries();
    series.setChartStyleProperties(2, {
      color,
      colorType: 'solid',
      linewidth: 2,
    });
    series.setChartStyleProperties(10, {
      topLineColor: color,
      bottomLineColor: color,
      topLineWidth: 2,
      bottomLineWidth: 2,
    });
  } catch {
    // swallow
  }
}

export function syncMainSeriesToRightScale(): void {
  const s = getState();
  if (!s.chartWidget || !s.isChartReady) return;
  try {
    s.chartWidget.activeChart().getSeries().detachToRight();
  } catch {
    // swallow
  }
}

export function scheduleLineChartLayoutReflow(): void {
  const s = getState();
  if (s.currentChartType !== 2 || !s.chartWidget) return;
  function run() {
    const st = getState();
    if (!st.chartWidget || st.currentChartType !== 2) return;
    try {
      syncMainSeriesToRightScale();
    } catch {
      // swallow
    }
  }
  try {
    requestAnimationFrame(run);
  } catch {
    setTimeout(run, 0);
  }
  setTimeout(run, 120);
}

export function injectHideTimeAxisStyle(): void {
  const s = getState();
  const paneBg = s.CONFIG?.theme?.backgroundColor || '#131416';
  eachChartDocument((targetDoc) => {
    if (!targetDoc?.getElementById) return;
    const id = 'tv-hide-time-axis';
    const existing = targetDoc.getElementById(id);
    if (existing) existing.remove();
    const sel = tvScopedDomSelectors(targetDoc);
    const hide =
      'display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;' +
      'max-height:0!important;overflow:hidden!important;pointer-events:none!important;opacity:0!important;' +
      'flex:0 0 0!important;margin:0!important;padding:0!important;border:none!important;';
    const style = targetDoc.createElement('style');
    style.id = id;
    style.textContent =
      sel.widgetSel +
      '{background-color:' +
      paneBg +
      '!important;}' +
      sel.chartRootSel +
      '{display:flex!important;flex-direction:column!important;background-color:' +
      paneBg +
      '!important;}' +
      sel.chartRootSel +
      ' > div{background-color:' +
      paneBg +
      '!important;}' +
      sel.chartRootSel +
      '>div:last-child{' +
      hide +
      '}' +
      sel.chartRootSel +
      '>div:last-child .time-axis,' +
      sel.chartRootSel +
      '>div:last-child [class*="price-axis-container"]{' +
      hide +
      '}' +
      sel.chartRootSel +
      '>div:first-child{display:flex!important;flex:1 1 auto!important;height:100%!important;min-height:0!important;' +
      'max-height:none!important;align-items:stretch!important;align-self:stretch!important;}' +
      sel.chartRootSel +
      '>div:first-child > .chart-markup-table.pane,' +
      sel.chartRootSel +
      '>div:first-child > .pane,' +
      sel.chartRootSel +
      '>div:first-child > .chart-markup-table.price-axis-container{' +
      'flex:1 1 auto!important;height:100%!important;min-height:100%!important;max-height:none!important;align-self:stretch!important;' +
      'background-color:' +
      paneBg +
      '!important;}' +
      sel.chartRootSel +
      '>div:first-child .chart-gui-wrapper{height:100%!important;min-height:100%!important;max-height:none!important;' +
      'background-color:' +
      paneBg +
      '!important;}' +
      sel.screenSel +
      '{background:' +
      paneBg +
      '!important;}';
    (targetDoc.head || targetDoc.documentElement).appendChild(style);
  });
}

export function removeHideTimeAxisStyle(): void {
  removeInjectedStyleByIdFromChartDocs('tv-hide-time-axis');
}

export function applyLineTimeScaleVisibility(hide: boolean): void {
  const s = getState();
  if (!s.chartWidget) return;
  const shouldHide = s.currentChartType === 2 && hide;
  try {
    s.chartWidget.applyOverrides({ 'timeScale.visible': !shouldHide });
  } catch {
    // swallow
  }
  try {
    s.chartWidget.applyOverrides({
      'scalesProperties.hideTimeScale': shouldHide,
    });
  } catch {
    // swallow
  }
  if (shouldHide) {
    injectHideTimeAxisStyle();
    const nudgeResizeAfterHideTimeAxis = () => {
      const st = getState();
      if (
        !st.chartWidget ||
        st.currentChartType !== 2 ||
        !getLineChrome().hideTimeScale
      )
        return;
      try {
        st.chartWidget.resize();
      } catch {
        // swallow
      }
    };
    try {
      requestAnimationFrame(() => {
        requestAnimationFrame(nudgeResizeAfterHideTimeAxis);
      });
    } catch {
      setTimeout(nudgeResizeAfterHideTimeAxis, 0);
    }
    setTimeout(nudgeResizeAfterHideTimeAxis, 120);
  } else {
    removeHideTimeAxisStyle();
  }
}

export function updateCandleVolumeScaleColumnVisibility(): void {
  removeCandleVolumeScaleMarkup();
  const s = getState();
  if (!s.chartWidget || !s.isChartReady) return;
  if (s.currentChartType === 2) return;
  if (!s.volumeStudyId) return;

  const ctx = getChartMarkupTableContext();
  if (!ctx) return;

  const targetDoc = ctx.doc;
  const sel = tvScopedDomSelectors(targetDoc);
  const bg = s.CONFIG.theme.backgroundColor;

  const style = targetDoc.createElement('style');
  style.id = 'tv-candle-volume-markup';
  style.textContent =
    sel.overflowRule +
    sel.widgetSel +
    '{background:' +
    bg +
    '!important;}' +
    sel.screenSel +
    '{background:' +
    bg +
    '!important;}' +
    sel.chartRootSel +
    '{background:' +
    bg +
    '!important;}';
  (targetDoc.head || targetDoc.documentElement).appendChild(style);
}

/**
 * Central scale/chrome applicator — called after chart ready, chart type change, and line chrome change.
 */
export function applyChartScaleLayout(
  type: number,
  callbacks?: {
    hideCustomCrosshairLabels?: () => void;
    scheduleLastCloseLabelUpdate?: () => void;
  },
): void {
  const s = getState();
  if (!s.chartWidget) return;

  const theme = s.CONFIG.theme;
  const lc = getLineChrome();
  const useCustomLabels = lc.useCustomPriceLabels;
  const useCustomDashed = lc.useCustomDashedLastPriceLine;
  const axisLineColor = theme.backgroundColor || '#131416';

  try {
    s.chartWidget.applyOverrides({
      'scalesProperties.showRightScale': true,
      'scalesProperties.showLeftScale': false,
      'scalesProperties.showSeriesLastValue': !useCustomLabels,
      'scalesProperties.showStudyLastValue': false,
      'scalesProperties.showSymbolLabels': false,
      'scalesProperties.showPriceScaleCrosshairLabel': !useCustomLabels,
      'scalesProperties.showTimeScaleCrosshairLabel': !useCustomLabels,
      'scalesProperties.crosshairLabelBgColorDark': '#FFFFFF',
      'scalesProperties.crosshairLabelBgColorLight': '#FFFFFF',
      'scalesProperties.textColor': theme.textColor,
      'mainSeriesProperties.showPriceLine': !useCustomDashed,
      'timeScale.borderColor': axisLineColor,
      'scalesProperties.lineColor': axisLineColor,
      'paneProperties.separatorColor': theme.backgroundColor,
      'paneProperties.topMargin': 12,
      'paneProperties.bottomMargin': 8,
    });
  } catch {
    // swallow
  }

  removeLineChartMarkupStyle();
  syncMainSeriesToRightScale();
  if (type === 2) {
    scheduleLineChartLayoutReflow();
  }
  applyChartContainerOverflowUnclip();
  scheduleChartDomUnclip();
  updateCandleVolumeScaleColumnVisibility();
  applyHidePriceScaleModeButtons();
  applyLineTimeScaleVisibility(
    s.currentChartType === 2 ? lc.hideTimeScale : false,
  );
  if (!useCustomLabels) {
    callbacks?.hideCustomCrosshairLabels?.();
  } else {
    callbacks?.scheduleLastCloseLabelUpdate?.();
  }
}
