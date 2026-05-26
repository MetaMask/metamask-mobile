/**
 * Volume study creation and toggle handling.
 */

import { getState, suppressChartUserInteraction } from './state';

import type { TVEntityId, ToggleVolumePayload } from './types';

export function createVolumeStudy(useOverlay: boolean): void {
  const s = getState();
  if (!s.chartWidget || !s.isChartReady) return;
  if (s.volumeStudyId) return;

  try {
    const chart = s.chartWidget.activeChart();
    const theme = s.CONFIG.theme;
    const inputs: Record<string, string | number> = {
      'volume ma.display': 0,
      'volume.color.0': theme.errorColor,
      'volume.color.1': theme.successColor,
      'volume.transparency': useOverlay ? 70 : 0,
    };
    const promise = useOverlay
      ? chart.createStudy('Volume', true, false, {}, inputs, {
          priceScale: 'no-scale',
        })
      : chart.createStudy('Volume', false, false, {}, inputs);

    promise
      .then((studyId: TVEntityId) => {
        s.volumeStudyId = studyId;
        try {
          const heights = chart.getAllPanesHeight();
          if (heights.length === 2) {
            const total = heights[0] + heights[1];
            const minVolumePx = 56;
            const minMainPx = 72;
            let vol = Math.max(Math.round(total * 0.22), minVolumePx);
            let main = total - vol;
            if (main < minMainPx && total > minMainPx + minVolumePx) {
              main = minMainPx;
              vol = total - main;
            } else if (main < minMainPx) {
              main = Math.max(48, total - minVolumePx);
              vol = total - main;
            }
            chart.setAllPanesHeight([main, vol]);
          }
        } catch {
          // swallow
        }
      })
      .catch(() => {
        /* noop */
      });
  } catch {
    // swallow
  }
}

export function handleToggleVolume(payload: ToggleVolumePayload): void {
  const s = getState();
  if (!s.chartWidget || !s.isChartReady || !payload) return;

  suppressChartUserInteraction(600);

  const useOverlay = payload.volumeOverlay === true;

  if (!payload.visible) {
    if (s.volumeStudyId) {
      try {
        s.chartWidget.activeChart().removeEntity(s.volumeStudyId);
      } catch {
        // swallow
      }
      s.volumeStudyId = null;
    }
    s.volumeIsOverlay = null;
    return;
  }

  if (
    s.volumeStudyId &&
    s.volumeIsOverlay !== null &&
    s.volumeIsOverlay !== useOverlay
  ) {
    try {
      s.chartWidget.activeChart().removeEntity(s.volumeStudyId);
    } catch {
      // swallow
    }
    s.volumeStudyId = null;
  }

  s.volumeIsOverlay = useOverlay;
  if (!s.volumeStudyId) {
    createVolumeStudy(useOverlay);
  }
}
