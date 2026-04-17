'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Buffer } = require('node:buffer');

// Shape of a single captured issue:
//   { level, channel, source, targetRole, targetUrl, text, timestamp, allowlistMatch }
// level: 'warning' | 'error' | 'exception' | 'other'
// channel: 'console' | 'exception' | 'metro'
// source: 'app' | 'metro-log'

const LEVEL_WARNING = 'warning';
const LEVEL_ERROR = 'error';
const LEVEL_EXCEPTION = 'exception';
const LEVEL_OTHER = 'other';

const REVIEW_LEVELS = new Set([LEVEL_WARNING, LEVEL_ERROR, LEVEL_EXCEPTION]);
const TOP_ISSUES_LIMIT = 4;

const METRO_PATTERNS = [
  { level: LEVEL_EXCEPTION, re: /\b(Uncaught|unhandledRejection|FATAL EXCEPTION|UnhandledPromiseRejection)\b/i },
  { level: LEVEL_ERROR, re: /(^|\s)(\[error\]|ERROR |Error:)/i },
  { level: LEVEL_WARNING, re: /(^|\s)(\[warn\]|WARN |Warning:)/i },
];

function classifyMetroLine(line) {
  if (!line) {
    return null;
  }
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  for (const { level, re } of METRO_PATTERNS) {
    if (re.test(trimmed)) {
      return { level, text: trimmed };
    }
  }
  return null;
}

function captureFromMetro(logPath, startOffset) {
  const issues = [];
  if (!logPath || !fs.existsSync(logPath)) {
    return issues;
  }
  let stat;
  try {
    stat = fs.statSync(logPath);
  } catch {
    return issues;
  }
  const start = Math.max(0, Math.min(startOffset || 0, stat.size));
  if (stat.size <= start) {
    return issues;
  }
  let slice = '';
  try {
    const fd = fs.openSync(logPath, 'r');
    try {
      const len = stat.size - start;
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, start);
      slice = buf.toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return issues;
  }

  const lines = slice.split(/\r?\n/);
  for (const line of lines) {
    const classification = classifyMetroLine(line);
    if (!classification) {
      continue;
    }
    issues.push({
      level: classification.level,
      channel: 'metro',
      source: 'metro-log',
      targetRole: 'app',
      targetUrl: 'metro://local',
      text: classification.text.slice(0, 2000),
      timestamp: new Date().toISOString(),
      allowlistMatch: null,
    });
  }
  return issues;
}

function normalizeAppBufferEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const rawLevel = String(entry.level || '').toLowerCase();
      let level = LEVEL_OTHER;
      if (rawLevel === 'warn' || rawLevel === 'warning') {
        level = LEVEL_WARNING;
      } else if (rawLevel === 'error') {
        level = LEVEL_ERROR;
      } else if (rawLevel === 'exception') {
        level = LEVEL_EXCEPTION;
      }
      const text = String(entry.text || '').slice(0, 2000);
      if (!text) {
        return null;
      }
      return {
        level,
        channel: level === LEVEL_EXCEPTION ? 'exception' : 'console',
        source: 'app',
        targetRole: 'app',
        targetUrl: 'hermes://metamask',
        text,
        timestamp: entry.t ? new Date(Number(entry.t)).toISOString() : new Date().toISOString(),
        allowlistMatch: null,
      };
    })
    .filter(Boolean);
}

function dedupeIssues(issues) {
  const seen = new Map();
  for (const issue of issues) {
    const key = `${issue.level}|${issue.channel}|${issue.source}|${issue.text.slice(0, 300)}`;
    const prior = seen.get(key);
    if (prior) {
      prior.count += 1;
    } else {
      seen.set(key, { ...issue, count: 1 });
    }
  }
  return Array.from(seen.values());
}

function applyAllowlist(issues, allowlist) {
  const unexpected = [];
  const informational = [];
  const rules = Array.isArray(allowlist) ? allowlist : [];
  for (const issue of issues) {
    let match = null;
    for (const rule of rules) {
      if (rule && rule.level && rule.level !== issue.level) {
        continue;
      }
      if (rule && rule.textMatch) {
        try {
          const re = new RegExp(rule.textMatch);
          if (re.test(issue.text)) {
            match = rule.reason || rule.textMatch;
            break;
          }
        } catch {
          if (issue.text.includes(rule.textMatch)) {
            match = rule.reason || rule.textMatch;
            break;
          }
        }
      }
    }
    if (match) {
      informational.push({ ...issue, allowlistMatch: match });
    } else if (REVIEW_LEVELS.has(issue.level)) {
      unexpected.push(issue);
    } else {
      informational.push(issue);
    }
  }
  return { unexpected, informational };
}

function countByLevel(issues) {
  const counts = { total: 0, warning: 0, error: 0, exception: 0, other: 0 };
  for (const issue of issues) {
    counts.total += 1;
    if (counts[issue.level] !== undefined) {
      counts[issue.level] += 1;
    } else {
      counts.other += 1;
    }
  }
  return counts;
}

function matchesFailOn(issue, failOn) {
  if (!failOn || typeof failOn !== 'object') {
    return false;
  }
  const levels = Array.isArray(failOn.levels) ? failOn.levels : [];
  const textMatches = Array.isArray(failOn.textMatches) ? failOn.textMatches : [];
  if (levels.length && !levels.includes(issue.level)) {
    return false;
  }
  if (!textMatches.length) {
    return levels.length > 0;
  }
  for (const pattern of textMatches) {
    try {
      if (new RegExp(pattern).test(issue.text)) {
        return true;
      }
    } catch {
      if (issue.text.includes(pattern)) {
        return true;
      }
    }
  }
  return false;
}

function computeReview(unexpected, informational, failOn, artifactFiles) {
  const observedDeduped = dedupeIssues(unexpected);
  const observed = countByLevel(observedDeduped);
  const gatingIssues = observedDeduped.filter((issue) => matchesFailOn(issue, failOn));
  const gating = countByLevel(gatingIssues);
  const infoCount = Array.isArray(informational) ? informational.length : 0;

  let status = 'clean';
  let note = 'No unexpected warnings, errors, or exceptions observed.';
  if (gating.total > 0) {
    status = 'gating';
    note = `Observed ${gating.total} unexpected warning/error/exception event(s) matching fail_on_unexpected. Recipe marked as failing.`;
  } else if (observed.total > 0) {
    status = 'review';
    note = `Observed ${observed.total} unexpected warning/error/exception event(s) during validation. Relation to the recipe or current change is not determined; review the artifacts.`;
  }

  const ranked = observedDeduped.slice().sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return (a.text || '').localeCompare(b.text || '');
  });

  const topIssues = ranked.slice(0, TOP_ISSUES_LIMIT).map((issue) => ({
    level: issue.level,
    channel: issue.channel,
    source: issue.source,
    targetRole: issue.targetRole,
    targetUrl: issue.targetUrl,
    text: issue.text,
    allowlistMatch: issue.allowlistMatch,
  }));

  return {
    status,
    note,
    observed,
    gating,
    informational: { total: infoCount },
    topIssues,
    artifactFiles: artifactFiles || {},
  };
}

function renderMarkdown(review) {
  const { status, note, observed, gating, informational, topIssues, artifactFiles } = review;
  const lines = [];
  lines.push('# Recipe Issue Review');
  lines.push('');
  lines.push(`Status: ${status}`);
  lines.push('');
  lines.push(note);
  lines.push('');
  lines.push('Observed:');
  lines.push(`- warnings: ${observed.warning || 0}`);
  lines.push(`- errors: ${observed.error || 0}`);
  lines.push(`- exceptions: ${observed.exception || 0}`);
  lines.push(`- total: ${observed.total || 0}`);
  lines.push('');
  lines.push('Gating:');
  lines.push(`- warnings: ${gating.warning || 0}`);
  lines.push(`- errors: ${gating.error || 0}`);
  lines.push(`- exceptions: ${gating.exception || 0}`);
  lines.push(`- total: ${gating.total || 0}`);
  lines.push('');
  lines.push(`Informational-only events: ${(informational && informational.total) || 0}`);
  lines.push('');
  if (topIssues && topIssues.length) {
    lines.push('Top issues:');
    for (const issue of topIssues) {
      const levelLabel = String(issue.level || 'other').toUpperCase();
      lines.push(`- [${levelLabel}] ${issue.source}: ${issue.text}`);
    }
    lines.push('');
  }
  if (artifactFiles && Object.keys(artifactFiles).length) {
    lines.push('Artifacts:');
    for (const key of ['allIssues', 'consoleWarnings', 'consoleErrors', 'runtimeExceptions']) {
      if (artifactFiles[key]) {
        lines.push(`- ${artifactFiles[key]}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function writeJsonArtifact(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeArtifacts(runDir, { unexpected, informational, review }) {
  const outDir = path.resolve(runDir);
  fs.mkdirSync(outDir, { recursive: true });

  const all = [...(unexpected || []), ...(informational || [])];

  const paths = {
    allIssues: path.join(outDir, 'recipe-issues.json'),
    consoleWarnings: path.join(outDir, 'console-warnings.json'),
    consoleErrors: path.join(outDir, 'console-errors.json'),
    runtimeExceptions: path.join(outDir, 'runtime-exceptions.json'),
    reviewJson: path.join(outDir, 'recipe-issues-review.json'),
    reviewMd: path.join(outDir, 'recipe-issues-review.md'),
  };

  writeJsonArtifact(paths.allIssues, all);
  writeJsonArtifact(
    paths.consoleWarnings,
    all.filter((i) => i.level === LEVEL_WARNING),
  );
  writeJsonArtifact(
    paths.consoleErrors,
    all.filter((i) => i.level === LEVEL_ERROR),
  );
  writeJsonArtifact(
    paths.runtimeExceptions,
    all.filter((i) => i.level === LEVEL_EXCEPTION),
  );

  const reviewWithPaths = { ...review, artifactFiles: paths };
  writeJsonArtifact(paths.reviewJson, reviewWithPaths);
  fs.writeFileSync(paths.reviewMd, renderMarkdown(reviewWithPaths));

  return paths;
}

// Installed into the Hermes runtime via Runtime.evaluate. Returns a string
// so callers can embed it directly into eval expressions. Keeps the hook
// idempotent and bounded (500-entry cap).
function buildArmSnippet() {
  return `(() => {
  var g = globalThis;
  if (g.__AGENTIC_ISSUES_INSTALLED__) { return { installed: true, reason: 'already-installed' }; }
  g.__AGENTIC_ISSUES__ = [];
  g.__AGENTIC_ISSUES_CAP__ = 500;
  var push = function (entry) {
    try {
      if (g.__AGENTIC_ISSUES__.length < g.__AGENTIC_ISSUES_CAP__) {
        g.__AGENTIC_ISSUES__.push(entry);
      }
    } catch (_e) {}
  };
  ['warn', 'error'].forEach(function (k) {
    var orig = console[k] && console[k].bind(console);
    if (!orig) return;
    console[k] = function () {
      var args = Array.prototype.slice.call(arguments);
      try {
        var text = args.map(function (a) {
          if (a && a.stack) return String(a.stack);
          if (typeof a === 'string') return a;
          try { return JSON.stringify(a); } catch (_e) { return String(a); }
        }).join(' ');
        push({ t: Date.now(), level: k, text: text });
      } catch (_e) {}
      return orig.apply(console, args);
    };
  });
  if (typeof g.addEventListener === 'function') {
    try {
      g.addEventListener('error', function (e) {
        var err = e && (e.error || e.message);
        var text = err && err.stack ? err.stack : String(err || e);
        push({ t: Date.now(), level: 'exception', text: text });
      });
      g.addEventListener('unhandledrejection', function (e) {
        var r = e && e.reason;
        var text = r && r.stack ? r.stack : String(r || e);
        push({ t: Date.now(), level: 'exception', text: text });
      });
    } catch (_e) {}
  }
  var ep = g.ErrorUtils;
  if (ep && typeof ep.setGlobalHandler === 'function') {
    try {
      var priorHandler = typeof ep.getGlobalHandler === 'function' ? ep.getGlobalHandler() : null;
      ep.setGlobalHandler(function (err, isFatal) {
        try {
          var text = err && err.stack ? err.stack : String(err);
          push({ t: Date.now(), level: 'exception', text: (isFatal ? '[FATAL] ' : '') + text });
        } catch (_e) {}
        if (typeof priorHandler === 'function') {
          try { priorHandler(err, isFatal); } catch (_e) {}
        }
      });
    } catch (_e) {}
  }
  g.__AGENTIC_ISSUES_INSTALLED__ = true;
  return { installed: true };
})()`;
}

function buildCollectSnippet() {
  return `(() => {
  var g = globalThis;
  var buf = g.__AGENTIC_ISSUES__ || [];
  var snapshot = buf.slice();
  g.__AGENTIC_ISSUES__ = [];
  return { count: snapshot.length, entries: snapshot };
})()`;
}

module.exports = {
  LEVEL_WARNING,
  LEVEL_ERROR,
  LEVEL_EXCEPTION,
  LEVEL_OTHER,
  TOP_ISSUES_LIMIT,
  applyAllowlist,
  buildArmSnippet,
  buildCollectSnippet,
  captureFromMetro,
  classifyMetroLine,
  computeReview,
  countByLevel,
  dedupeIssues,
  matchesFailOn,
  normalizeAppBufferEntries,
  renderMarkdown,
  writeArtifacts,
};
