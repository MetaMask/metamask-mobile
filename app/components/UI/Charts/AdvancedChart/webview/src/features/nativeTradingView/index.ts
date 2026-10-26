// Native TradingView UI bridge (TAT-4093 spike). Opt-in through
// CONFIG.features.nativeTradingView.
//
// When the host re-enables TradingView's own header, Indicators dialog and
// drawing toolbar, RN cannot see what the user does inside them. This module
// forwards the library's study / drawing lifecycle events, and the opening and
// closing of its dialogs, as NATIVE_TV_EVENT. It only observes: nothing here
// places or edits orders.

import { postToRN, reportErrorToRN } from '../../core/bridge';
import type {
  TVActiveChart,
  TVChartingLibraryWidget,
  TVEntityInfo,
} from '../../core/types';
import { eachChartDocument } from '../../widget/tvDomHelpers';

// TradingView renders its dialogs as `<div role="dialog" data-name="…">`,
// e.g. `indicators-dialog`, in the host document or its same-origin iframe.
const DIALOG_SELECTOR = '[role="dialog"][data-name]';

function findEntityName(
  entities: TVEntityInfo[] | undefined,
  id: string,
): string | undefined {
  return entities?.find((entity) => entity.id === id)?.name;
}

function findOpenDialogName(): string | null {
  let name: string | null = null;
  eachChartDocument((doc) => {
    name ??=
      doc.querySelector(DIALOG_SELECTOR)?.getAttribute('data-name') ?? null;
  });
  return name;
}

/** Posts dialog `open` / `close` events whenever the open TradingView dialog changes. */
function watchDialogs(): void {
  let openDialog: string | null = null;
  const sync = (): void => {
    const current = findOpenDialogName();
    if (current === openDialog) return;
    if (openDialog) {
      postToRN('NATIVE_TV_EVENT', {
        source: 'dialog',
        type: 'close',
        name: openDialog,
      });
    }
    if (current) {
      postToRN('NATIVE_TV_EVENT', {
        source: 'dialog',
        type: 'open',
        name: current,
      });
    }
    openDialog = current;
  };
  eachChartDocument((doc) => {
    if (doc.body) {
      new MutationObserver(sync).observe(doc.body, {
        childList: true,
        subtree: true,
      });
    }
  });
}

/**
 * Subscribes to TradingView's native study / drawing events and watches its
 * dialogs. Call once from onChartReady.
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
    watchDialogs();
  } catch (error) {
    reportErrorToRN(error);
  }
}
