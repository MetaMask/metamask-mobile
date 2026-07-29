// Volume study handler. Supports overlay-on-main-pane and sub-pane modes.
//
// Ported from chartLogic.js handleToggleVolume (~line 4877) +
// createVolumeStudy (~line 4824). Sub-pane mode reshapes pane heights to
// give the volume strip ~22% of total chart height with sensible minimums.

import { reportErrorToRN } from '../../core/bridge';
import {
  getTheme,
  getVolumeIsOverlay,
  getVolumeStudyId,
  getWidget,
  isChartReady,
  setVolumeIsOverlay,
  setVolumeStudyId,
} from '../../core/state';
import { scheduleLegendRefresh } from '../indicators/legend';
import type { ToggleVolumeMessage } from '../../messages/contract';
import type { ChartTheme, TVActiveChart } from '../../core/types';
import {
  getVolumeErrorColor,
  getVolumeSuccessColor,
  subscribeTheme,
} from '../../widget/theme';

const MIN_VOLUME_PX = 56;
const MIN_MAIN_PX = 72;
const VOLUME_RATIO = 0.22;

function buildVolumeOverrides(useOverlay: boolean): Record<string, unknown> {
  const theme = getTheme();
  if (!theme) {
    return {
      'volume ma.display': 0,
      'volume.transparency': useOverlay ? 70 : 0,
    };
  }
  return {
    'volume ma.display': 0,
    'volume.transparency': useOverlay ? 70 : 0,
    'volume.color.0': getVolumeErrorColor(theme),
    'volume.color.1': getVolumeSuccessColor(theme),
  };
}

function applySubPaneHeights(chart: TVActiveChart): void {
  try {
    const heights = chart.getAllPanesHeight();
    if (heights.length !== 2) return;
    const total = heights[0] + heights[1];
    let vol = Math.max(Math.round(total * VOLUME_RATIO), MIN_VOLUME_PX);
    let main = total - vol;
    if (main < MIN_MAIN_PX && total > MIN_MAIN_PX + MIN_VOLUME_PX) {
      main = MIN_MAIN_PX;
      vol = total - main;
    } else if (main < MIN_MAIN_PX) {
      main = Math.max(48, total - MIN_VOLUME_PX);
      vol = total - main;
    }
    chart.setAllPanesHeight([main, vol]);
  } catch (error) {
    reportErrorToRN(error);
  }
}

function createVolumeStudy(useOverlay: boolean): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) return;
  if (getVolumeStudyId()) return;

  const chart = widget.activeChart();
  const overrides = buildVolumeOverrides(useOverlay);
  const promise = useOverlay
    ? chart.createStudy('Volume', true, false, {}, overrides, {
        priceScale: 'no-scale',
      })
    : chart.createStudy('Volume', false, false, {}, overrides);

  promise
    .then((studyId) => {
      setVolumeStudyId(studyId);
      if (!useOverlay) applySubPaneHeights(chart);
      scheduleLegendRefresh();
    })
    .catch((error) => reportErrorToRN(error));
}

export function handleToggleVolume(
  payload: ToggleVolumeMessage['payload'],
): void {
  const widget = getWidget();
  if (!widget || !isChartReady() || !payload) return;

  const useOverlay = payload.volumeOverlay === true;

  if (!payload.visible) {
    const existing = getVolumeStudyId();
    if (existing) {
      try {
        widget.activeChart().removeEntity(existing);
      } catch (error) {
        reportErrorToRN(error);
      }
      setVolumeStudyId(null);
    }
    setVolumeIsOverlay(null);
    scheduleLegendRefresh();
    return;
  }

  const existing = getVolumeStudyId();
  if (
    existing &&
    getVolumeIsOverlay() !== null &&
    getVolumeIsOverlay() !== useOverlay
  ) {
    try {
      widget.activeChart().removeEntity(existing);
    } catch (error) {
      reportErrorToRN(error);
    }
    setVolumeStudyId(null);
  }

  setVolumeIsOverlay(useOverlay);
  if (!getVolumeStudyId()) {
    createVolumeStudy(useOverlay);
  }
}

function recolorVolumeStudy(theme: ChartTheme): void {
  const studyId = getVolumeStudyId();
  if (!studyId) return;
  const widget = getWidget();
  if (!widget || !isChartReady()) return;
  try {
    const study = widget.activeChart().getStudyById(studyId);
    if (study && typeof study.applyOverrides === 'function') {
      study.applyOverrides({
        'volume.color.0': getVolumeErrorColor(theme),
        'volume.color.1': getVolumeSuccessColor(theme),
      });
    }
  } catch (error) {
    reportErrorToRN(error);
  }
}

export function registerVolumeThemeSync(): void {
  subscribeTheme(recolorVolumeStudy);
}
