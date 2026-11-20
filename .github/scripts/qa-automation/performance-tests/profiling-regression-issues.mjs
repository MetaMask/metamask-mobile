#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules, no-console */

/**
 * Jira tickets for scheduled Hermes CPU-profile findings.
 *
 * One finding (a scenario over 1.5× its recent average) becomes one Bug in
 * the owning team's Jira project. A finding that recurs while that ticket is
 * still open is recorded as a comment instead of a new ticket. Several
 * scenarios crossing in the same run each get their own ticket.
 *
 * Every ticket and recurrence comment carries a machine-readable marker so
 * the Monday report can list what was opened during the week without parsing
 * prose. The scenario's Hermes `.cpuprofile` (zipped when the capture has
 * several segments or a symbolicated copy) is uploaded onto the ticket.
 * A file over the attachment cap is not uploaded; the ticket links the
 * workflow artifact instead.
 *
 * Auth is HTTP Basic with `JIRA_USER_EMAIL` and `JIRA_API_TOKEN`. When either
 * is missing, ticket creation is skipped and the job continues.
 */

import { Buffer } from 'node:buffer';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { scenarioTeam } from './link-scenario-artifacts.mjs';

export const ISSUE_MARKER = 'hermes-profile-regression';
export const RECURRENCE_MARKER = 'hermes-profile-regression-recurrence';
/** Marker key of run-level issues opened before each scenario got its own bug. */
export const SLOW_RUN_KEY = 'slow-run';
/** `type-bug` and `regression-main` follow the labeler for a `main` bug. */
export const BASE_LABELS = ['type-bug', 'area-performance', 'regression-main'];
export const MAX_ISSUE_FRAMES = 5;
export const MAX_TRACKED_ISSUES = 200;
/**
 * Files larger than this are not uploaded. The ticket links the workflow
 * artifact instead. 25 MB is the cap this automation already used when the
 * capture was attached to a GitHub issue.
 */
export const JIRA_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const DEFAULT_JIRA_BASE_URL = 'https://consensyssoftware.atlassian.net';
export const ISSUE_TITLE_PREFIX = '[Bug]: Hermes JS work regression';

const ATTACHMENT_CONTENT_TYPES = {
  '.cpuprofile': 'application/json',
  '.zip': 'application/zip',
  '.json': 'application/json',
};

function displayName(scenario) {
  return String(scenario || '')
    .replace(/__/g, ': ')
    .replace(/_/g, ' ');
}

function formatDurationsAlike(values) {
  const numbers = values.map((value) => Number(value || 0));
  const seconds = Math.max(...numbers) >= 10_000;
  return numbers.map((ms) =>
    seconds ? `${(ms / 1000).toFixed(1)} s` : `${ms.toFixed(1)} ms`,
  );
}

function formatMs(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('en-US')} ms`;
}

export function findingKey(finding) {
  return `${finding.projectName}|${finding.scenario}`;
}

export function encodeMarker(kind, data) {
  return `<!-- ${kind} ${JSON.stringify(data)} -->`;
}

export function parseMarker(body, kind) {
  const match = new RegExp(`<!-- ${kind} (\\{[\\s\\S]*?\\}) -->`).exec(
    String(body || ''),
  );
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function parseRecurrenceMarkers(body) {
  const pattern = new RegExp(
    `<!-- ${RECURRENCE_MARKER} (\\{[\\s\\S]*?\\}) -->`,
    'g',
  );
  const markers = [];
  for (const match of String(body || '').matchAll(pattern)) {
    try {
      markers.push(JSON.parse(match[1]));
    } catch {
      // A hand-edited comment is not a recurrence.
    }
  }
  return markers;
}

/**
 * Hot frames of one scenario, merged across its segments and retries and
 * ranked by self time. `frames` is the list `extractProfilingFrames` builds
 * for the flagged scenarios.
 */
export function topFramesForScenario(frames, scenario, limit = MAX_ISSUE_FRAMES) {
  const wanted = displayName(scenario);
  const totals = new Map();
  for (const frame of frames || []) {
    if (displayName(frame.scenario) !== wanted || !frame.name) {
      continue;
    }
    const identity = `${frame.name}|${frame.url || ''}|${frame.line ?? ''}`;
    const entry = totals.get(identity) || {
      name: frame.name,
      url: frame.url || null,
      line: frame.line ?? null,
      selfMs: 0,
    };
    entry.selfMs += Number(frame.selfMs || 0);
    totals.set(identity, entry);
  }
  return [...totals.values()]
    .sort((left, right) => right.selfMs - left.selfMs)
    .slice(0, limit);
}

function sanitizeFileName(value) {
  return String(value || '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Raw and symbolicated Hermes captures for one finding, taken from the
 * per-run report. Paths that are no longer on disk are dropped.
 */
export function scenarioProfilePaths(currentReport, finding) {
  const scenario = (currentReport?.scenarios || []).find(
    (item) =>
      item.projectName === finding.projectName &&
      item.scenario === finding.scenario,
  );
  const seen = new Set();
  const files = [];
  const add = (filePath, archiveName) => {
    if (!filePath || seen.has(filePath) || !fs.existsSync(filePath)) {
      return;
    }
    seen.add(filePath);
    files.push({ path: filePath, archiveName });
  };
  for (const profile of scenario?.profiles || []) {
    const baseName = path.basename(
      profile.sourcePath || profile.fileName || 'profile.cpuprofile',
    );
    add(profile.sourcePath, path.join('raw', baseName));
    if (profile.analysisPath && profile.analysisPath !== profile.sourcePath) {
      add(
        profile.analysisPath,
        path.join('symbolicated', path.basename(profile.analysisPath)),
      );
    }
  }
  return files;
}

function zipDirectory(stageDirectory, destination) {
  const result = spawnSync('zip', ['-r', '-q', destination, '.'], {
    cwd: stageDirectory,
  });
  if (result.status !== 0) {
    throw new Error(
      (
        result.stderr ||
        result.stdout ||
        `zip failed with status ${result.status}`
      )
        .toString()
        .trim(),
    );
  }
}

/**
 * One file to attach. A single raw capture stays a `.cpuprofile`. Several
 * segments, or a raw capture plus its symbolicated copy, become one zip.
 */
export function packageScenarioProfiles({ finding, files, outputDirectory }) {
  if (!files?.length) {
    return null;
  }
  fs.mkdirSync(outputDirectory, { recursive: true });
  const stem = sanitizeFileName(
    `hermes-profile-${displayName(finding.scenario)}`,
  ).slice(0, 120);
  if (
    files.length === 1 &&
    files[0].path.endsWith('.cpuprofile') &&
    files[0].archiveName.startsWith('raw')
  ) {
    const destination = path.join(outputDirectory, `${stem}.cpuprofile`);
    fs.copyFileSync(files[0].path, destination);
    return destination;
  }
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-profile-zip-'));
  try {
    for (const file of files) {
      const target = path.join(stage, file.archiveName);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(file.path, target);
    }
    const destination = path.join(outputDirectory, `${stem}.zip`);
    zipDirectory(stage, destination);
    return destination;
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

function attachmentMarkdown(attachment, label = null) {
  if (!attachment) {
    return null;
  }
  const prefix = label ? `**${label}:** ` : '';
  if (attachment.tooLarge) {
    const megabytes = (attachment.bytes / (1024 * 1024)).toFixed(1);
    const limitBytes = attachment.limitBytes || JIRA_ATTACHMENT_BYTES;
    const limit =
      limitBytes >= 1024 * 1024
        ? `${Math.round(limitBytes / (1024 * 1024))} MB`
        : `${limitBytes} byte${limitBytes === 1 ? '' : 's'}`;
    const link = attachment.url
      ? ` Download it from the workflow artifact: [${attachment.name}](${attachment.url}).`
      : ' It is on the performance run linked above.';
    return `${prefix}Hermes CPU profile \`${attachment.name}\` is ${megabytes} MB, over the ${limit} Jira attachment limit.${link}`;
  }
  if (attachment.error) {
    return `${prefix}Hermes CPU profile not attached: ${attachment.error}.`;
  }
  if (attachment.url) {
    return `${prefix}Hermes CPU profile: [${attachment.name}](${attachment.url})`;
  }
  return `${prefix}Hermes CPU profile attached: \`${attachment.name}\`.`;
}

function recordingsLines(currentReport, attachments) {
  const lines = [];
  if (currentReport?.meta?.analysisArtifactsUrl) {
    lines.push(
      `Analysis artifacts (\`report.json\`, per-scenario JSON): [app-profiling-analysis](${currentReport.meta.analysisArtifactsUrl}).`,
    );
  }
  const list = (Array.isArray(attachments) ? attachments : [attachments]).filter(
    Boolean,
  );
  for (const attachment of list) {
    const line = attachmentMarkdown(attachment, attachment.label || null);
    if (line) {
      lines.push(line);
    }
  }
  if (lines.length === 0) {
    lines.push(
      'Hermes profiles are attached to the performance run linked above.',
    );
  }
  return lines;
}

function frameLine(frame) {
  const location = frame.url
    ? ` — ${frame.url}${frame.line ? `:${frame.line}` : ''}`
    : '';
  return `- \`${frame.name}\`${location} — ${formatMs(frame.selfMs)} self`;
}

function ownerLine(team) {
  const mention = team.githubTeam ? ` (@${team.githubTeam})` : '';
  return `Owner: \`${team.handle}\`${mention}`;
}

/**
 * Jira label that identifies one scenario. Labels cannot contain the `|` or
 * spaces in a finding key, so the key is folded into a single token.
 */
export function scenarioIssueLabel(key) {
  const sanitized = String(key || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220);
  return `hermes-key-${sanitized || 'unknown'}`;
}

function issueLabels(team, key) {
  const labels = [
    ...BASE_LABELS,
    team.githubLabel,
    ISSUE_MARKER,
    scenarioIssueLabel(key),
  ];
  return labels.filter((label, index) => label && labels.indexOf(label) === index);
}

function operatingSystem(projectName) {
  return /android/i.test(String(projectName || '')) ? 'Android' : 'Unknown';
}

function versionLine(appVersion, headSha) {
  if (appVersion) {
    return `${appVersion} (\`package.json\` at ${headSha ? `\`${headSha}\`` : 'the profiled commit'})`;
  }
  return headSha
    ? `Not resolved from \`package.json\` at \`${headSha}\``
    : 'Not resolved: the performance run reported no head commit';
}

function buildNumberLine(headSha) {
  return headSha
    ? `Not a store build: CI \`main-e2e\` build from commit \`${headSha}\``
    : 'Not a store build: CI `main-e2e` build';
}

function evidenceBlock({ exception, finding, frames }) {
  const [current, baseline] = formatDurationsAlike([
    finding.jsWorkMs,
    finding.baselineMedianJsWorkMs,
  ]);
  const lines = [
    `Run: ${exception.meta.runId}`,
    `Scenario: ${displayName(finding.scenario)} (${finding.projectName})`,
    `JS work: ${formatMs(finding.jsWorkMs)} (${current}) vs ${formatMs(finding.baselineMedianJsWorkMs)} (${baseline}) recent average`,
    `Ratio: ${finding.ratio}× across ${finding.baselineRuns} baseline runs (threshold ${exception.meta.thresholdRatio}×)`,
  ];
  const top = topFramesForScenario(frames, finding.scenario);
  if (top.length > 0) {
    lines.push('', 'Top symbolicated self time in the profile:');
    for (const frame of top) {
      const location = frame.url
        ? ` — ${frame.url}${frame.line ? `:${frame.line}` : ''}`
        : '';
      lines.push(`  ${frame.name}${location} — ${formatMs(frame.selfMs)} self`);
    }
  }
  return lines.join('\n');
}

/**
 * The proposal is one text for the whole run. A single finding keeps it.
 * Several findings each keep the lines that name that scenario, so one
 * team's bug does not carry the others. Lines that name no scenario are
 * dropped. The Slack card is written earlier from the full text.
 */
function proposalForFinding(aiText, finding, findingCount) {
  const text = String(aiText || '').trim();
  if (!text) {
    return null;
  }
  if (findingCount <= 1) {
    return text;
  }
  const names = [displayName(finding.scenario), String(finding.scenario || '')]
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return (
    text
      .split('\n')
      .filter((line) => {
        const lower = line.toLowerCase();
        return names.some((name) => lower.includes(name));
      })
      .join('\n')
      .trim() || null
  );
}

function additionalContextLines({ exception, currentReport, aiText, team }) {
  const lines = [
    `- Performance run: ${exception.meta.runUrl}`,
    `- Baseline: average of the complete, non-spiking runs among the previous ${exception.meta.baselinePreviousRuns} scheduled runs (~36h), ${exception.meta.baselineRunCount} collected; flagged only after two consecutive runs over the threshold`,
    `- Profiles in the run: ${exception.meta.profileCount} (${exception.meta.symbolicatedProfileCount} symbolicated)`,
  ];
  if (currentReport?.meta?.headSha) {
    lines.push(`- Commit: \`${currentReport.meta.headSha}\``);
  }
  if (currentReport?.meta?.analysisArtifactsUrl) {
    lines.push(
      `- Analysis artifacts (\`report.json\`, per-scenario JSON): ${currentReport.meta.analysisArtifactsUrl}`,
    );
  }
  lines.push(
    '- Source: Hermes CPU sampling only. "JS work" is sampled JS self time attributed from those samples (GC, idle and native waits excluded), not the wall-clock duration of the test.',
    '- Opened automatically by the `Analyze App Profiling` workflow after a scheduled performance run. Recurrences while this ticket is open are added as comments instead of new tickets.',
  );
  if (team?.jiraProject) {
    lines.push(
      `- Jira project: \`${team.jiraProject}\`. Filed directly in that project.`,
    );
  }
  if (team?.githubLabel) {
    lines.push(`- Team tag: \`${team.githubLabel}\`.`);
  }
  if (aiText) {
    lines.push(
      '',
      '<details>',
      '<summary>AI proposal (profiling evidence only; not a root cause)</summary>',
      '',
      String(aiText).trim(),
      '',
      '</details>',
    );
  }
  return lines;
}

/**
 * Bug-report template body for one flagged scenario. Section titles follow
 * `.github/scripts/shared/template.ts` so the template check recognises it.
 */
export function buildRegressionIssue({
  finding,
  exception,
  currentReport,
  frames = [],
  aiText = null,
  appVersion = null,
  profileAttachment = null,
}) {
  const team = scenarioTeam(displayName(finding.scenario));
  const scenario = displayName(finding.scenario);
  const key = findingKey(finding);
  const [current, baseline] = formatDurationsAlike([
    finding.jsWorkMs,
    finding.baselineMedianJsWorkMs,
  ]);
  const headSha = currentReport?.meta?.headSha || null;
  const top = topFramesForScenario(frames, finding.scenario);
  const body = [
    '### Describe the bug',
    '',
    `The scheduled Hermes CPU-profile check flagged **${scenario}** in performance run [${exception.meta.runId}](${exception.meta.runUrl}): sampled JS work was **${current}** against a **${baseline}** average of the previous ${finding.baselineRuns} clean scheduled runs (**${finding.ratio}×**, threshold ${exception.meta.thresholdRatio}×).`,
    '',
    ownerLine(team),
    '',
    '### Expected behavior',
    '',
    `JS work for **${scenario}** stays within ${exception.meta.thresholdRatio}× of its recent average across scheduled runs on \`main\`.`,
    '',
    '### Screenshots/Recordings',
    '',
    ...recordingsLines(currentReport, profileAttachment),
    '',
    '### Steps to reproduce',
    '',
    `1. Open the performance run [${exception.meta.runId}](${exception.meta.runUrl}) and download the Hermes CPU profiles for **${scenario}**.`,
    '2. Run Actions → Analyze App Profiling with `run_id` set to that run to rebuild the per-scenario report.',
    `3. Compare the scenario's JS work with the average of the previous clean scheduled runs; it exceeds ${exception.meta.thresholdRatio}× that average in this run and the one before it.`,
    ...(top.length > 0
      ? [
          '4. Hot frames to start from:',
          ...top.map((frame) => `   ${frameLine(frame)}`),
        ]
      : []),
    '',
    '### Error messages or log output',
    '',
    '```shell',
    evidenceBlock({ exception, finding, frames }),
    '```',
    '',
    '### Where was this bug found?',
    '',
    'Scheduled performance CI on `main` (not a store or release-candidate build)',
    '',
    '### Version',
    '',
    versionLine(appVersion, headSha),
    '',
    '### Build number',
    '',
    buildNumberLine(headSha),
    '',
    '### Build type',
    '',
    'Other (CI `main-e2e` build used by the scheduled performance suite)',
    '',
    '### Device',
    '',
    `TestMu device of the scheduled performance suite (project \`${finding.projectName}\`)`,
    '',
    '### Operating system',
    '',
    operatingSystem(finding.projectName),
    '',
    '### Additional context',
    '',
    ...additionalContextLines({ exception, currentReport, aiText, team }),
    '',
    '### Severity',
    '',
    'To be assessed by the owning team. Hermes sampling only; one scheduled run is one sample per scenario.',
    '',
    encodeMarker(ISSUE_MARKER, {
      key,
      kind: 'scenario',
      scenario,
      projectName: finding.projectName,
      owner: team.handle,
      runId: String(exception.meta.runId),
      ratio: finding.ratio,
      jsWorkMs: finding.jsWorkMs,
      baselineMedianJsWorkMs: finding.baselineMedianJsWorkMs,
      detectedAt: exception.meta.createdAt || null,
    }),
    '',
  ].join('\n');

  return {
    key,
    title: `${ISSUE_TITLE_PREFIX} — ${scenario}`,
    body,
    labels: issueLabels(team, key),
    owner: team.handle,
    jiraProject: team.jiraProject,
  };
}

export function buildRecurrenceComment({
  exception,
  finding,
  profileAttachment = null,
}) {
  const attached = [attachmentMarkdown(profileAttachment)].filter(Boolean);
  const [current, baseline] = formatDurationsAlike([
    finding.jsWorkMs,
    finding.baselineMedianJsWorkMs,
  ]);
  return [
    `Flagged again in performance run [${exception.meta.runId}](${exception.meta.runUrl}): JS work ${current} vs ${baseline} recent average (${finding.ratio}× across ${finding.baselineRuns} baseline runs).`,
    ...(attached.length ? ['', ...attached] : []),
    '',
    encodeMarker(RECURRENCE_MARKER, {
      runId: String(exception.meta.runId),
      ratio: finding.ratio,
      jsWorkMs: finding.jsWorkMs,
      baselineMedianJsWorkMs: finding.baselineMedianJsWorkMs,
      detectedAt: exception.meta.createdAt || null,
    }),
  ].join('\n');
}

const SEARCH_FIELDS = [
  'summary',
  'status',
  'created',
  'resolutiondate',
  'labels',
  'description',
];

const INLINE_MARKDOWN =
  /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;

export function jiraConfigFromEnv(env = process.env) {
  const baseUrl = String(env.JIRA_BASE_URL || DEFAULT_JIRA_BASE_URL).replace(
    /\/+$/,
    '',
  );
  const email = String(env.JIRA_USER_EMAIL || '').trim();
  const apiToken = String(env.JIRA_API_TOKEN || '');
  return {
    baseUrl,
    email,
    apiToken,
    configured: Boolean(email && apiToken),
  };
}

function basicAuth(email, apiToken) {
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
}

function jiraErrorMessage(status, payload) {
  if (payload && typeof payload === 'object') {
    const messages = [
      ...(Array.isArray(payload.errorMessages) ? payload.errorMessages : []),
      ...Object.entries(payload.errors || {}).map(
        ([field, message]) => `${field}: ${message}`,
      ),
    ];
    if (payload.message) {
      messages.push(String(payload.message));
    }
    if (messages.length > 0) {
      return `Jira HTTP ${status}: ${messages.join('; ')}`;
    }
  }
  const detail =
    typeof payload === 'string' ? payload : JSON.stringify(payload ?? '');
  return `Jira HTTP ${status}: ${String(detail).slice(0, 500)}`;
}

async function jiraRequest({
  jira,
  fetchFn = fetch,
  method,
  path: requestPath,
  body,
  headers = {},
}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetchFn(`${jira.baseUrl}${requestPath}`, {
    method,
    headers: {
      Authorization: basicAuth(jira.email, jira.apiToken),
      Accept: 'application/json',
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body == null ? undefined : isForm ? body : JSON.stringify(body),
  });
  const text = typeof response.text === 'function' ? await response.text() : '';
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    throw new Error(jiraErrorMessage(response.status, payload));
  }
  return payload;
}

function pushText(nodes, text) {
  if (text) {
    nodes.push({ type: 'text', text });
  }
}

export function parseInline(text) {
  const nodes = [];
  const source = String(text ?? '');
  let last = 0;
  for (const match of source.matchAll(INLINE_MARKDOWN)) {
    if (match.index > last) {
      pushText(nodes, source.slice(last, match.index));
    }
    if (match[2] != null) {
      nodes.push({
        type: 'text',
        text: match[2],
        marks: [{ type: 'strong' }],
      });
    } else if (match[3] != null) {
      nodes.push({
        type: 'text',
        text: match[3],
        marks: [{ type: 'code' }],
      });
    } else if (match[4] != null) {
      nodes.push({
        type: 'text',
        text: match[4],
        marks: [{ type: 'link', attrs: { href: match[5] } }],
      });
    }
    last = match.index + match[0].length;
  }
  if (last < source.length) {
    pushText(nodes, source.slice(last));
  }
  return nodes.length > 0 ? nodes : [{ type: 'text', text: ' ' }];
}

function paragraphNode(text) {
  return { type: 'paragraph', content: parseInline(text) };
}

function listItem(line) {
  const match = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
  if (!match) {
    return null;
  }
  return {
    indent: match[1].length,
    ordered: /\d+\./.test(match[2]),
    text: match[3],
  };
}

function buildLists(items) {
  function take(index, indent) {
    const ordered = items[index].ordered;
    const list = {
      type: ordered ? 'orderedList' : 'bulletList',
      content: [],
      ...(ordered ? { attrs: { order: 1 } } : {}),
    };
    while (
      index < items.length &&
      items[index].indent === indent &&
      items[index].ordered === ordered
    ) {
      const item = items[index];
      index += 1;
      const nested = [];
      if (index < items.length && items[index].indent > indent) {
        const child = take(index, items[index].indent);
        nested.push(child.node);
        index = child.next;
      }
      list.content.push({
        type: 'listItem',
        content: [paragraphNode(item.text), ...nested],
      });
    }
    return { node: list, next: index };
  }

  const lists = [];
  let index = 0;
  while (index < items.length) {
    const piece = take(index, items[index].indent);
    lists.push(piece.node);
    index = piece.next;
  }
  return lists;
}

function isMarkerLine(line) {
  return /^<!-- .+ -->$/.test(line.trim());
}

/**
 * Converts the bug-report markdown this file builds into Atlassian Document
 * Format. The converter covers the headings, lists, code fences, links, and
 * collapsed metadata this automation emits.
 */
export function markdownToAdf(markdown) {
  const lines = String(markdown || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const content = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === '') {
      index += 1;
      continue;
    }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      const text = code.join('\n');
      content.push({
        type: 'codeBlock',
        ...(language ? { attrs: { language } } : {}),
        content: [{ type: 'text', text: text || ' ' }],
      });
      continue;
    }
    if (line.trim() === '<details>') {
      index += 1;
      let title = 'Details';
      if (index < lines.length && lines[index].includes('<summary>')) {
        title = lines[index].replace(/<\/?summary>/g, '').trim() || title;
        index += 1;
      }
      const inner = [];
      while (index < lines.length && lines[index].trim() !== '</details>') {
        inner.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      const innerDoc = markdownToAdf(inner.join('\n'));
      content.push({
        type: 'expand',
        attrs: { title },
        content:
          innerDoc.content.length > 0
            ? innerDoc.content
            : [paragraphNode(title)],
      });
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      content.push({
        type: 'heading',
        attrs: { level: heading[1].length },
        content: parseInline(heading[2]),
      });
      index += 1;
      continue;
    }
    if (isMarkerLine(line)) {
      content.push({
        type: 'expand',
        attrs: { title: 'Automation metadata' },
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: line.trim() }],
          },
        ],
      });
      index += 1;
      continue;
    }
    if (listItem(line)) {
      const items = [];
      while (index < lines.length && listItem(lines[index])) {
        items.push(listItem(lines[index]));
        index += 1;
      }
      content.push(...buildLists(items));
      continue;
    }
    content.push(paragraphNode(line));
    index += 1;
  }
  if (content.length === 0) {
    content.push(paragraphNode(' '));
  }
  return { type: 'doc', version: 1, content };
}

export function adfToText(node) {
  if (node == null) {
    return '';
  }
  if (typeof node === 'string') {
    return node;
  }
  if (node.type === 'text') {
    return node.text || '';
  }
  if (node.type === 'hardBreak') {
    return '\n';
  }
  const children = (node.content || []).map((child) => adfToText(child)).join('');
  if (node.type === 'expand' || node.type === 'nestedExpand') {
    const title = node.attrs?.title ? `${node.attrs.title}\n` : '';
    return `${title}${children}\n`;
  }
  if (
    node.type === 'paragraph' ||
    node.type === 'heading' ||
    node.type === 'codeBlock' ||
    node.type === 'listItem'
  ) {
    return `${children}\n`;
  }
  return children;
}

export function issueNumberFromKey(jiraKey) {
  const match = /-(\d+)$/.exec(String(jiraKey || '').trim());
  return match ? Number(match[1]) : null;
}

function normalizeJiraIssue(issue, baseUrl) {
  const fields = issue.fields || {};
  const category = fields.status?.statusCategory?.key;
  const jiraKey = issue.key;
  return {
    id: issue.id || null,
    jiraKey,
    number: issueNumberFromKey(jiraKey),
    title: fields.summary || '',
    url: `${baseUrl}/browse/${jiraKey}`,
    state: category === 'done' ? 'closed' : 'open',
    createdAt: fields.created || null,
    closedAt: fields.resolutiondate || null,
    labels: fields.labels || [],
    marker: parseMarker(adfToText(fields.description), ISSUE_MARKER),
  };
}

function trackedIssueJql({ state, sinceIso }) {
  const clauses = [];
  if (state === 'open') {
    // The label identifies tickets this job opened. The summary phrase also
    // matches a ticket that was copied into Jira before that label existed,
    // so a still-open copy is commented on instead of duplicated.
    clauses.push('statusCategory != Done');
    clauses.push(
      `(labels = "${ISSUE_MARKER}" OR summary ~ "\\"Hermes JS work regression\\"")`,
    );
  } else {
    clauses.push(`labels = "${ISSUE_MARKER}"`);
  }
  if (sinceIso) {
    const date = new Date(sinceIso);
    date.setUTCDate(date.getUTCDate() - 1);
    clauses.push(`created >= "${date.toISOString().slice(0, 10)}"`);
  }
  return `${clauses.join(' AND ')} ORDER BY created DESC`;
}

async function searchJiraIssues({ jira, fetchFn, jql, limit }) {
  const issues = [];
  let nextPageToken;
  while (issues.length < limit) {
    const payload = await jiraRequest({
      jira,
      fetchFn,
      method: 'POST',
      path: '/rest/api/3/search/jql',
      body: {
        jql,
        maxResults: Math.min(100, limit - issues.length),
        fields: SEARCH_FIELDS,
        ...(nextPageToken ? { nextPageToken } : {}),
      },
    });
    const page = payload?.issues || [];
    issues.push(...page);
    if (payload?.isLast || !payload?.nextPageToken || page.length === 0) {
      break;
    }
    nextPageToken = payload.nextPageToken;
  }
  return issues.slice(0, limit);
}

/**
 * Tickets this automation created. The JQL requires the dedupe label. The
 * marker in the description, or the scenario label, identifies the scenario.
 */
export async function listTrackedIssues({
  jira = jiraConfigFromEnv(),
  fetchFn = fetch,
  state = 'open',
  sinceIso = null,
  limit = MAX_TRACKED_ISSUES,
}) {
  if (!jira.configured) {
    throw new Error('JIRA_USER_EMAIL or JIRA_API_TOKEN is not set');
  }
  const issues = await searchJiraIssues({
    jira,
    fetchFn,
    jql: trackedIssueJql({ state, sinceIso }),
    limit,
  });
  return issues
    .map((issue) => normalizeJiraIssue(issue, jira.baseUrl))
    .filter((issue) => issue.jiraKey);
}

function jiraProjectOf(issue) {
  const match = /^([A-Z][A-Z0-9]+)-/.exec(String(issue?.jiraKey || ''));
  return match ? match[1] : null;
}

function createdTimestamp(issue) {
  const timestamp = Date.parse(issue?.createdAt || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * The open ticket for one scenario. The marker key or the scenario label
 * identifies it. A matching title counts only inside `projectKey`, so a
 * copy in another project cannot take the comment. When the owning project
 * has a match, that ticket wins. Otherwise the latest `createdAt` wins.
 * Jira key numbers are per project and are not an order.
 */
export function findOpenIssue(
  issues,
  key,
  { title = null, projectKey = null } = {},
) {
  const label = scenarioIssueLabel(key);
  const matches = (issues || []).filter((issue) => {
    if (issue.state !== 'open') {
      return false;
    }
    if (issue.marker?.key === key || (issue.labels || []).includes(label)) {
      return true;
    }
    return (
      title != null &&
      issue.title === title &&
      projectKey != null &&
      jiraProjectOf(issue) === projectKey
    );
  });
  const inProject = projectKey
    ? matches.filter((issue) => jiraProjectOf(issue) === projectKey)
    : [];
  const candidates = inProject.length > 0 ? inProject : matches;
  candidates.sort(
    (left, right) => createdTimestamp(right) - createdTimestamp(left),
  );
  return candidates[0] || null;
}

export async function createIssue({
  jira,
  fetchFn = fetch,
  title,
  body,
  labels,
  projectKey,
}) {
  const created = await jiraRequest({
    jira,
    fetchFn,
    method: 'POST',
    path: '/rest/api/3/issue',
    body: {
      fields: {
        project: { key: projectKey },
        summary: title,
        issuetype: { name: 'Bug' },
        labels,
        description: markdownToAdf(body),
      },
    },
  });
  if (!created?.key) {
    throw new Error('Jira issue create returned no key');
  }
  return {
    jiraKey: created.key,
    number: issueNumberFromKey(created.key),
    url: `${jira.baseUrl}/browse/${created.key}`,
  };
}

export async function commentOnIssue({ jira, fetchFn = fetch, jiraKey, body }) {
  return jiraRequest({
    jira,
    fetchFn,
    method: 'POST',
    path: `/rest/api/3/issue/${encodeURIComponent(jiraKey)}/comment`,
    body: { body: markdownToAdf(body) },
  });
}

/**
 * `POST /rest/api/3/issue/{key}/attachments`. Jira requires
 * `X-Atlassian-Token: no-check` and a multipart field named `file`.
 */
export async function uploadJiraAttachment({
  jira,
  fetchFn = fetch,
  jiraKey,
  filePath,
}) {
  const name = path.basename(filePath);
  const bytes = fs.readFileSync(filePath);
  const type =
    ATTACHMENT_CONTENT_TYPES[path.extname(name)] || 'application/octet-stream';
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  return jiraRequest({
    jira,
    fetchFn,
    method: 'POST',
    path: `/rest/api/3/issue/${encodeURIComponent(jiraKey)}/attachments`,
    body: form,
    headers: { 'X-Atlassian-Token': 'no-check' },
  });
}

/**
 * `package.json` version at the profiled commit. A missing commit or a GitHub
 * error leaves the field unresolved rather than guessing from the checkout,
 * which may already be ahead of the run.
 */
export function fetchAppVersion({ repo, sha, runGh }) {
  if (!sha || typeof runGh !== 'function') {
    return null;
  }
  try {
    const encoded = runGh([
      'api',
      `repos/${repo}/contents/package.json?ref=${sha}`,
      '--jq',
      '.content',
    ]);
    const parsed = JSON.parse(
      Buffer.from(encoded.replace(/\s+/g, ''), 'base64').toString('utf8'),
    );
    return parsed.version || null;
  } catch (error) {
    console.log(
      `ℹ️ Could not resolve package.json version at ${sha}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

async function syncOne({ jira, fetchFn, tracked, issue, recurrence, attachment }) {
  const existing = findOpenIssue(tracked, issue.key, {
    title: issue.title,
    projectKey: issue.jiraProject,
  });
  if (existing) {
    await commentOnIssue({
      jira,
      fetchFn,
      jiraKey: existing.jiraKey,
      body: recurrence,
    });
    await attachProfile({
      jira,
      fetchFn,
      jiraKey: existing.jiraKey,
      attachment,
    });
    return {
      jiraKey: existing.jiraKey,
      number: existing.number,
      url: existing.url,
      created: false,
    };
  }
  const created = await createIssue({
    jira,
    fetchFn,
    title: issue.title,
    body: issue.body,
    labels: issue.labels,
    projectKey: issue.jiraProject,
  });
  await attachProfile({
    jira,
    fetchFn,
    jiraKey: created.jiraKey,
    attachment,
  });
  return { ...created, created: true };
}

async function attachProfile({ jira, fetchFn, jiraKey, attachment }) {
  if (!attachment?.path || attachment.tooLarge || attachment.error) {
    return;
  }
  try {
    await uploadJiraAttachment({
      jira,
      fetchFn,
      jiraKey,
      filePath: attachment.path,
    });
  } catch (error) {
    console.log(
      `⚠️ Could not attach the Hermes profile to ${jiraKey}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function prepareFindingAttachment({
  finding,
  currentReport,
  outputDirectory,
  byteLimit,
}) {
  const label = displayName(finding.scenario);
  const files = scenarioProfilePaths(currentReport, finding);
  if (files.length === 0) {
    return {
      label,
      error: 'no Hermes .cpuprofile for this scenario was still on disk',
    };
  }
  const directory =
    outputDirectory ||
    fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-attach-'));
  const ownsDirectory = !outputDirectory;
  try {
    const packaged = packageScenarioProfiles({
      finding,
      files,
      outputDirectory: directory,
    });
    const bytes = fs.statSync(packaged).size;
    const prepared = {
      label,
      name: path.basename(packaged),
      bytes,
      path: packaged,
      ownsDirectory,
      directory,
      tooLarge: bytes > byteLimit,
      limitBytes: byteLimit,
    };
    if (prepared.tooLarge) {
      fs.rmSync(packaged, { force: true });
      prepared.path = null;
    }
    return prepared;
  } catch (error) {
    if (ownsDirectory) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
    return {
      label,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function profileAttachmentForBody(prepared, artifactUrl) {
  if (!prepared) {
    return null;
  }
  if (prepared.error) {
    return { label: prepared.label, error: prepared.error };
  }
  if (prepared.tooLarge) {
    return {
      label: prepared.label,
      name: prepared.name,
      bytes: prepared.bytes,
      tooLarge: true,
      limitBytes: prepared.limitBytes,
      url: artifactUrl || null,
    };
  }
  return {
    label: prepared.label,
    name: prepared.name,
    bytes: prepared.bytes,
  };
}

/**
 * Creates or references one Jira ticket per finding and records the outcome
 * on `finding.issue` so the Slack and markdown builders can link it. One
 * failing Jira call is recorded on that finding and does not stop the others.
 * Missing credentials skip creation without failing the caller.
 */
export async function syncProfilingRegressionIssues({
  exception,
  currentReport,
  frames = [],
  aiText = null,
  repo,
  runGh,
  outputDirectory = null,
  fetchFn = fetch,
  jira = jiraConfigFromEnv(),
  attachmentByteLimit = JIRA_ATTACHMENT_BYTES,
}) {
  if (!exception?.meta?.hasFindings) {
    return { issues: [] };
  }
  if (!jira.configured) {
    console.log(
      '⚠️ JIRA_USER_EMAIL or JIRA_API_TOKEN is not set; skipping Jira ticket creation.',
    );
    return { issues: [], skipped: true };
  }
  const appVersion = fetchAppVersion({
    repo,
    sha: currentReport?.meta?.headSha || null,
    runGh,
  });
  let tracked = [];
  try {
    tracked = await listTrackedIssues({ jira, fetchFn, state: 'open' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`⚠️ Could not list open profiling tickets: ${message}`);
    for (const finding of exception.findings) {
      finding.issue = { error: message };
    }
    return { issues: [], error: message };
  }

  const profileDirectory = outputDirectory
    ? path.join(outputDirectory, 'issue-profiles')
    : null;
  const artifactUrl =
    currentReport?.meta?.analysisArtifactsUrl || exception.meta?.runUrl || null;
  const results = [];
  for (const finding of exception.findings) {
    const prepared = prepareFindingAttachment({
      finding,
      currentReport,
      outputDirectory: profileDirectory,
      byteLimit: attachmentByteLimit,
    });
    const issue = buildRegressionIssue({
      finding,
      exception,
      currentReport,
      frames,
      aiText: proposalForFinding(aiText, finding, exception.findings.length),
      appVersion,
      profileAttachment: profileAttachmentForBody(prepared, artifactUrl),
    });
    try {
      const outcome = await syncOne({
        jira,
        fetchFn,
        tracked,
        issue,
        recurrence: buildRecurrenceComment({
          exception,
          finding,
          profileAttachment: profileAttachmentForBody(prepared, artifactUrl),
        }),
        attachment: prepared,
      });
      finding.issue = outcome;
      results.push({
        key: issue.key,
        title: issue.title,
        owner: issue.owner,
        jiraProject: issue.jiraProject,
        ...outcome,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `⚠️ Could not sync the Jira ticket for ${displayName(finding.scenario)}: ${message}`,
      );
      finding.issue = { error: message };
    } finally {
      if (prepared?.ownsDirectory && prepared.directory) {
        fs.rmSync(prepared.directory, { recursive: true, force: true });
      }
    }
  }

  if (outputDirectory) {
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(outputDirectory, 'jira-issues.json'),
      `${JSON.stringify(results, null, 2)}\n`,
    );
  }
  return { issues: results };
}

function inHalfOpenRange(isoDate, sinceIso, untilIso) {
  const timestamp = Date.parse(isoDate);
  return timestamp >= Date.parse(sinceIso) && timestamp < Date.parse(untilIso);
}

async function commentBodies({ jira, fetchFn, jiraKey }) {
  const bodies = [];
  let startAt = 0;
  let total = Number.POSITIVE_INFINITY;
  while (startAt < total) {
    const payload = await jiraRequest({
      jira,
      fetchFn,
      method: 'GET',
      path: `/rest/api/3/issue/${encodeURIComponent(jiraKey)}/comment?startAt=${startAt}&maxResults=100`,
    });
    const comments = payload?.comments || [];
    for (const comment of comments) {
      bodies.push(adfToText(comment.body));
    }
    total = Number(payload?.total ?? startAt + comments.length);
    if (comments.length === 0) {
      break;
    }
    startAt += comments.length;
  }
  return bodies;
}

export async function countRecurrences({ jira, fetchFn = fetch, jiraKey }) {
  const bodies = await commentBodies({ jira, fetchFn, jiraKey });
  return bodies.reduce(
    (total, body) => total + parseRecurrenceMarkers(body).length,
    0,
  );
}

/**
 * Tickets this automation opened during `[sinceIso, untilIso)`, with the
 * detection numbers taken from their marker and how many times each recurred.
 */
export async function listIssuesOpenedInWindow({
  jira = jiraConfigFromEnv(),
  fetchFn = fetch,
  sinceIso,
  untilIso,
}) {
  const tracked = await listTrackedIssues({
    jira,
    fetchFn,
    state: 'all',
    sinceIso,
  });
  const opened = tracked
    .filter(
      (issue) =>
        issue.marker?.key &&
        inHalfOpenRange(issue.createdAt, sinceIso, untilIso),
    )
    .sort(
      (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
    );
  const items = [];
  for (const issue of opened) {
    let recurrences = 0;
    try {
      recurrences = await countRecurrences({
        jira,
        fetchFn,
        jiraKey: issue.jiraKey,
      });
    } catch (error) {
      console.log(
        `⚠️ Could not read comments on ${issue.jiraKey}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    items.push({
      number: issue.number,
      jiraKey: issue.jiraKey,
      title: issue.title,
      url: issue.url,
      state: issue.state,
      createdAt: issue.createdAt,
      closedAt: issue.closedAt,
      kind: issue.marker.kind || 'scenario',
      scenario: issue.marker.scenario || null,
      scenarios: issue.marker.scenarios || [],
      owner: issue.marker.owner || null,
      ratio: issue.marker.ratio ?? issue.marker.maxRatio ?? null,
      jsWorkMs: issue.marker.jsWorkMs ?? null,
      baselineMedianJsWorkMs: issue.marker.baselineMedianJsWorkMs ?? null,
      runId: issue.marker.runId || null,
      recurrences,
    });
  }
  return items;
}

/**
 * One line per ticket for the Monday report. The brief is the detection
 * numbers plus what happened since: still open, closed, and how often the
 * finding came back.
 */
export function weeklyIssueBrief(issue) {
  const recurrence =
    issue.recurrences > 0
      ? `, flagged ${issue.recurrences} more time${issue.recurrences === 1 ? '' : 's'} since`
      : ', not flagged again';
  const state = issue.state === 'open' ? 'open' : 'closed';
  if (issue.kind === 'slow-run') {
    return `slow run ${issue.runId}: ${issue.scenarios.length} scenarios over the threshold (up to ${issue.ratio}×) · ${state}${recurrence}`;
  }
  const [current, baseline] = formatDurationsAlike([
    issue.jsWorkMs,
    issue.baselineMedianJsWorkMs,
  ]);
  return `${issue.scenario} — JS work ${current} vs ${baseline} recent baseline (${issue.ratio}×) in run ${issue.runId} · owner ${issue.owner} · ${state}${recurrence}`;
}
