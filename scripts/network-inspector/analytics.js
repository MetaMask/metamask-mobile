/* eslint-disable import-x/no-commonjs */
/* global globalThis */
/**
 * Pure analytics over network records. Runs in Node (tests) and in the dashboard
 * (served at /__network-inspector/analytics.js, exposed as `NetAnalytics`).
 * Everything here answers a question a human asks when deciding what to fix:
 * what fails, what is redundant, what is slow, who calls the most.
 */
(function attach(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }
  root.NetAnalytics = api;
})(globalThis, () => {
  'use strict';

  const DUPLICATE_WINDOW_MS = 3000;
  const MIN_POLL_REQUESTS = 5;
  const MIN_POLL_INTERVAL_MS = 400;
  const MAX_POLL_JITTER = 0.3;
  const SLOW_P95_MS = 1500;
  const VERY_SLOW_P95_MS = 4000;
  const HEAVY_RESPONSE_BYTES = 200 * 1024;
  const PEAK_CONCURRENCY_WARN = 12;
  const BUCKET_CANDIDATES_MS = [
    1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000, 300000, 600000,
  ];
  const MAX_BUCKETS = 60;
  const SEVERITY_RANK = { critical: 0, serious: 1, warning: 2, info: 3 };

  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // ---- record predicates -------------------------------------------------

  const isHttp = (record) => record.kind !== 'ws';
  const isFailed = (record) => Boolean(record.error) || record.status >= 400;
  const isPending = (record) =>
    isHttp(record) && !record.done && !record.error;
  // A session is one app launch on one device: the unit every ratio is computed in.
  const sessionOf = (record) => record.session || 'unknown';
  const duplicateKey = (record) =>
    `${record.method} ${record.url} ${record.reqBody || ''}`;

  function latencyOf(record) {
    if (typeof record.durationMs === 'number') return record.durationMs;
    return record.ttfbMs;
  }

  function endTime(record, now) {
    const latency = latencyOf(record);
    if (typeof latency === 'number') return record.startedAt + latency;
    if (isPending(record)) return now;
    return record.startedAt;
  }

  // ---- formatting --------------------------------------------------------

  function formatMs(ms) {
    if (typeof ms !== 'number' || Number.isNaN(ms)) return '–';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`;
    return `${(ms / 60000).toFixed(1)} min`;
  }

  function formatBytes(bytes) {
    if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '–';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function formatPercent(fraction) {
    if (typeof fraction !== 'number' || Number.isNaN(fraction)) return '–';
    const value = fraction * 100;
    if (value > 0 && value < 1) return '<1%';
    return `${Math.round(value)}%`;
  }

  function formatCount(count) {
    if (count < 1000) return String(count);
    if (count < 10000) return `${(count / 1000).toFixed(1)}K`;
    return `${Math.round(count / 1000)}K`;
  }

  // ---- url, endpoint and caller naming -----------------------------------

  function parseUrl(url) {
    try {
      const parsed = new URL(url);
      return { host: parsed.host, path: parsed.pathname };
    } catch {
      return { host: '', path: String(url ?? '') };
    }
  }

  function normalizeSegment(segment) {
    if (UUID_PATTERN.test(segment)) return ':id';
    if (/^0x[0-9a-f]{8,}$/i.test(segment)) return ':address';
    if (/^[0-9a-f]{16,}$/i.test(segment)) return ':id';
    if (/^\d{4,}$/.test(segment)) return ':n';
    if (segment.length >= 24 && /\d/.test(segment)) return ':id';
    return segment;
  }

  /** Collapse ids, hashes and addresses so `/profiles/<uuid>` groups as one endpoint. */
  function normalizePath(path) {
    return path.split('/').map(normalizeSegment).join('/') || '/';
  }

  function rpcMethods(record) {
    if (!record.reqBody) return [];
    let body;
    try {
      body = JSON.parse(record.reqBody);
    } catch {
      return [];
    }
    const items = Array.isArray(body) ? body : [body];
    const methods = items
      .map((item) => (item && typeof item.method === 'string' ? item.method : ''))
      .filter(Boolean);
    return [...new Set(methods)];
  }

  function rpcLabel(record) {
    const methods = rpcMethods(record);
    if (methods.length === 0) return '';
    if (methods.length === 1) return methods[0];
    return `batch(${methods.length})`;
  }

  function endpointBase(record) {
    const { host, path } = parseUrl(record.url);
    return `${record.method} ${host}${normalizePath(path)}`;
  }

  function endpointLabel(record) {
    const base = endpointBase(record);
    const rpc = rpcLabel(record);
    if (!rpc) return base;
    return `${base} · ${rpc}`;
  }

  function hostOf(record) {
    return parseUrl(record.url).host;
  }

  function callerInfo(record) {
    const caller = record.caller;
    if (!caller || caller.origin === 'unresolved') {
      return { key: '(unknown)', origin: 'unknown' };
    }
    const relative = caller.relative || '';
    const marker = 'node_modules/';
    const markerIndex = relative.lastIndexOf(marker);
    if (markerIndex >= 0) {
      const parts = relative.slice(markerIndex + marker.length).split('/');
      const name = parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
      return { key: name, origin: 'lib' };
    }
    return { key: relative || '(unknown)', origin: caller.origin || 'app' };
  }

  // ---- statistics --------------------------------------------------------

  function percentile(sortedValues, p) {
    if (sortedValues.length === 0) return undefined;
    const rank = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.min(Math.max(rank, 0), sortedValues.length - 1)];
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return percentile(sorted, 50);
  }

  function sortedLatencies(records) {
    return records
      .map(latencyOf)
      .filter((value) => typeof value === 'number')
      .sort((a, b) => a - b);
  }

  function sweepPeak(records, now) {
    const events = [];
    for (const record of records) {
      if (!isHttp(record) || typeof record.startedAt !== 'number') continue;
      events.push([record.startedAt, 1]);
      events.push([endTime(record, now), -1]);
    }
    // At equal timestamps a start counts before an end: touching calls overlap.
    events.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    let current = 0;
    let peak = 0;
    let at = 0;
    for (const [time, delta] of events) {
      current += delta;
      if (current > peak) {
        peak = current;
        at = time;
      }
    }
    return { peak, at };
  }

  /** The busiest single device: requests on two phones never overlap each other. */
  function peakConcurrency(records, now) {
    const bySession = new Map();
    for (const record of records) {
      const id = sessionOf(record);
      if (!bySession.has(id)) bySession.set(id, []);
      bySession.get(id).push(record);
    }
    let best = { peak: 0, at: 0, session: undefined };
    for (const [session, list] of bySession) {
      const result = sweepPeak(list, now);
      if (result.peak > best.peak) best = { ...result, session };
    }
    return best;
  }

  // ---- devices -----------------------------------------------------------

  const PLATFORM_NAMES = { ios: 'iOS', android: 'Android' };

  /** One entry per device session, newest first, with a label a human can tell apart. */
  function sessionsList(records) {
    const groups = new Map();
    for (const record of records) {
      const id = sessionOf(record);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(record);
    }
    const list = [];
    for (const [id, items] of groups) {
      const stamps = items.map((item) => item.startedAt).filter(Number.isFinite);
      const first = stamps.length ? Math.min(...stamps) : 0;
      const sample = items.find((item) => item.platform) || items[0];
      const platform = PLATFORM_NAMES[sample.platform] || sample.platform || 'Device';
      const os = sample.osVersion ? ` ${sample.osVersion}` : '';
      list.push({
        id,
        platform: sample.platform,
        count: items.length,
        failed: items.filter(isFailed).length,
        first,
        last: Math.max(0, ...stamps),
        label: `${platform}${os} · ${new Date(first).toTimeString().slice(0, 8)}`,
      });
    }
    return list.sort((a, b) => b.last - a.last);
  }

  // ---- grouping ----------------------------------------------------------

  /** One row per key with the numbers a human compares: volume, failures, latency, cost. */
  function groupRows(records, keyOf) {
    const groups = new Map();
    for (const record of records) {
      const key = keyOf(record);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }
    const total = records.length || 1;
    const rows = [];
    for (const [key, list] of groups) {
      const latencies = sortedLatencies(list);
      const failed = list.filter(isFailed).length;
      const statusCodes = {};
      for (const record of list) {
        if (!isFailed(record)) continue;
        const code = record.error ? 'error' : String(record.status);
        statusCodes[code] = (statusCodes[code] || 0) + 1;
      }
      rows.push({
        key,
        count: list.length,
        failed,
        failRate: failed / list.length,
        pending: list.filter(isPending).length,
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        max: latencies[latencies.length - 1],
        timeMs: latencies.reduce((sum, value) => sum + value, 0),
        bytes: list.reduce((sum, record) => sum + (record.resSize || 0), 0),
        share: list.length / total,
        statusCodes,
        records: list,
      });
    }
    return rows;
  }

  // ---- redundancy and polling -------------------------------------------

  /** Same call repeated within a short window: the clearest wasted work. */
  function duplicates(records, now, windowMs = DUPLICATE_WINDOW_MS) {
    const groups = new Map();
    for (const record of records) {
      if (!isHttp(record) || typeof record.startedAt !== 'number') continue;
      // Per device: two phones making the same call is not redundant work.
      const key = `${sessionOf(record)}|${duplicateKey(record)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }
    const result = [];
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      list.sort((a, b) => a.startedAt - b.startedAt);
      let wasted = 0;
      let concurrent = 0;
      let wastedMs = 0;
      let wastedBytes = 0;
      for (let index = 1; index < list.length; index += 1) {
        const previous = list[index - 1];
        const current = list[index];
        if (current.startedAt - previous.startedAt > windowMs) continue;
        wasted += 1;
        if (current.startedAt < endTime(previous, now)) concurrent += 1;
        wastedMs += latencyOf(current) || 0;
        wastedBytes += current.resSize || 0;
      }
      if (wasted === 0) continue;
      result.push({
        key: duplicateKey(list[0]),
        session: sessionOf(list[0]),
        label: endpointLabel(list[0]),
        count: list.length,
        wasted,
        concurrent,
        wastedMs,
        wastedBytes,
        records: list,
      });
    }
    return result.sort((a, b) => b.wasted - a.wasted || b.wastedMs - a.wastedMs);
  }

  /** An endpoint hit at a steady rhythm is a poll; its interval is the number that matters. */
  function detectPolling(records) {
    const groups = new Map();
    for (const record of records) {
      if (!isHttp(record) || typeof record.startedAt !== 'number') continue;
      const key = `${sessionOf(record)}|${endpointLabel(record)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }
    const result = [];
    for (const list of groups.values()) {
      if (list.length < MIN_POLL_REQUESTS) continue;
      list.sort((a, b) => a.startedAt - b.startedAt);
      const intervals = [];
      for (let index = 1; index < list.length; index += 1) {
        intervals.push(list[index].startedAt - list[index - 1].startedAt);
      }
      const typical = median(intervals);
      if (!typical || typical < MIN_POLL_INTERVAL_MS) continue;
      const deviation = median(intervals.map((value) => Math.abs(value - typical)));
      if (deviation / typical > MAX_POLL_JITTER) continue;
      result.push({
        key: endpointLabel(list[0]),
        session: sessionOf(list[0]),
        count: list.length,
        intervalMs: typical,
        records: list,
      });
    }
    return result.sort((a, b) => b.count - a.count);
  }

  // ---- timeline ----------------------------------------------------------

  function niceBucketMs(spanMs) {
    for (const candidate of BUCKET_CANDIDATES_MS) {
      if (spanMs / candidate <= MAX_BUCKETS) return candidate;
    }
    return BUCKET_CANDIDATES_MS[BUCKET_CANDIDATES_MS.length - 1];
  }

  function timeline(records, now) {
    const http = records.filter(
      (record) => isHttp(record) && typeof record.startedAt === 'number',
    );
    if (http.length === 0) return { bucketMs: 1000, buckets: [] };
    const first = Math.min(...http.map((record) => record.startedAt));
    const last = Math.max(now, ...http.map((record) => record.startedAt));
    const bucketMs = niceBucketMs(last - first);
    const start = Math.floor(first / bucketMs) * bucketMs;
    const count = Math.floor((last - start) / bucketMs) + 1;
    const buckets = Array.from({ length: count }, (_, index) => ({
      t: start + index * bucketMs,
      count: 0,
      failed: 0,
      records: [],
    }));
    for (const record of http) {
      const bucket = buckets[Math.floor((record.startedAt - start) / bucketMs)];
      bucket.count += 1;
      bucket.records.push(record);
      if (isFailed(record)) bucket.failed += 1;
    }
    for (const bucket of buckets) {
      const latencies = sortedLatencies(bucket.records);
      bucket.p50 = percentile(latencies, 50);
      bucket.p95 = percentile(latencies, 95);
    }
    return { bucketMs, buckets };
  }

  // ---- summary -----------------------------------------------------------

  function summarize(records, now) {
    const http = records.filter(isHttp);
    const latencies = sortedLatencies(http);
    const failed = http.filter(isFailed).length;
    const starts = http.map((record) => record.startedAt).filter(Number.isFinite);
    const spanMs = starts.length ? Math.max(now, ...starts) - Math.min(...starts) : 0;
    const redundant = duplicates(http, now).reduce((sum, item) => sum + item.wasted, 0);
    const bytes = http.reduce((sum, record) => sum + (record.resSize || 0), 0);
    return {
      total: http.length,
      sockets: records.length - http.length,
      failed,
      failRate: http.length ? failed / http.length : 0,
      inFlight: http.filter(isPending).length,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      max: latencies[latencies.length - 1],
      bytes,
      avgBytes: http.length ? bytes / http.length : 0,
      perMinute: http.length / (Math.max(spanMs, 10000) / 60000),
      peak: peakConcurrency(http, now),
      redundant,
      redundantRate: http.length ? redundant / http.length : 0,
      endpoints: new Set(http.map(endpointBase)).size,
      hosts: new Set(http.map(hostOf)).size,
      spanMs,
    };
  }

  // ---- insights ----------------------------------------------------------

  function dominantStatus(statusCodes) {
    const entries = Object.entries(statusCodes).sort((a, b) => b[1] - a[1]);
    return entries.length ? entries[0][0] : '';
  }

  function failureAdvice(code) {
    if (code === '401' || code === '403') {
      return 'Looks like missing or invalid credentials (API key, auth token, session). Check the keys configured for this environment.';
    }
    if (code === '404') {
      return 'Resource not found: the URL, id or API version may be wrong.';
    }
    if (code === '429') {
      return 'Rate limited: add backoff or reduce how often this is called.';
    }
    if (code === 'error') {
      return 'Network-level failure (offline, DNS, TLS or aborted). Check connectivity and timeouts.';
    }
    return 'Server-side failure: check the service, and retry with backoff.';
  }

  function failingInsights(records, coveredByAuth) {
    const rows = groupRows(records.filter(isHttp), endpointLabel)
      .filter((row) => row.failed >= 3 || (row.failed >= 2 && row.failRate >= 0.5))
      .sort((a, b) => b.failed - a.failed);
    return rows.map((row) => {
      const code = dominantStatus(row.statusCodes);
      const severe = row.failRate >= 0.8 && row.failed >= 5;
      const codeLabel = code === 'error' ? 'network errors' : `HTTP ${code}`;
      const isAuth = code === '401' || code === '403';
      const advice =
        coveredByAuth && isAuth
          ? 'Part of the credentials issue above.'
          : failureAdvice(code);
      return {
        id: `fail:${row.key}`,
        severity: severe ? 'critical' : 'serious',
        icon: 'alert',
        title: row.key,
        metric: `${row.failed} of ${row.count} failed`,
        kind: 'Failing endpoint',
        detail: `${formatPercent(row.failRate)} failure rate, mostly ${codeLabel}.`,
        advice,
        filter: { endpoint: row.key, status: 'failed' },
        affected: row.failed,
      };
    });
  }

  /** Many endpoints rejecting credentials at once is one root cause, not many problems. */
  function authFailureInsight(records) {
    const rows = groupRows(records.filter(isHttp), endpointLabel).filter((row) => {
      const code = dominantStatus(row.statusCodes);
      return row.failed >= 2 && (code === '401' || code === '403');
    });
    if (rows.length < 2) return [];
    const failed = rows.reduce((sum, row) => sum + row.failed, 0);
    const hosts = [
      ...new Set(rows.flatMap((row) => row.records.filter(isFailed).map(hostOf))),
    ];
    const shown = hosts.slice(0, 4).join(', ');
    const more = hosts.length > 4 ? ` and ${hosts.length - 4} more` : '';
    return [
      {
        id: 'auth',
        severity: 'critical',
        icon: 'alert',
        title: `Credentials rejected on ${rows.length} endpoints`,
        metric: `${failed} requests failed with 401/403`,
        kind: 'Root cause',
        detail: `Across ${hosts.length} host${hosts.length === 1 ? '' : 's'}: ${shown}${more}.`,
        advice: failureAdvice('401'),
        filter: { codes: ['401', '403'] },
        affected: failed,
      },
    ];
  }

  function duplicateInsights(records, now) {
    return duplicates(records, now)
      .filter((item) => item.wasted >= 2)
      .map((item) => ({
        id: `dup:${item.session}:${item.key}`,
        session: item.session,
        severity: item.wasted >= 5 ? 'serious' : 'warning',
        icon: 'repeat',
        title: item.label,
        metric: `${item.wasted} redundant of ${item.count}`,
        kind: 'Repeated request',
        detail: `Identical call repeated within ${DUPLICATE_WINDOW_MS / 1000}s${
          item.concurrent ? `, ${item.concurrent} of them while the previous one was still in flight` : ''
        }. Wasted ${formatMs(item.wastedMs)} of request time and ${formatBytes(item.wastedBytes)}.`,
        advice: 'Share one in-flight request, cache the result, or raise the stale time of the query that triggers it.',
        filter: { dupKey: item.key },
        affected: item.wasted,
      }));
  }

  function pollingInsights(records) {
    return detectPolling(records).map((item) => ({
      id: `poll:${item.session}:${item.key}`,
      session: item.session,
      severity: 'info',
      icon: 'refresh',
      title: item.key,
      metric: `every ~${formatMs(item.intervalMs)}`,
      kind: 'Polling',
      detail: `${item.count} calls at a steady rhythm.`,
      advice: 'Confirm it needs to be this frequent, back off when idle, and pause it while the app is in the background.',
      filter: { endpoint: item.key },
      affected: item.count,
    }));
  }

  function slowInsights(records) {
    return groupRows(records.filter(isHttp), endpointLabel)
      .filter((row) => row.count >= 2 && row.p95 >= SLOW_P95_MS)
      .sort((a, b) => b.p95 - a.p95)
      .map((row) => ({
        id: `slow:${row.key}`,
        severity: row.p95 >= VERY_SLOW_P95_MS ? 'serious' : 'warning',
        icon: 'clock',
        title: row.key,
        metric: `p95 ${formatMs(row.p95)}`,
        kind: 'Slow endpoint',
        detail: `Median ${formatMs(row.p50)}, worst ${formatMs(row.max)} over ${row.count} calls.`,
        advice: 'If it blocks a screen, load it earlier or in parallel, show a skeleton, or ask the backend for a lighter response.',
        filter: { endpoint: row.key },
        affected: row.count,
      }));
  }

  function heavyInsights(records) {
    return groupRows(records.filter(isHttp), endpointLabel)
      .map((row) => ({
        row,
        biggest: Math.max(0, ...row.records.map((record) => record.resSize || 0)),
      }))
      .filter((item) => item.biggest >= HEAVY_RESPONSE_BYTES)
      .sort((a, b) => b.biggest - a.biggest)
      .map(({ row, biggest }) => ({
        id: `heavy:${row.key}`,
        severity: 'warning',
        icon: 'database',
        title: row.key,
        metric: formatBytes(biggest),
        kind: 'Heavy response',
        detail: `${formatBytes(row.bytes)} transferred over ${row.count} call${row.count === 1 ? '' : 's'}.`,
        advice: 'Request only the fields you need, paginate, or cache the payload instead of refetching it.',
        filter: { endpoint: row.key },
        affected: row.count,
      }));
  }

  function burstInsight(records, now) {
    const { peak, at, session } = peakConcurrency(records, now);
    if (peak < PEAK_CONCURRENCY_WARN) return [];
    return [
      {
        id: 'burst',
        session,
        severity: 'warning',
        icon: 'bolt',
        title: 'Request burst',
        metric: `${peak} in flight at once`,
        kind: 'Concurrency',
        detail: 'Many requests overlapped at the same moment, which usually means a startup or screen-mount storm.',
        advice: 'Stagger non-critical calls, batch where the API allows, and defer what the first screen does not need.',
        filter: { around: at },
        affected: peak,
      },
    ];
  }

  function chattyCallerInsight(records) {
    const rows = groupRows(records.filter(isHttp), (record) => callerInfo(record).key)
      .filter((row) => row.key !== '(unknown)')
      .sort((a, b) => b.count - a.count);
    const top = rows[0];
    if (!top || top.count < 15 || top.share < 0.2) return [];
    return [
      {
        id: `caller:${top.key}`,
        severity: 'info',
        icon: 'code',
        title: top.key,
        metric: `${formatPercent(top.share)} of all requests`,
        kind: 'Busiest caller',
        detail: `${top.count} calls, ${formatMs(top.timeMs)} of cumulative request time.`,
        advice: 'Start here when reducing volume: one change in this code path moves the total the most.',
        filter: { caller: top.key },
        affected: top.count,
      },
    ];
  }

  function nameDevice(item, labels) {
    if (!item.session) return item;
    return {
      ...item,
      device: labels[item.session],
      filter: { ...item.filter, session: item.session },
    };
  }

  /** Ranked findings: worst first, then by how many requests they touch. */
  function insights(records, now) {
    const auth = authFailureInsight(records);
    const all = [
      ...auth,
      ...failingInsights(records, auth.length > 0),
      ...duplicateInsights(records, now),
      ...slowInsights(records),
      ...heavyInsights(records),
      ...burstInsight(records, now),
      ...pollingInsights(records),
      ...chattyCallerInsight(records),
    ];
    // With several devices, per-device findings say which one and scope the drill-down to it.
    const sessions = sessionsList(records);
    const labels = Object.fromEntries(sessions.map((item) => [item.id, item.label]));
    const named = sessions.length > 1 ? all.map((item) => nameDevice(item, labels)) : all;
    return named.sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.affected - a.affected,
    );
  }

  // ---- filtering ---------------------------------------------------------

  /** One filter object scopes every number on the dashboard. */
  function applyFilter(records, filter, now) {
    const needle = (filter.q || '').trim().toLowerCase();
    const dupKeys = filter.dupKey ? new Set([filter.dupKey]) : undefined;
    return records.filter((record) => {
      if (filter.kinds && !filter.kinds.includes(isHttp(record) ? 'http' : 'ws')) {
        return false;
      }
      if (filter.windowMs && record.startedAt < now - filter.windowMs) return false;
      if (filter.session && sessionOf(record) !== filter.session) return false;
      if (filter.host && hostOf(record) !== filter.host) return false;
      if (filter.endpoint && endpointLabel(record) !== filter.endpoint) return false;
      if (filter.caller && callerInfo(record).key !== filter.caller) return false;
      if (filter.rpc && rpcLabel(record) !== filter.rpc) return false;
      if (filter.codes && !filter.codes.includes(String(record.status))) return false;
      if (filter.status === 'failed' && !isFailed(record)) return false;
      if (filter.status === 'pending' && !isPending(record)) return false;
      if (filter.status === 'ok' && (isFailed(record) || isPending(record))) return false;
      if (dupKeys) {
        const key = `${record.method} ${record.url} ${record.reqBody || ''}`;
        if (!dupKeys.has(key)) return false;
      }
      if (filter.around !== undefined) {
        const end = endTime(record, now);
        if (record.startedAt > filter.around || end < filter.around) return false;
      }
      if (!needle) return true;
      const haystack = [
        record.url,
        endpointLabel(record),
        callerInfo(record).key,
        record.status,
        record.method,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }

  // ---- report ------------------------------------------------------------

  function toMarkdown(records, now) {
    const summary = summarize(records, now);
    const findings = insights(records, now).slice(0, 8);
    const topEndpoints = groupRows(records.filter(isHttp), endpointLabel)
      .sort((a, b) => b.timeMs - a.timeMs)
      .slice(0, 8);
    const lines = [
      '# Network report',
      '',
      `- Requests: ${summary.total} (${summary.sockets} sockets), ${summary.perMinute.toFixed(1)}/min`,
      `- Failed: ${summary.failed} (${formatPercent(summary.failRate)})`,
      `- Latency: p50 ${formatMs(summary.p50)}, p95 ${formatMs(summary.p95)}`,
      `- Redundant: ${summary.redundant} (${formatPercent(summary.redundantRate)})`,
      `- Data: ${formatBytes(summary.bytes)}, peak ${summary.peak.peak} in flight`,
      '',
      '## Pain points',
      '',
    ];
    if (findings.length === 0) lines.push('None detected.');
    for (const finding of findings) {
      lines.push(`- **${finding.kind}**: ${finding.title} (${finding.metric}). ${finding.advice}`);
    }
    const devices = sessionsList(records);
    if (devices.length > 1) {
      lines.splice(7, 0, `- Devices: ${devices.map((item) => item.label).join('; ')}`);
    }
    lines.push('', '## Where the time goes', '');
    for (const row of topEndpoints) {
      lines.push(
        `- ${row.key}: ${row.count} calls, ${formatMs(row.timeMs)} total, p95 ${formatMs(row.p95)}, ${row.failed} failed`,
      );
    }
    return lines.join('\n');
  }

  return {
    isHttp,
    isFailed,
    isPending,
    latencyOf,
    formatMs,
    formatBytes,
    formatPercent,
    formatCount,
    parseUrl,
    normalizePath,
    rpcMethods,
    rpcLabel,
    endpointBase,
    endpointLabel,
    hostOf,
    callerInfo,
    percentile,
    peakConcurrency,
    sessionOf,
    sessionsList,
    groupRows,
    duplicates,
    detectPolling,
    timeline,
    summarize,
    insights,
    applyFilter,
    toMarkdown,
  };
});
