#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules, no-console */

/**
 * Grounds an optional AI proposal in the files this analyzer already wrote.
 * Merged PRs are only a lookup table: a PR may be named if one of its paths
 * already appears as a hot frame in the profiling report. No other code is
 * evidence.
 */

import fs from 'fs';
import path from 'path';

/** CI is ~25 minutes; at most a handful of PRs land between scheduled runs. */
export const MAX_MERGED_PULLS = 5;
export const MAX_PATCH_CHARS = 1_500;

function displayName(scenario) {
  return String(scenario || '')
    .replace(/__/g, ': ')
    .replace(/_/g, ' ');
}

function scenarioKey(scenario) {
  return `${scenario.projectName}|${scenario.scenario}`;
}

export function normalizeSourcePath(value) {
  if (!value) {
    return null;
  }
  return (
    String(value)
      .replace(/\\/g, '/')
      .replace(/^.*?(app\/)/, 'app/')
      .replace(/^\.\//, '')
      .split('?')[0]
      .trim() || null
  );
}

function frameList(profile) {
  const audit = profile?.skillAudit;
  if (!audit) {
    return [];
  }
  return [...(audit.topSwapsFrames || []), ...(audit.topNonSwapsFrames || [])];
}

/**
 * Hot frames for the flagged scenarios, taken from the per-run report this
 * job just wrote. Names without a path still count as profile evidence;
 * they cannot overlap a PR file.
 */
export function extractProfilingFrames(currentReport, findings) {
  const wanted = new Set(
    (findings || []).map((finding) =>
      scenarioKey({
        projectName: finding.projectName,
        scenario: finding.scenario,
      }),
    ),
  );
  const frames = [];
  for (const scenario of currentReport.scenarios || []) {
    if (!wanted.has(scenarioKey(scenario))) {
      continue;
    }
    for (const profile of scenario.profiles || []) {
      for (const frame of frameList(profile)) {
        if (!frame?.name) {
          continue;
        }
        frames.push({
          scenario: scenario.scenario,
          name: frame.name,
          url: normalizeSourcePath(frame.url),
          line: frame.line ?? null,
          selfMs: Number(frame.selfMs || 0),
        });
      }
    }
  }
  return frames;
}

export function profilingFileSet(frames) {
  return new Set(frames.map((frame) => frame.url).filter(Boolean));
}

function fileOverlapsProfile(filePath, profileFiles) {
  const normalized = normalizeSourcePath(filePath);
  if (!normalized) {
    return false;
  }
  if (profileFiles.has(normalized)) {
    return true;
  }
  for (const profilePath of profileFiles) {
    if (
      profilePath.endsWith(normalized) ||
      normalized.endsWith(profilePath)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Keeps PR files that already appear in the profile. Other files stay out of
 * the briefing so the model cannot "investigate" code the capture never saw.
 */
export function intersectPullsWithProfile(pulls, frames) {
  const profileFiles = profilingFileSet(frames);
  return (pulls || []).map((pull) => {
    const overlappingFiles = (pull.files || []).filter((file) =>
      fileOverlapsProfile(file.path, profileFiles),
    );
    return {
      number: pull.number,
      title: pull.title,
      url: pull.url,
      overlappingFiles,
      overlapped: overlappingFiles.length > 0,
    };
  });
}

function clipPatch(patch) {
  const text = String(patch || '').trim();
  if (text.length <= MAX_PATCH_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_PATCH_CHARS)}\n…`;
}

export function selectMergedPulls(
  pulls,
  sinceIso,
  untilIso,
  limit = MAX_MERGED_PULLS,
) {
  const sinceMs = Date.parse(sinceIso);
  const untilMs = Date.parse(untilIso);
  if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs)) {
    return [];
  }
  return [...(pulls || [])]
    .filter((pull) => {
      const mergedAt = Date.parse(pull.mergedAt);
      return Number.isFinite(mergedAt) && mergedAt > sinceMs && mergedAt <= untilMs;
    })
    .sort(
      (left, right) => Date.parse(right.mergedAt) - Date.parse(left.mergedAt),
    )
    .slice(0, limit);
}

export function listMergedPulls({ repo, runGh, limit = 20 }) {
  return JSON.parse(
    runGh([
      'pr',
      'list',
      '--repo',
      repo,
      '--base',
      'main',
      '--state',
      'merged',
      '--limit',
      String(limit),
      '--json',
      'number,title,url,mergedAt',
    ]) || '[]',
  );
}

export function fetchPullFiles({ repo, number, runGh }) {
  return JSON.parse(
    runGh([
      'api',
      `repos/${repo}/pulls/${number}/files`,
      '--jq',
      '[.[] | {path: .filename, patch: (.patch // "")}]',
    ]) || '[]',
  );
}

export function loadMergedPullsInWindow({
  repo,
  sinceIso,
  untilIso,
  runGh,
  limit = MAX_MERGED_PULLS,
}) {
  const listed = listMergedPulls({ repo, runGh, limit: 20 });
  const selected = selectMergedPulls(listed, sinceIso, untilIso, limit);
  return selected.map((pull) => ({
    ...pull,
    files: fetchPullFiles({ repo, number: pull.number, runGh }),
  }));
}

export const PROPOSAL_SKILL_CANDIDATES = [
  '.claude/skills/mms-profiling-regression-proposal/SKILL.md',
  '.cursor/rules/mms-profiling-regression-proposal/RULE.md',
  '.agents/skills/mms-profiling-regression-proposal/SKILL.md',
];

export function findProposalSkill(repoRoot = process.cwd()) {
  for (const candidate of PROPOSAL_SKILL_CANDIDATES) {
    const fullPath = path.join(repoRoot, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

export function skillMarkdownToSystemPrompt(raw) {
  return String(raw || '')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .trim();
}

export function loadProposalSkillPrompt(repoRoot = process.cwd()) {
  const skillPath = findProposalSkill(repoRoot);
  if (!skillPath) {
    return null;
  }
  return skillMarkdownToSystemPrompt(fs.readFileSync(skillPath, 'utf8'));
}

export function buildRegressionActionsEvidence({
  exception,
  frames,
  pulls,
  previousRunId = null,
  currentSha = null,
  previousSha = null,
}) {
  const overlapped = intersectPullsWithProfile(pulls, frames);
  return {
    runId: exception.meta.runId,
    runUrl: exception.meta.runUrl,
    currentSha,
    previousRunId,
    previousSha,
    findings: exception.findings.map((finding) => ({
      scenario: displayName(finding.scenario),
      owner: finding.owner,
      jsWorkMs: finding.jsWorkMs,
      baselineMedianJsWorkMs: finding.baselineMedianJsWorkMs,
      ratio: finding.ratio,
      baselineRuns: finding.baselineRuns,
    })),
    frames: frames.map((frame) => ({
      scenario: displayName(frame.scenario),
      name: frame.name,
      url: frame.url,
      line: frame.line,
      selfMs: frame.selfMs,
    })),
    pullsOverlappingTheProfile: overlapped
      .filter((pull) => pull.overlapped)
      .map((pull) => ({
        number: pull.number,
        title: pull.title,
        url: pull.url,
        files: pull.overlappingFiles.map((file) => ({
          path: file.path,
          patch: clipPatch(file.patch),
        })),
      })),
    pullsMergedWithNoProfileFile: overlapped
      .filter((pull) => !pull.overlapped)
      .map((pull) => ({
        number: pull.number,
        title: pull.title,
        url: pull.url,
      })),
  };
}

/**
 * User message for the model: Evidence JSON only. Decision rules live in
 * MetaMask/skills `performance/profiling-regression-proposal`.
 */
export function buildRegressionActionsBriefing(args) {
  return JSON.stringify(buildRegressionActionsEvidence(args), null, 2);
}

export function buildRegressionActionsSlack(aiText) {
  const text = String(aiText || '').trim();
  if (!text) {
    return '';
  }
  if (text.startsWith('*AI proposal')) {
    return text;
  }
  return `*AI proposal (profiling evidence only; not a root cause)*\n${text}`;
}

/**
 * After the 1.5× check already flagged a run, optionally ask Claude to relate
 * those hot frames to PRs merged since the previous scheduled run. The model
 * prompt is the installed `mms-profiling-regression-proposal` skill. Failures
 * are swallowed so a missing key or GitHub blip cannot hide the exception.
 */
export async function proposeProfilingGroundedActions({
  exception,
  currentReport,
  previousRun = null,
  currentSha = null,
  previousSha = null,
  repo,
  repoRoot = process.cwd(),
  outputDirectory,
  skipAi = false,
  system = null,
  runGh,
  callClaude,
}) {
  if (!exception?.meta?.hasFindings || skipAi) {
    return null;
  }

  const prompt = system || loadProposalSkillPrompt(repoRoot);
  if (!prompt) {
    console.log(
      'ℹ️ Profiling proposal skipped: mms-profiling-regression-proposal is not installed',
    );
    return null;
  }

  const frames = extractProfilingFrames(currentReport, exception.findings);
  let pulls = [];
  const sinceIso = previousRun?.createdAt;
  const untilIso = currentReport?.meta?.createdAt;
  if (sinceIso && untilIso && typeof runGh === 'function') {
    try {
      pulls = loadMergedPullsInWindow({
        repo,
        sinceIso,
        untilIso,
        runGh,
      });
    } catch (error) {
      console.log(
        `ℹ️ Could not load merged PRs for the profiling proposal: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const briefing = buildRegressionActionsBriefing({
    exception,
    frames,
    pulls,
    previousRunId: previousRun?.databaseId ?? null,
    currentSha,
    previousSha: previousSha || previousRun?.headSha || null,
  });
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outputDirectory, 'ai-briefing.md'),
    `${briefing}\n`,
  );

  let aiText = null;
  try {
    aiText = await callClaude(briefing, { system: prompt });
  } catch (error) {
    console.log(
      `ℹ️ Profiling proposal skipped: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  if (!aiText) {
    return null;
  }

  fs.writeFileSync(path.join(outputDirectory, 'ai-actions.md'), `${aiText}\n`);
  const slack = buildRegressionActionsSlack(aiText);
  fs.writeFileSync(
    path.join(outputDirectory, 'slack-cards.json'),
    `${JSON.stringify([slack], null, 2)}\n`,
  );
  return aiText;
}
