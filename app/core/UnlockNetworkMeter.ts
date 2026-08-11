/**
 * In-app unlock HTTP call meter (fetch + XHR).
 *
 * Counts real-network requests during an unlock → homepage window.
 * No Mockttp / canned mocks — intended for local Developer Options dumps and
 * real-network performance E2E reading the same summary.
 *
 * Records method/host/url/ts only (no bodies or headers).
 * Inactive window = no-op.
 */

import { setMeasurement } from '@sentry/react-native';

export const UNLOCK_NETWORK_METER_SUMMARY_TEST_ID =
  'unlock-network-meter-summary';

/** Quiet period after homepage ready with no new HTTP before ending the window. */
export const UNLOCK_NETWORK_METER_QUIET_MS = 2500;

/** Hard ceiling for an unlock measurement window. */
export const UNLOCK_NETWORK_METER_MAX_WINDOW_MS = 45_000;

export const UNLOCK_HTTP_REQUEST_COUNT_MEASUREMENT =
  'unlock_http_request_count';

export interface UnlockNetworkRequest {
  method: string;
  host: string;
  url: string;
  ts: number;
}

export type UnlockNetworkEndReason = 'quiescence' | 'max_window' | 'manual';

export interface UnlockNetworkSummary {
  total: number;
  byHost: Record<string, number>;
  requests: UnlockNetworkRequest[];
  startedAt: number;
  endedAt: number;
  endReason: UnlockNetworkEndReason;
}

type UnlockMeterXhr = XMLHttpRequest & {
  __unlockMeterMethod?: string;
  __unlockMeterUrl?: string;
};

let active = false;
let homepageReady = false;
let requests: UnlockNetworkRequest[] = [];
let startedAt = 0;
let lastRequestAt = 0;
let lastSummary: UnlockNetworkSummary | null = null;
let quietTimer: ReturnType<typeof setTimeout> | null = null;
let maxTimer: ReturnType<typeof setTimeout> | null = null;
let transportInstalled = false;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function clearTimers(): void {
  if (quietTimer) {
    clearTimeout(quietTimer);
    quietTimer = null;
  }
  if (maxTimer) {
    clearTimeout(maxTimer);
    maxTimer = null;
  }
}

function parseHost(url: string): string {
  try {
    return new URL(url).host || 'unknown';
  } catch {
    return 'unknown';
  }
}

function getUrlFromFetchInput(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return (input as Request).url ?? '';
}

function getMethodFromFetchInit(
  input: RequestInfo | URL,
  init?: RequestInit,
): string {
  if (init?.method) {
    return init.method.toUpperCase();
  }
  if (typeof input === 'object' && input !== null && 'method' in input) {
    const method = (input as Request).method;
    if (method) {
      return method.toUpperCase();
    }
  }
  return 'GET';
}

function buildSummary(endReason: UnlockNetworkEndReason): UnlockNetworkSummary {
  const byHost: Record<string, number> = {};
  for (const request of requests) {
    byHost[request.host] = (byHost[request.host] ?? 0) + 1;
  }
  return {
    total: requests.length,
    byHost,
    requests: [...requests],
    startedAt,
    endedAt: Date.now(),
    endReason,
  };
}

function scheduleQuietCheck(): void {
  if (quietTimer) {
    clearTimeout(quietTimer);
    quietTimer = null;
  }
  if (!active || !homepageReady) {
    return;
  }
  quietTimer = setTimeout(() => {
    if (!active || !homepageReady) {
      return;
    }
    if (Date.now() - lastRequestAt >= UNLOCK_NETWORK_METER_QUIET_MS) {
      endUnlockWindow('quiescence');
      return;
    }
    scheduleQuietCheck();
  }, UNLOCK_NETWORK_METER_QUIET_MS);
}

/**
 * Record one outbound HTTP request while the unlock window is active.
 */
export function recordUnlockNetworkRequest(method: string, url: string): void {
  if (!active) {
    return;
  }
  const ts = Date.now();
  lastRequestAt = ts;
  requests.push({
    method: method.toUpperCase() || 'GET',
    host: parseHost(url),
    url,
    ts,
  });
  if (homepageReady) {
    scheduleQuietCheck();
  }
}

/**
 * Start measuring unlock → homepage HTTP traffic.
 * Resets any in-flight window without publishing a summary.
 */
export function startUnlockWindow(): void {
  installUnlockNetworkMeterTransport();
  clearTimers();
  active = true;
  homepageReady = false;
  requests = [];
  startedAt = Date.now();
  lastRequestAt = startedAt;
  maxTimer = setTimeout(() => {
    endUnlockWindow('max_window');
  }, UNLOCK_NETWORK_METER_MAX_WINDOW_MS);
  notifyListeners();
}

/**
 * Homepage chrome is visible; begin quiescence countdown once requests quiet.
 */
export function signalHomepageReadyForUnlockMeter(): void {
  if (!active) {
    return;
  }
  homepageReady = true;
  scheduleQuietCheck();
  notifyListeners();
}

/**
 * End the unlock window and publish the last summary + Sentry measurement.
 */
export function endUnlockWindow(
  endReason: UnlockNetworkEndReason = 'manual',
): UnlockNetworkSummary | null {
  if (!active) {
    return lastSummary;
  }
  clearTimers();
  active = false;
  homepageReady = false;
  lastSummary = buildSummary(endReason);
  setMeasurement(
    UNLOCK_HTTP_REQUEST_COUNT_MEASUREMENT,
    lastSummary.total,
    'none',
  );
  notifyListeners();
  return lastSummary;
}

export function getLastUnlockSummary(): UnlockNetworkSummary | null {
  return lastSummary;
}

export function isUnlockWindowActive(): boolean {
  return active;
}

export function getUnlockWindowLiveCount(): number {
  return active ? requests.length : (lastSummary?.total ?? 0);
}

/**
 * Subscribe to meter state changes (window start/end, homepage ready).
 * Returns an unsubscribe function.
 */
export function subscribeUnlockNetworkMeter(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Wrap `global.fetch` and `XMLHttpRequest` so unlock-window traffic is counted.
 * Idempotent. Safe when the window is inactive (record is a no-op).
 */
export function installUnlockNetworkMeterTransport(): void {
  if (transportInstalled) {
    return;
  }
  transportInstalled = true;

  const originalFetch = global.fetch.bind(global);
  global.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    recordUnlockNetworkRequest(
      getMethodFromFetchInit(input, init),
      getUrlFromFetchInput(input),
    );
    return originalFetch(input, init);
  };

  const xhrProto = global.XMLHttpRequest?.prototype;
  if (!xhrProto) {
    return;
  }

  const originalOpen = xhrProto.open;
  xhrProto.open = function unlockMeterOpen(
    this: UnlockMeterXhr,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    this.__unlockMeterMethod = String(method);
    this.__unlockMeterUrl = String(url);
    return originalOpen.apply(this, [
      method,
      url,
      ...rest,
    ] as unknown as Parameters<typeof originalOpen>);
  };

  const originalSend = xhrProto.send;
  xhrProto.send = function unlockMeterSend(
    this: UnlockMeterXhr,
    body?: Document | XMLHttpRequestBodyInit | null,
  ) {
    if (this.__unlockMeterUrl) {
      recordUnlockNetworkRequest(
        this.__unlockMeterMethod ?? 'GET',
        this.__unlockMeterUrl,
      );
    }
    return originalSend.call(this, body);
  };
}

/**
 * Test-only reset. Do not call from product code.
 */
export function __resetUnlockNetworkMeterForTests(): void {
  clearTimers();
  active = false;
  homepageReady = false;
  requests = [];
  startedAt = 0;
  lastRequestAt = 0;
  lastSummary = null;
  listeners.clear();
}
