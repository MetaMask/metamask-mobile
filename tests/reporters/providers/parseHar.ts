import type { NetworkLogEntry } from '../types';

interface HarEntry {
  request?: { method?: string; url?: string };
  response?: { status?: number };
  time?: number;
}

export function parseHarToEntries(har: unknown): NetworkLogEntry[] {
  const log = (har as { log?: unknown } | null)?.log ?? har;
  const harEntries = Array.isArray(log)
    ? log
    : ((log as { entries?: unknown; data?: unknown } | null)?.entries ??
      (log as { data?: unknown } | null)?.data);
  if (!Array.isArray(harEntries)) {
    return [];
  }

  return (harEntries as HarEntry[]).map((entry) => ({
    method: entry.request?.method ?? 'GET',
    url: entry.request?.url ?? '',
    status: entry.response?.status,
    time: entry.time != null ? Math.round(entry.time) : undefined,
  }));
}
