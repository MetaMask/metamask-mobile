// RN-backed pagination: sends FETCH_OLDER_BARS_REQUEST to React Native and
// resolves the pending getBars callback when FETCH_OLDER_BARS_RESPONSE arrives.
//
// Used by Perps whose candle data comes from PerpsController (only accessible
// from RN, not from the WebView). Replaces the Price API direct-fetch path.
//
// Ported from chartLogic.js: pendingOlderBarsCallbacks, olderBarsRequestSeq,
// handleFetchOlderBarsResponse (~line 5149), resolveAllPendingOlderBarsNoData
// (~line 5131), and the RN-backed branch of getBars (~line 5412).

import { postToRN, reportErrorToRN } from '../core/bridge';
import {
  getCurrentSymbol,
  getOhlcvData,
  getOhlcvGeneration,
  prependOhlcvBars,
} from '../core/state';
import { registerHandler } from '../messages/handler';
import type { OHLCVBar, GetBarsCallback, TVResolution } from '../core/types';
import type { FetchOlderBarsResponsePayload } from '../messages/contract';

interface PendingCallback {
  onResult: GetBarsCallback;
  oldestAtDefer: number;
  gen: number;
}

let pendingCallbacks = new Map<string, PendingCallback>();
let requestSeq = 0;

export interface RequestOlderBarsParams {
  resolution: TVResolution;
  fromSec: number;
  toSec: number;
  countBack?: number;
  onResult: GetBarsCallback;
}

export function requestOlderBarsFromRN(params: RequestOlderBarsParams): void {
  const gen = getOhlcvGeneration();
  const all = getOhlcvData();
  const oldestAtDefer = all.length > 0 ? all[0].time : 0;

  requestSeq += 1;
  const requestId = 'obr-' + gen + '-' + requestSeq;

  pendingCallbacks.set(requestId, {
    onResult: params.onResult,
    oldestAtDefer,
    gen,
  });

  postToRN('FETCH_OLDER_BARS_REQUEST', {
    requestId,
    seriesGeneration: gen,
    symbol: getCurrentSymbol(),
    resolution: params.resolution,
    fromSec: params.fromSec,
    toSec: params.toSec,
    ...(params.countBack == null ? {} : { countBack: params.countBack }),
    oldestLoadedTimeMs: oldestAtDefer,
  });
}

function resolvePendingNoData(pending: PendingCallback): void {
  try {
    pending.onResult([], { noData: true });
  } catch (error) {
    reportErrorToRN(error);
  }
}

export function resolveAllPendingOlderBarsNoData(): void {
  pendingCallbacks.forEach((pending) => {
    resolvePendingNoData(pending);
  });
  pendingCallbacks = new Map();
}

export function handleFetchOlderBarsResponse(
  payload: FetchOlderBarsResponsePayload,
): void {
  if (!payload || typeof payload.requestId !== 'string') return;

  const pending = pendingCallbacks.get(payload.requestId);
  if (!pending) return;
  pendingCallbacks.delete(payload.requestId);

  if (
    payload.seriesGeneration !== pending.gen ||
    payload.seriesGeneration !== getOhlcvGeneration()
  ) {
    resolvePendingNoData(pending);
    return;
  }

  if (
    payload.error ||
    payload.noData ||
    !Array.isArray(payload.bars) ||
    payload.bars.length === 0
  ) {
    pending.onResult([], { noData: true });
    return;
  }

  const existingTimes = new Set<number>();
  const allData = getOhlcvData();
  for (const bar of allData) {
    existingTimes.add(bar.time);
  }

  const olderBars: OHLCVBar[] = [];
  for (const bar of payload.bars) {
    if (bar.time < pending.oldestAtDefer && !existingTimes.has(bar.time)) {
      existingTimes.add(bar.time);
      olderBars.push(bar);
    }
  }

  if (olderBars.length > 0) {
    prependOhlcvBars(olderBars);
  }

  pending.onResult(olderBars, { noData: olderBars.length === 0 });
}

export function registerRnBackedPaginationHandler(): void {
  registerHandler('FETCH_OLDER_BARS_RESPONSE', (payload) => {
    handleFetchOlderBarsResponse(payload);
  });
}

export function __resetRnBackedPaginationForTests(): void {
  pendingCallbacks = new Map();
  requestSeq = 0;
}
