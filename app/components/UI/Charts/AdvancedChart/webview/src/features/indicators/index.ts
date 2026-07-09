// ADD_INDICATOR / REMOVE_INDICATOR / SET_MA_VISIBILITY handlers.
//
// Ported from chartLogic.js handleAddIndicator (~line 803),
// handleRemoveIndicator (~line 891), handleSetMAVisibility (~line 929).
// Phase 3 keeps the curated indicator set used by Token Details (MACD, RSI,
// BOL, MA200 + MA visibility variants). Consumers needing TV's native study
// picker can re-enable header_widget via the disabledFeatures prop.

import { postToRN, reportErrorToRN } from '../../core/bridge';
import {
  getActiveStudies,
  getMaStudies,
  getWidget,
  isChartReady,
  registerStudy,
  unregisterStudy,
} from '../../core/state';
import type { ChartConfig, StudyId, TVActiveChart } from '../../core/types';
import type {
  AddIndicatorMessage,
  RemoveIndicatorMessage,
  SetMAVisibilityMessage,
} from '../../messages/contract';
import { scheduleLegendRefresh, subscribeStudyDataLoaded } from './legend';
import { scheduleChartWidgetResize } from './resize';
import { applySubPaneHeightRatio, hasActiveSubPaneIndicators } from './subPane';
import {
  createIndicatorStudy,
  isSubPaneIndicator,
  MA_LENGTHS,
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

  const chart = widget.activeChart();
  const preset = resolveStudyPreset(
    name,
    config.indicatorColors,
    payload.inputs,
  );

  createIndicatorStudy(chart, preset)
    .then((studyId) => {
      registerStudy('active', name, studyId);
      if (isSubPaneIndicator(name)) {
        applySubPaneHeightRatio(chart);
      }
      subscribeStudyDataLoaded(chart, studyId);
      scheduleChartWidgetResize();
      notifyIndicatorAdded(name, studyId);
    })
    .catch((error) => {
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
  if (!getActiveStudies().has(name)) return;

  const studyId = unregisterStudy(name);
  if (!studyId) return;

  try {
    const chart = widget.activeChart();
    chart.removeEntity(studyId);
    scheduleLegendRefresh();
    postToRN('INDICATOR_REMOVED', { name });
    if (isSubPaneIndicator(name) && hasActiveSubPaneIndicators()) {
      applySubPaneHeightRatio(chart);
    }
  } catch (error) {
    reportErrorToRN(error);
  }
}

export function handleSetMAVisibility(
  payload: SetMAVisibilityMessage['payload'],
  config: ChartConfig,
): void {
  const widget = getWidget();
  if (!widget || !isChartReady()) return;
  if (!payload) return;

  const visible = payload.visible || [];
  const chart = widget.activeChart();

  const visibleNames = new Set<string>();
  for (const visibleName of visible) {
    if (isOwnStringKey(visibleName) && MA_LENGTHS[visibleName] != null) {
      visibleNames.add(visibleName);
    }
  }

  removeMAVariants(chart, visibleNames);
  addMAVariants(chart, visible, config);
}

function removeMAVariants(chart: TVActiveChart, keep: Set<string>): void {
  const toRemove: string[] = [];
  for (const name of getMaStudies().keys()) {
    if (!keep.has(name)) toRemove.push(name);
  }
  if (toRemove.length === 0) return;
  for (const name of toRemove) {
    const studyId = unregisterStudy(name);
    if (!studyId) continue;
    try {
      chart.removeEntity(studyId);
      postToRN('INDICATOR_REMOVED', { name });
    } catch (error) {
      reportErrorToRN(error);
    }
  }
  // Removing TV studies doesn't auto-clear the DOM legend pills. Refresh so
  // the disabled MA's pill disappears alongside the underlying study.
  scheduleLegendRefresh();
}

function addMAVariants(
  chart: TVActiveChart,
  visible: string[],
  config: ChartConfig,
): void {
  const promises: Promise<unknown>[] = [];
  for (const name of visible) {
    if (!isOwnStringKey(name) || MA_LENGTHS[name] == null) continue;
    if (getMaStudies().has(name)) continue;
    const preset = resolveStudyPreset(name, config.indicatorColors);
    promises.push(
      createIndicatorStudy(chart, preset)
        .then((studyId) => {
          registerStudy('ma', name, studyId);
          subscribeStudyDataLoaded(chart, studyId);
          notifyIndicatorAdded(name, studyId);
        })
        .catch((err) => {
          reportErrorToRN(
            new Error(`MA creation failed: ${name} - ${String(err)}`),
          );
        }),
    );
  }
  if (promises.length > 0) {
    Promise.all(promises).then(() => {
      scheduleLegendRefresh();
      scheduleChartWidgetResize();
    });
  }
}
