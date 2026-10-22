import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';

/**
 * Safety-net close for `PerpsTradeSheetInteractive`. The span is meant to end
 * on the sheet's first layout (or unmount-before-layout). If that component
 * never mounts after `depositWithOrder` resolves, this timeout still closes it.
 */
export const PERPS_TRADE_SHEET_INTERACTIVE_TIMEOUT_MS = 30_000;

let pendingTimeout: ReturnType<typeof setTimeout> | undefined;

function clearPendingTimeout(): void {
  if (pendingTimeout === undefined) {
    return;
  }
  clearTimeout(pendingTimeout);
  pendingTimeout = undefined;
}

export function startPerpsTradeSheetInteractiveTrace(source: string): void {
  clearPendingTimeout();
  trace({
    name: TraceName.PerpsTradeSheetInteractive,
    op: TraceOperation.PerpsOperation,
    data: { source },
  });

  pendingTimeout = setTimeout(() => {
    pendingTimeout = undefined;
    failPerpsTradeSheetInteractiveTrace('sheet_not_mounted');
  }, PERPS_TRADE_SHEET_INTERACTIVE_TIMEOUT_MS);
}

export function completePerpsTradeSheetInteractiveTrace(): void {
  clearPendingTimeout();
  endTrace({
    name: TraceName.PerpsTradeSheetInteractive,
    data: { success: true },
  });
}

export function failPerpsTradeSheetInteractiveTrace(reason: string): void {
  clearPendingTimeout();
  endTrace({
    name: TraceName.PerpsTradeSheetInteractive,
    data: { success: false, reason },
  });
}
