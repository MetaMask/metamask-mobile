#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules, no-console */

/**
 * GitHub issues for scheduled Hermes CPU-profile findings.
 *
 * One finding (a scenario over 1.5× its recent median) becomes one issue that
 * follows `.github/ISSUE_TEMPLATE/bug-report.yml`, labelled for the owning
 * team. A finding that recurs while its issue is still open is recorded as a
 * comment on that issue instead of a new one. Several scenarios crossing in
 * the same run each get their own issue.
 *
 * Every issue and recurrence comment carries a machine-readable HTML marker so
 * the Monday report can list what was opened during the week without parsing
 * prose. The scenario's Hermes `.cpuprofile` (zipped when the capture has
 * several segments or a symbolicated copy) is uploaded onto the issue.
 */

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
/** GitHub issue attachments: 25 MB for files other than images and video. */
export const GITHUB_ATTACHMENT_BYTES = 25 * 1024 * 1024;
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
  const match = new RegExp(`<!-- ${kind} (\\{.*?\\}) -->`).exec(
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
  const pattern = new RegExp(`<!-- ${RECURRENCE_MARKER} (\\{.*?\\}) -->`, 'g');
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
 * One file to attach. A single raw capture stays a `.cpuprofile`, which
 * GitHub renders as a profiling file. Several segments, or a raw capture
 * plus its symbolicated copy, become one zip.
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

/**
 * Uploads one file to the repository's issue-attachment store and returns
 * the URL GitHub gives back. Same store a drag-and-drop into an issue uses.
 */
export function uploadGitHubAttachment({ filePath, repositoryId, runGh }) {
  const stat = fs.statSync(filePath);
  const name = path.basename(filePath);
  if (stat.size > GITHUB_ATTACHMENT_BYTES) {
    throw new Error(
      `${name} is ${(stat.size / (1024 * 1024)).toFixed(1)} MB and GitHub issue attachments are limited to 25 MB`,
    );
  }
  const contentType =
    ATTACHMENT_CONTENT_TYPES[path.extname(name)] || 'application/octet-stream';
  const endpoint = [
    'https://uploads.github.com/user-attachments/assets',
    `?repository_id=${encodeURIComponent(repositoryId)}`,
    `&name=${encodeURIComponent(name)}`,
    `&content_type=${encodeURIComponent(contentType)}`,
  ].join('');
  const response = JSON.parse(
    runGh([
      'api',
      '--method',
      'POST',
      '-H',
      `Content-Type: ${contentType}`,
      '--input',
      filePath,
      endpoint,
    ]) || '{}',
  );
  if (!response.url) {
    throw new Error(`attachment upload returned no url for ${name}`);
  }
  return { url: response.url, name, bytes: stat.size };
}

function attachmentMarkdown(attachment, label = null) {
  if (!attachment) {
    return null;
  }
  const prefix = label ? `**${label}:** ` : '';
  if (attachment.error) {
    return `${prefix}Hermes CPU profile not attached: ${attachment.error}.`;
  }
  return `${prefix}Hermes CPU profile: [${attachment.name}](${attachment.url})`;
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

function issueLabels(team) {
  return team.githubLabel ? [...BASE_LABELS, team.githubLabel] : [...BASE_LABELS];
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
    `JS work: ${formatMs(finding.jsWorkMs)} (${current}) vs ${formatMs(finding.baselineMedianJsWorkMs)} (${baseline}) recent median`,
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

function additionalContextLines({ exception, currentReport, aiText }) {
  const lines = [
    `- Performance run: ${exception.meta.runUrl}`,
    `- Baseline: median of the previous ${exception.meta.baselinePreviousRuns} scheduled runs (~6h and ~12h before), ${exception.meta.baselineRunCount} collected`,
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
    '- Opened automatically by the `Analyze App Profiling` workflow after a scheduled performance run. Recurrences while this issue is open are added as comments instead of new issues.',
  );
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
  const [current, baseline] = formatDurationsAlike([
    finding.jsWorkMs,
    finding.baselineMedianJsWorkMs,
  ]);
  const headSha = currentReport?.meta?.headSha || null;
  const top = topFramesForScenario(frames, finding.scenario);
  const body = [
    '### Describe the bug',
    '',
    `The scheduled Hermes CPU-profile check flagged **${scenario}** in performance run [${exception.meta.runId}](${exception.meta.runUrl}): sampled JS work was **${current}** against a **${baseline}** median of the previous ${finding.baselineRuns} scheduled runs (**${finding.ratio}×**, threshold ${exception.meta.thresholdRatio}×).`,
    '',
    ownerLine(team),
    '',
    '### Expected behavior',
    '',
    `JS work for **${scenario}** stays within ${exception.meta.thresholdRatio}× of its recent median across scheduled runs on \`main\`.`,
    '',
    '### Screenshots/Recordings',
    '',
    ...recordingsLines(currentReport, profileAttachment),
    '',
    '### Steps to reproduce',
    '',
    `1. Open the performance run [${exception.meta.runId}](${exception.meta.runUrl}) and download the Hermes CPU profiles for **${scenario}**.`,
    '2. Run Actions → Analyze App Profiling with `run_id` set to that run to rebuild the per-scenario report.',
    `3. Compare the scenario's JS work with the previous two scheduled runs; it exceeds ${exception.meta.thresholdRatio}× their median.`,
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
    `BrowserStack device of the scheduled performance suite (project \`${finding.projectName}\`)`,
    '',
    '### Operating system',
    '',
    operatingSystem(finding.projectName),
    '',
    '### Additional context',
    '',
    ...additionalContextLines({ exception, currentReport, aiText }),
    '',
    '### Severity',
    '',
    'To be assessed by the owning team. Hermes sampling only; one scheduled run is one sample per scenario.',
    '',
    encodeMarker(ISSUE_MARKER, {
      key: findingKey(finding),
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
    key: findingKey(finding),
    title: `${ISSUE_TITLE_PREFIX} — ${scenario}`,
    body,
    labels: issueLabels(team),
    owner: team.handle,
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
    `Flagged again in performance run [${exception.meta.runId}](${exception.meta.runUrl}): JS work ${current} vs ${baseline} recent median (${finding.ratio}× across ${finding.baselineRuns} baseline runs).`,
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

export function issueNumberFromUrl(url) {
  const match = /\/issues\/(\d+)\s*$/.exec(String(url || '').trim());
  return match ? Number(match[1]) : null;
}

/**
 * Open issues this automation created, keyed by their finding. The search
 * narrows on the marker word; the exact marker is what identifies an issue,
 * so a hand-written issue that merely mentions the word is ignored.
 */
export function listTrackedIssues({
  repo,
  runGh,
  state = 'open',
  search = '',
  limit = MAX_TRACKED_ISSUES,
}) {
  const query = [`${ISSUE_MARKER} in:body`, search].filter(Boolean).join(' ');
  const listed = JSON.parse(
    runGh([
      'issue',
      'list',
      '--repo',
      repo,
      '--state',
      state,
      '--search',
      query,
      '--limit',
      String(limit),
      '--json',
      'number,title,url,state,createdAt,closedAt,body,labels',
    ]) || '[]',
  );
  return listed
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      url: issue.url,
      state: String(issue.state || '').toLowerCase(),
      createdAt: issue.createdAt,
      closedAt: issue.closedAt || null,
      labels: (issue.labels || []).map((label) => label.name),
      marker: parseMarker(issue.body, ISSUE_MARKER),
    }))
    .filter((issue) => issue.marker?.key);
}

export function findOpenIssue(issues, key) {
  return (
    issues
      .filter((issue) => issue.marker.key === key && issue.state === 'open')
      .sort((left, right) => right.number - left.number)[0] || null
  );
}

function withBodyFile(body, callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-issue-'));
  const bodyPath = path.join(directory, 'body.md');
  fs.writeFileSync(bodyPath, body);
  try {
    return callback(bodyPath);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

export function createIssue({ repo, runGh, title, body, labels }) {
  const url = withBodyFile(body, (bodyPath) =>
    runGh([
      'issue',
      'create',
      '--repo',
      repo,
      '--title',
      title,
      '--body-file',
      bodyPath,
      ...labels.flatMap((label) => ['--label', label]),
    ]),
  ).trim();
  return { url, number: issueNumberFromUrl(url) };
}

export function commentOnIssue({ repo, runGh, number, body }) {
  return withBodyFile(body, (bodyPath) =>
    runGh([
      'issue',
      'comment',
      String(number),
      '--repo',
      repo,
      '--body-file',
      bodyPath,
    ]),
  );
}

/**
 * `package.json` version at the profiled commit. A missing commit or a GitHub
 * error leaves the field unresolved rather than guessing from the checkout,
 * which may already be ahead of the run.
 */
export function fetchAppVersion({ repo, sha, runGh }) {
  if (!sha) {
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

/**
 * An open issue for the same finding is referenced (and told about the new
 * run); otherwise a new one is opened. A closed issue is history: the finding
 * coming back after a fix is a new issue.
 */
function syncOne({ repo, runGh, tracked, issue, recurrence }) {
  const existing = findOpenIssue(tracked, issue.key);
  if (existing) {
    commentOnIssue({ repo, runGh, number: existing.number, body: recurrence });
    return { number: existing.number, url: existing.url, created: false };
  }
  const created = createIssue({
    repo,
    runGh,
    title: issue.title,
    body: issue.body,
    labels: issue.labels,
  });
  return { number: created.number, url: created.url, created: true };
}

function repositoryNumericId(repo, runGh) {
  return runGh(['api', `repos/${repo}`, '--jq', '.id']).trim();
}

/**
 * Uploads the Hermes capture for one finding. A missing file or a rejected
 * upload is reported on the issue; it does not stop the issue itself.
 */
function attachFindingProfile({
  finding,
  currentReport,
  repositoryId,
  runGh,
  outputDirectory,
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
    return {
      label,
      ...uploadGitHubAttachment({
        filePath: packaged,
        repositoryId,
        runGh,
      }),
    };
  } catch (error) {
    return {
      label,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (ownsDirectory) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
}

function attachFindingProfiles({
  findings,
  currentReport,
  repo,
  runGh,
  outputDirectory,
}) {
  const withFiles = findings.filter(
    (finding) => scenarioProfilePaths(currentReport, finding).length > 0,
  );
  let repositoryId = null;
  let repositoryIdError = null;
  if (withFiles.length > 0) {
    try {
      repositoryId = repositoryNumericId(repo, runGh);
    } catch (error) {
      repositoryIdError =
        error instanceof Error ? error.message : String(error);
      console.log(
        `ℹ️ Could not resolve the repository id for the profile upload: ${repositoryIdError}`,
      );
    }
  }
  const directory = outputDirectory
    ? path.join(outputDirectory, 'issue-profiles')
    : null;
  return findings.map((finding) => {
    if (repositoryIdError && scenarioProfilePaths(currentReport, finding).length > 0) {
      return {
        label: displayName(finding.scenario),
        error: repositoryIdError,
      };
    }
    return attachFindingProfile({
      finding,
      currentReport,
      repositoryId,
      runGh,
      outputDirectory: directory,
    });
  });
}

/**
 * Creates or references one issue per finding and records the outcome on
 * `finding.issue` so the Slack and markdown builders can link it. Several
 * findings in one run each get their own issue. One failing GitHub call is
 * recorded on that finding and does not stop the others.
 */
export function syncProfilingRegressionIssues({
  exception,
  currentReport,
  frames = [],
  aiText = null,
  repo,
  runGh,
  outputDirectory = null,
}) {
  if (!exception?.meta?.hasFindings) {
    return { issues: [] };
  }
  const appVersion = fetchAppVersion({
    repo,
    sha: currentReport?.meta?.headSha || null,
    runGh,
  });
  let tracked = [];
  try {
    tracked = listTrackedIssues({ repo, runGh, state: 'open' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`ℹ️ Could not list open profiling issues: ${message}`);
    for (const finding of exception.findings) {
      finding.issue = { error: message };
    }
    return { issues: [], error: message };
  }

  const attachments = attachFindingProfiles({
    findings: exception.findings,
    currentReport,
    repo,
    runGh,
    outputDirectory,
  });
  const results = [];
  for (const [index, finding] of exception.findings.entries()) {
    const profileAttachment = attachments[index];
    const issue = buildRegressionIssue({
      finding,
      exception,
      currentReport,
      frames,
      aiText,
      appVersion,
      profileAttachment,
    });
    try {
      const outcome = syncOne({
        repo,
        runGh,
        tracked,
        issue,
        recurrence: buildRecurrenceComment({
          exception,
          finding,
          profileAttachment,
        }),
      });
      finding.issue = outcome;
      results.push({
        key: issue.key,
        title: issue.title,
        owner: issue.owner,
        ...outcome,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `ℹ️ Could not sync the issue for ${displayName(finding.scenario)}: ${message}`,
      );
      finding.issue = { error: message };
    }
  }

  if (outputDirectory) {
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(outputDirectory, 'github-issues.json'),
      `${JSON.stringify(results, null, 2)}\n`,
    );
  }
  return { issues: results };
}

function inHalfOpenRange(isoDate, sinceIso, untilIso) {
  const timestamp = Date.parse(isoDate);
  return timestamp >= Date.parse(sinceIso) && timestamp < Date.parse(untilIso);
}

export function countRecurrences({ repo, runGh, number }) {
  const bodies = JSON.parse(
    runGh([
      'issue',
      'view',
      String(number),
      '--repo',
      repo,
      '--json',
      'comments',
      '--jq',
      '[.comments[].body]',
    ]) || '[]',
  );
  return bodies.reduce(
    (total, body) => total + parseRecurrenceMarkers(body).length,
    0,
  );
}

/**
 * Issues this automation opened during `[sinceIso, untilIso)`, with the
 * detection numbers taken from their marker and how many times each recurred.
 */
export function listIssuesOpenedInWindow({ repo, runGh, sinceIso, untilIso }) {
  const tracked = listTrackedIssues({
    repo,
    runGh,
    state: 'all',
    search: `created:>=${sinceIso.slice(0, 10)}`,
  });
  return tracked
    .filter((issue) => inHalfOpenRange(issue.createdAt, sinceIso, untilIso))
    .map((issue) => ({
      number: issue.number,
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
      recurrences: countRecurrences({ repo, runGh, number: issue.number }),
    }))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

/**
 * One line per issue for the Monday report. The brief is the detection
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
  return `${issue.scenario} — JS work ${current} vs ${baseline} recent median (${issue.ratio}×) in run ${issue.runId} · owner ${issue.owner} · ${state}${recurrence}`;
}
