/**
 * Collapsed "App profiling" and "API requests" sections for the performance
 * PR comment. Both cover every scenario, not only failed ones.
 */

import { sanitizeApiCallUrl } from './diff-app-profiling.mjs';

const MAX_ROWS_PER_SCENARIO = 25;

const escapeCell = (value) =>
  String(value ?? '—')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');

const hasUsableProfiling = (summary) =>
  Boolean(summary && !summary.error && (summary.cpu || summary.memory));

function formatPair(stats, unit) {
  return stats
    ? `${stats.avg.toFixed(1)} / ${stats.max.toFixed(1)} ${unit}`
    : '—';
}

function formatKb(kb) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function formatNetwork(networkIO) {
  return networkIO
    ? `↓ ${formatKb(networkIO.download)} / ↑ ${formatKb(networkIO.upload)}`
    : '—';
}

function formatFrames(uiRendering) {
  return uiRendering
    ? `${uiRendering.slowFrames} / ${uiRendering.frozenFrames}`
    : '—';
}

/**
 * Group raw calls by method + sanitized URL so hundreds of requests collapse
 * into a short, readable list.
 */
export function aggregateApiCalls(apiCalls) {
  const groups = new Map();

  for (const call of apiCalls) {
    const method = call.method ?? 'GET';
    const url = sanitizeApiCallUrl(call.url);
    const key = `${method} ${url}`;
    const group = groups.get(key) ?? {
      method,
      url,
      count: 0,
      statuses: new Map(),
      totalTime: 0,
      timedCount: 0,
    };

    group.count += 1;
    if (call.status != null) {
      group.statuses.set(call.status, (group.statuses.get(call.status) ?? 0) + 1);
    }
    if (typeof call.time === 'number') {
      group.totalTime += call.time;
      group.timedCount += 1;
    }
    groups.set(key, group);
  }

  return [...groups.values()].sort(
    (a, b) => b.count - a.count || a.url.localeCompare(b.url),
  );
}

function formatStatuses(statuses) {
  if (statuses.size === 0) {
    return '—';
  }
  return [...statuses.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([status, count]) => (statuses.size > 1 ? `${status} (${count})` : status))
    .join(', ');
}

/**
 * @param allRuns Array of { testName, device, profilingSummary }.
 */
export function buildProfilingSection(allRuns) {
  // Scenarios that never reported profiling (not even an error) add no signal.
  const runs = allRuns.filter((run) => run.profilingSummary);
  if (runs.length === 0) {
    return '';
  }

  const usable = runs.filter((run) => hasUsableProfiling(run.profilingSummary));
  const unavailable = runs.length - usable.length;
  const count =
    unavailable > 0 ? `${usable.length} of ${runs.length}` : `${usable.length}`;

  let md = `<details>\n<summary>📊 App profiling (${count})</summary>\n\n`;

  if (usable.length > 0) {
    md += `| Test | Device | CPU avg / max | Memory avg / max | Network | Janky / frozen frames | ANRs |\n`;
    md += `|------|--------|---------------|------------------|---------|-----------------------|------|\n`;
    for (const run of usable) {
      const summary = run.profilingSummary;
      md += `| ${escapeCell(run.testName)} | ${escapeCell(run.device)} | ${formatPair(
        summary.cpu,
        '%',
      )} | ${formatPair(summary.memory, 'MB')} | ${formatNetwork(
        summary.networkIO,
      )} | ${formatFrames(summary.uiRendering)} | ${summary.uiRendering?.anrs ?? '—'} |\n`;
    }
  }

  if (unavailable > 0) {
    md += `\n_App profiling unavailable for ${unavailable} scenario(s)._\n`;
  }

  md += `\n</details>\n\n`;
  return md;
}

function buildScenarioApiBlock(run) {
  const groups = aggregateApiCalls(run.apiCalls);
  const shown = groups.slice(0, MAX_ROWS_PER_SCENARIO);

  let md = `<details>\n<summary>${escapeCell(run.testName)} — ${
    run.apiCalls.length
  } calls, ${groups.length} unique</summary>\n\n`;
  md += `| Method | URL | Calls | Status | Avg time |\n`;
  md += `|--------|-----|-------|--------|----------|\n`;
  for (const group of shown) {
    const avg =
      group.timedCount > 0
        ? `${Math.round(group.totalTime / group.timedCount)} ms`
        : '—';
    md += `| ${group.method} | \`${group.url}\` | ${group.count} | ${formatStatuses(
      group.statuses,
    )} | ${avg} |\n`;
  }
  if (groups.length > shown.length) {
    md += `\n_…and ${groups.length - shown.length} more endpoints not shown._\n`;
  }
  md += `\n</details>\n\n`;
  return md;
}

/**
 * @param runs Array of { testName, device, apiCalls, apiCallsError }.
 * @param options.charBudget Maximum characters this section may add, to stay
 *   under GitHub's comment size limit.
 */
export function buildApiRequestsSection(runs, { charBudget = 40000 } = {}) {
  const withCalls = runs.filter(
    (run) => Array.isArray(run.apiCalls) && run.apiCalls.length > 0,
  );
  const unavailable = runs.filter(
    (run) => !run.apiCalls?.length && run.apiCallsError,
  ).length;

  if (withCalls.length === 0 && unavailable === 0) {
    return '';
  }

  const totalCalls = withCalls.reduce((sum, run) => sum + run.apiCalls.length, 0);
  let md = `<details>\n<summary>🌐 API requests (${withCalls.length} scenarios, ${totalCalls} calls)</summary>\n\n`;
  const footerReserve = 400;
  let omitted = 0;

  for (const run of withCalls) {
    const block = buildScenarioApiBlock(run);
    if (md.length + block.length + footerReserve > charBudget) {
      omitted += 1;
      continue;
    }
    md += block;
  }

  if (omitted > 0) {
    md += `_${omitted} scenario(s) omitted to stay within GitHub's comment size limit; see the \`app-profiling\` artifact for the full list._\n\n`;
  }
  if (unavailable > 0) {
    md += `_Network logs unavailable for ${unavailable} scenario(s)._\n\n`;
  }

  md += `</details>\n\n`;
  return md;
}
