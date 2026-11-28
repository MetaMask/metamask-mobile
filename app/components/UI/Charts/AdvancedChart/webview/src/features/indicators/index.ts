// ADD_INDICATOR / REMOVE_INDICATOR handlers.
//
// Ported from chartLogic.js handleAddIndicator (~line 803) and
// handleRemoveIndicator (~line 891). Every indicator — moving averages
// included — goes through these two handlers; study arguments come from the
// RN-supplied registry (CONFIG.indicatorDefinitions). Consumers needing TV's
// native study picker can re-enable header_widget via the disabledFeatures prop.

import { postToRN, reportErrorToRN } from '../../core/bridge';
import {
  getActiveStudies,
  getWidget,
  isChartReady,
  registerStudy,
  unregisterStudy,
} from '../../core/state';
import type { ChartConfig, StudyId } from '../../core/types';
import type {
  AddIndicatorMessage,
  RemoveIndicatorMessage,
} from '../../messages/contract';
import {
  removeSubPaneOverlay,
  scheduleLegendRefresh,
  subscribeStudyDataLoaded,
} from './legend';
import { scheduleChartWidgetResize } from './resize';
import { applySubPaneHeightRatio, hasActiveSubPaneIndicators } from './subPane';
import {
  createIndicatorStudy,
  isSubPanePreset,
  resolveStudyPreset,
} from './studies';

function isOwnStringKey(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    key !== '__proto__' &&
    key !== 'constructor' &&
    key !== 'prototype'
  );
}

/**
 * Indicators whose createStudy promise hasn't resolved yet. The value is true
 * once a REMOVE_INDICATOR arrived for it, so the study is dropped on arrival.
 * Prevents duplicate studies when RN re-syncs before INDICATOR_ADDED lands.
 */
const pendingCreates = new Map<string, boolean>();

function notifyIndicatorAdded(name: string, studyId: StudyId): void {
  // Two-frame wait so RN reads the legend overlay after layout completes.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      postToRN('INDICATOR_ADDED', { name, id: String(studyId) });
    });
  });
}

export function handleAddIndicator(
  payload: AddIndicatorMessage['payload'],
  config: ChartConfig,
): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) return;
  if (!payload?.name) return;
  const name = payload.name;
  if (!isOwnStringKey(name)) return;
  if (getActiveStudies().has(name)) return;
  if (pendingCreates.has(name)) {
    // Re-added before the first create resolved — keep that one.
    pendingCreates.set(name, false);
    return;
  }

  const chart = widget.activeChart();
  const preset = resolveStudyPreset(
    name,
    config.indicatorDefinitions,
    payload.inputs,
  );

  pendingCreates.set(name, false);
  createIndicatorStudy(chart, preset)
    .then((studyId) => {
      const removedWhilePending = pendingCreates.get(name) === true;
      pendingCreates.delete(name);
      if (removedWhilePending) {
        chart.removeEntity(studyId);
        return;
      }
      registerStudy(name, studyId);
      if (isSubPanePreset(preset)) {
        applySubPaneHeightRatio(chart);
      }
      subscribeStudyDataLoaded(chart, studyId);
      scheduleChartWidgetResize();
      notifyIndicatorAdded(name, studyId);
    })
    .catch((error) => {
      pendingCreates.delete(name);
      reportErrorToRN(
        error instanceof Error
          ? new Error(`Failed to add indicator: ${error.message}`)
          : error,
      );
    });
}

export function handleRemoveIndicator(
  payload: RemoveIndicatorMessage['payload'],
): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) return;
  if (!payload?.name) return;
  const name = payload.name;
  if (!isOwnStringKey(name)) return;
  if (pendingCreates.has(name)) {
    pendingCreates.set(name, true);
    return;
  }
  if (!getActiveStudies().has(name)) return;

  const studyId = unregisterStudy(name);
  if (!studyId) return;

  try {
    const chart = widget.activeChart();
    const study = chart.getStudyById(studyId);
    const paneIdx = study?.paneIndex?.();
    const wasSubPane = paneIdx !== undefined && paneIdx > 0;

    if (wasSubPane) {
      removeSubPaneOverlay(name);
    }

    chart.removeEntity(studyId);

    scheduleLegendRefresh();
    postToRN('INDICATOR_REMOVED', { name });
    if (wasSubPane && hasActiveSubPaneIndicators()) {
      applySubPaneHeightRatio(chart);
    }
  } catch (error) {
    reportErrorToRN(error);
  }
}

/** Test-only: clear module-local state between cases. */
export function __resetIndicatorsForTests(): void {
  pendingCreates.clear();
}
