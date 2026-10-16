/**
 * Collapsed "App profiling" and "API requests" sections for the performance
 * PR comment. Both cover every scenario, not only failed ones.
 */

import { sanitizeApiCallUrl } from './diff-app-profiling.mjs';



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

function formatFps(fps) {
  return fps ? fps.avg.toFixed(1) : '—';
}

function formatStartup(startup) {
  if (!startup) {
    return '—';
  }
  const part = (value) => (typeof value === 'number' ? `${Math.round(value)}` : '—');
  return `${part(startup.cold)} / ${part(startup.hot)} ms`;
}

function formatBattery(batteryDrain) {
  return batteryDrain ? `${batteryDrain.total.toFixed(1)} mAh` : '—';
}

function formatTemperature(temperature) {
  return temperature ? `${temperature.avg.toFixed(1)} / ${temperature.max.toFixed(1)} °C` : '—';
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
    md += `| Test | Device | CPU avg / max | Memory avg / max | Network | Janky / frozen frames | Avg FPS | Startup cold / hot | Battery drain | Temp avg / max | ANRs | Crashes |\n`;
    md += `|------|--------|---------------|------------------|---------|-----------------------|---------|--------------------|---------------|----------------|------|---------|\n`;
    for (const run of usable) {
      const summary = run.profilingSummary;
      md += `| ${escapeCell(run.testName)} | ${escapeCell(run.device)} | ${formatPair(
        summary.cpu,
        '%',
      )} | ${formatPair(summary.memory, 'MB')} | ${formatNetwork(
        summary.networkIO,
      )} | ${formatFrames(summary.uiRendering)} | ${formatFps(
        summary.fps,
      )} | ${formatStartup(summary.startup)} | ${formatBattery(
        summary.batteryDrain,
      )} | ${formatTemperature(summary.temperature)} | ${
        summary.uiRendering?.anrs ?? '—'
      } | ${summary.crashes ?? '—'} |\n`;
    }
  }

  if (unavailable > 0) {
    md += `\n_App profiling unavailable for ${unavailable} scenario(s)._\n`;
  }

  md += `\n</details>\n\n`;
  return md;
}

function buildScenarioApiBlock(run, maxRows = Infinity) {
  const groups = aggregateApiCalls(run.apiCalls);
  const shown = groups.slice(0, maxRows);

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
    md += `\n_…and ${groups.length - shown.length} more endpoints (fewest calls) not shown._\n`;
  }
  md += `\n</details>\n\n`;
  return md;
}

const intro = (withCalls) => {
  const totalCalls = withCalls.reduce((sum, run) => sum + run.apiCalls.length, 0);
  return `${withCalls.length} scenarios · ${totalCalls} calls · grouped by endpoint, most called first (query strings removed, key-like path segments masked)`;
};

function splitRuns(runs) {
  const withCalls = runs.filter(
    (run) => Array.isArray(run.apiCalls) && run.apiCalls.length > 0,
  );
  const unavailable = runs.filter(
    (run) => !run.apiCalls?.length && run.apiCallsError,
  ).length;
  return { withCalls, unavailable };
}

const sumLength = (blocks) => blocks.reduce((sum, block) => sum + block.length, 0);

/**
 * Collapsed section for the PR comment. GitHub caps a comment at 65,536
 * characters, so every scenario gets the same number of rows (its most called
 * endpoints), as many as fit in `charBudget`.
 *
 * @param runs Array of { testName, device, apiCalls, apiCallsError }.
 * @param options.charBudget Maximum characters this section may add.
 * @param options.fullListUrl Where the complete list lives, linked when rows
 *   had to be left out.
 */
export function buildApiRequestsSection(
  runs,
  { charBudget = 40000, fullListUrl = null } = {},
) {
  const { withCalls, unavailable } = splitRuns(runs);
  if (withCalls.length === 0 && unavailable === 0) {
    return '';
  }

  const maxGroups = Math.max(
    1,
    ...withCalls.map((run) => aggregateApiCalls(run.apiCalls).length),
  );
  const overhead = 700;
  const build = (cap) => withCalls.map((run) => buildScenarioApiBlock(run, cap));

  // Largest rows-per-scenario cap that still fits the budget.
  let low = 1;
  let high = maxGroups;
  let blocks = null;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = build(mid);
    if (sumLength(candidate) + overhead <= charBudget) {
      blocks = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Even one row per scenario is too much: keep as many scenarios as fit.
  let omitted = 0;
  if (!blocks) {
    blocks = [];
    let size = overhead;
    for (const block of build(1)) {
      if (size + block.length > charBudget) {
        omitted += 1;
        continue;
      }
      blocks.push(block);
      size += block.length;
    }
  }

  const truncated = omitted > 0 || blocks.some((block) => block.includes('not shown'));
  const totalCalls = withCalls.reduce((sum, run) => sum + run.apiCalls.length, 0);

  let md = `<details>\n<summary>🌐 API requests (${withCalls.length} scenarios, ${totalCalls} calls)</summary>\n\n`;
  md += `${intro(withCalls)}\n\n`;
  if (truncated) {
    md += fullListUrl
      ? `_Showing the most called endpoints per scenario; the complete list is in the [run summary](${fullListUrl})._\n\n`
      : `_Showing the most called endpoints per scenario._\n\n`;
  }
  md += blocks.join('');
  if (omitted > 0) {
    md += `_${omitted} scenario(s) omitted to stay within GitHub's comment size limit._\n\n`;
  }
  if (unavailable > 0) {
    md += `_Network logs unavailable for ${unavailable} scenario(s)._\n\n`;
  }
  md += `</details>\n\n`;
  return md;
}

/** Every endpoint of every scenario, for the workflow run summary (1 MiB limit). */
export function buildApiRequestsFullReport(runs) {
  const { withCalls, unavailable } = splitRuns(runs);
  if (withCalls.length === 0) {
    return '';
  }

  let md = `## 🌐 API requests (complete list)\n\n${intro(withCalls)}\n\n`;
  md += withCalls.map((run) => buildScenarioApiBlock(run)).join('');
  if (unavailable > 0) {
    md += `_Network logs unavailable for ${unavailable} scenario(s)._\n`;
  }
  return md;
}

const MAX_FAILURE_TEXT_LENGTH = 160;

/** Pull the element id out of a UiAutomator / accessibility-id / xpath selector. */
function describeSelector(selector) {
  const unquoted = selector.replace(/^"(.*)"$/, '$1');
  return (
    /resourceId\("([^"]+)"\)/.exec(unquoted)?.[1] ??
    /^~(.+)$/.exec(unquoted)?.[1] ??
    /^android=.*?(?:text|description)\("([^"]+)"\)/.exec(unquoted)?.[1] ??
    unquoted
  );
}

/**
 * Turn a failure into what the reader needs: which element was missing when
 * the Appium framework says so, otherwise the reason label plus the first
 * line of the error. Falls back to the label alone.
 */
export function describeFailure(reasonLabel, message) {
  if (!message) {
    return reasonLabel;
  }

  // WebdriverIO: element ("<selector>") still not displayed after 936ms
  const notDisplayed = /^element \((.+)\) still not displayed after \d+ms/.exec(
    message,
  );
  if (notDisplayed) {
    return `Element "${describeSelector(notDisplayed[1])}" not found`;
  }

  const text =
    message.length > MAX_FAILURE_TEXT_LENGTH
      ? `${message.slice(0, MAX_FAILURE_TEXT_LENGTH - 1)}…`
      : message;
  return `${reasonLabel}: ${text}`;
}

/**
 * Lists the timers that broke their threshold, e.g.
 * `"Asset view loaded" took 6500 ms > max of 4000 ms`.
 */
export function describeQualityGateViolations(qualityGates) {
  const violations = (qualityGates?.violations ?? []).filter(
    (v) => typeof v?.actual === 'number' && typeof v?.threshold === 'number',
  );
  if (violations.length === 0) {
    return null;
  }

  const lines = violations.map((v) => {
    const subject =
      v.type === 'total'
        ? 'Total duration'
        : `"${v.stepName ?? `Step ${(v.stepIndex ?? 0) + 1}`}"`;
    const took = v.type === 'total' ? 'was' : 'took';
    return `${subject} ${took} ${v.actual} ms > max of ${v.threshold} ms`;
  });

  return `Quality gates exceeded: ${lines.join('<br>')}`;
}
