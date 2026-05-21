/**
 * Time normalization utilities shared across line-end dot, overlays, and datafeed.
 */

import type { OHLCVBar } from './types';

/** Normalize TV/chart timestamps to Unix seconds (library mixes sec/ms in places). */
export function normalizeChartUnixSec(t: unknown): number | null {
  const n = Number(t);
  if (!isFinite(n)) return null;
  return n >= 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}

/** Raw TV timestamp → Unix ms (keeps sub-second precision). */
export function chartRawTimeToUnixMs(rawT: unknown): number | null {
  const n = Number(rawT);
  if (!isFinite(n)) return null;
  return n >= 1e12 ? n : n * 1000;
}

/** Step between last two OHLCV bars in seconds. */
export function getApproxBarDurationSec(ohlcvData: OHLCVBar[]): number {
  if (!ohlcvData || ohlcvData.length < 2) return 300;
  const ms = Math.abs(
    ohlcvData[ohlcvData.length - 1].time - ohlcvData[ohlcvData.length - 2].time,
  );
  return Math.max(60, Math.round(ms / 1000));
}

/** Interpolate close between consecutive bars at a given ms (line chart path). */
export function interpolateCloseAlongLineAtTimeMs(
  data: OHLCVBar[],
  tMs: number,
): number | null {
  if (!data || !data.length || !isFinite(tMs)) return null;

  const first = data[0];
  const last = data[data.length - 1];

  if (tMs <= first.time) {
    const c0 = Number(first.close);
    return isFinite(c0) ? c0 : null;
  }
  if (tMs >= last.time) {
    const cL = Number(last.close);
    return isFinite(cL) ? cL : null;
  }
  for (let i = 0; i < data.length - 1; i++) {
    const t0 = data[i].time;
    const t1 = data[i + 1].time;
    if (tMs >= t0 && tMs <= t1) {
      const a = Number(data[i].close);
      const b = Number(data[i + 1].close);
      if (!isFinite(a) || !isFinite(b)) return null;
      if (t1 === t0) return a;
      return a + ((b - a) * (tMs - t0)) / (t1 - t0);
    }
  }
  return null;
}

/**
 * Parse bar time from TV `data().last()` / `bars()[n]` (seconds or ms; same shape as OHLCV tuple).
 */
export function parseTimeFromTvDataLast(last: unknown): number | null {
  if (last === null || last === undefined) return null;

  if (Array.isArray(last)) {
    const t0 = Number(last[0]);
    return isFinite(t0) ? t0 : null;
  }
  if (typeof last === 'object') {
    const obj = last as Record<string, unknown>;
    if (obj.time !== undefined && obj.time !== null) {
      const nt = Number(obj.time);
      if (isFinite(nt)) return nt;
    }
    const v = obj.value;
    if (Array.isArray(v) && v.length > 0) {
      const tv = Number(v[0]);
      if (isFinite(tv)) return tv;
    }
  }
  return null;
}

/**
 * Close from TV last bar object / OHLCV tuple (index 4).
 */
export function parseCloseFromTvDataLast(last: unknown): number | null {
  if (last === null || last === undefined) return null;

  if (Array.isArray(last)) {
    if (last.length > 4) {
      const c = Number(last[4]);
      if (isFinite(c)) return c;
    }
    return null;
  }
  if (typeof last === 'object') {
    const obj = last as Record<string, unknown>;
    if (obj.close !== undefined && obj.close !== null) {
      const nc = Number(obj.close);
      if (isFinite(nc)) return nc;
    }
    const v = obj.value;
    if (Array.isArray(v) && v.length > 4) {
      const nvc = Number(v[4]);
      if (isFinite(nvc)) return nvc;
    }
    if (typeof v === 'number' && isFinite(v)) return v;
  }
  return null;
}
