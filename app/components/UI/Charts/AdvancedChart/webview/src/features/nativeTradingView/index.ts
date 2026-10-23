// Native TradingView UI bridge (TAT-4093 spike). Opt-in through
// CONFIG.features.nativeTradingView.
//
// When the host re-enables TradingView's own header, Indicators dialog and
// drawing toolbar, RN cannot see what the user does inside them. This module
// forwards the library's study / drawing lifecycle events as NATIVE_TV_EVENT.
// It only observes: nothing here places or edits orders.

import { postToRN, reportErrorToRN } from '../../core/bridge';
import type {
  TVActiveChart,
  TVChartingLibraryWidget,
  TVEntityInfo,
} from '../../core/types';

function findEntityName(
  entities: TVEntityInfo[] | undefined,
  id: string,
): string | undefined {
  return entities?.find((entity) => entity.id === id)?.name;
}

/**
 * Subscribes to TradingView's native study / drawing events. Call once from
 * onChartReady.
 */
export function attachNativeTradingViewBridge(
  widget: TVChartingLibraryWidget,
  chart: TVActiveChart,
): void {
  try {
    widget.subscribe('study_event', (id, type) => {
      postToRN('NATIVE_TV_EVENT', {
        source: 'study',
        type,
        id,
        name: findEntityName(chart.getAllStudies?.(), id),
      });
    });
    widget.subscribe('drawing_event', (id, type) => {
      postToRN('NATIVE_TV_EVENT', {
        source: 'drawing',
        type,
        id,
        name: findEntityName(chart.getAllShapes?.(), id),
      });
    });
  } catch (error) {
    reportErrorToRN(error);
  }
}
