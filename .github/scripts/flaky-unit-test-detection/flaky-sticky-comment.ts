/**
 * Stage 3 — Unified sticky PR comment (MCWP-474).
 *
 * Reads the Stage 1 (deterministic history) and Stage 2 (AI pattern findings)
 * JSON artifacts and posts ONE sticky comment combining both signals. This is
 * the only PR-visible output of the workflow — Stage 2 is deliberately
 * invoked via the analyzer CLI (not the composite action) so it never posts
 * its own comment.
 *
 * The two signals are additive, never exclusive: one table lists File,
 * Past flakyness, and Flaky patterns so a reviewer can scan unfixed flakes
 * (history + pattern), history-only, and patterns this PR introduced.
 *
 * 4-state logic (per MCWP-474 AC):
 *   findings + no sticky  → create
 *   findings + sticky     → update with latest findings
 *   no findings + sticky + history complete → all-clear
 *   no findings + sticky + history incomplete → update with incomplete-coverage line
 *   no findings + none    → do nothing
 *
 * Logging rule:
 *   - core.warning — degraded but still correct (dropped AI finding with a
 *     bad snippet, malformed AI artifact → conservative empty shape).
 *   - core.setFailed — stage cannot do its job (missing token/PR, missing or
 *     malformed history artifact, comment API failure, uncaught exception).
 * Outputs are still written for the Summary. continue-on-error + a final gate
 * make real failures visible; the check is not required so the PR is not blocked.
 */
import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  locateSnippetInSource,
  snippetMismatchPreview,
  sourceSliceAtLine,
} from './flaky-sticky-snippet';
import { findingHasRequiredConstruct } from './flaky-sticky-pattern-gate';
import { UNKNOWN_STALE_DAYS } from './flaky-history-index';
import {
  renderCoverageWindowLine,
  renderInfrastructureFailuresLine,
  renderUnattributedRerunsLine,
} from './flaky-same-sha-history';
import {
  assembleAllClearMarkdown,
  fitCommentBody,
  renderFlakyFindingsTable,
  renderNoFindingsLine,
  resolveUnreviewedReason,
  type AiSkipReason,
  type AnalyzerRunHint,
  type FlakyTableFile,
} from './flaky-signal-combination';
import {
  COMMENT_MARKER as MARKER,
  buildStateBlock,
} from './flaky-comment-state';
import {
  decideCommentAction,
  mergePriorState,
  type CommentAction,
} from './flaky-comment-merge';
import type {
  CommentState,
  CoverageWindow,
  Finding,
  HistoryArtifact,
  HistoryFile,
  StoredFinding,
} from './flaky-types';

// Canonical source of the flaky-test-detection skill. The synced copy at
// .agents/skills/mms-flaky-test-detection/SKILL.md is .gitignore'd, so we link
// to the real source repo (MetaMask/skills) instead of a 404 blob path.
const SKILL_LINK =
  'https://github.com/MetaMask/skills/blob/main/domains/coding/skills/flaky-test-detection/skill.md';

// GITHUB_WORKSPACE is always set in Actions; fall back to process.cwd() so
// the script can also be run locally from any directory.
const WORKSPACE_ROOT = process.env.GITHUB_WORKSPACE ?? process.cwd();
const HISTORY_PATH = join(WORKSPACE_ROOT, '.ai-pr-analyzer/flaky-history.json');
const AI_ANALYSIS_PATH = join(
  WORKSPACE_ROOT,
  '.ai-pr-analyzer/flaky-ai-analysis.json',
);
// Written by Stage 1; contains the per-file state parsed from the prior comment.
const PRIOR_STATE_PATH = join(
  WORKSPACE_ROOT,
  '.ai-pr-analyzer/flaky-prior-state.json',
);

// Stage 1 writes every field, but a Stage 1 that failed mid-way still writes
// what it had, so every read here is defensive.
type ReadHistoryArtifact = Partial<HistoryArtifact> & { windows?: number[] };

interface AiAnalysisArtifact {
  // Files the AI actually reviewed this run. Distinguishes "reviewed, no
  // findings" (present here) from "AI did not complete for this file" (absent).
  // The conservative fallback ships `analyzedFiles: []`, so a failed/skipped
  // Stage 2 leaves this empty and prior findings are preserved.
  analyzedFiles?: string[];
  findings?: Finding[];
  confidence?: number;
  runs?: AnalyzerRunHint[];
  maxFiles?: number;
}

interface Comment {
  id: number;
  body?: string;
}

type Stage3SkipReason =
  | 'missing_token_or_pr'
  | 'history_artifact_missing'
  | 'comment_api_failed'
  | 'stage3_crash'
  | '';

function setStage3Outputs({
  commentPosted,
  commentAction,
  findingCount,
  skipReason,
}: {
  commentPosted: boolean;
  commentAction: CommentAction;
  findingCount: number;
  skipReason: Stage3SkipReason;
}): void {
  core.setOutput('comment_posted', commentPosted ? 'true' : 'false');
  core.setOutput('comment_action', commentAction);
  core.setOutput('finding_count', String(findingCount));
  core.setOutput('skip_reason', skipReason);
}

const env = {
  token: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '',
  repo: process.env.GITHUB_REPOSITORY ?? '',
  prNumber: Number(process.env.PR_NUMBER ?? '0'),
  serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
  headSha: process.env.HEAD_SHA ?? '',
  aiStepOutcome: process.env.FLAKY_AI_STEP_OUTCOME ?? '',
  aiSkipReason: (process.env.FLAKY_AI_SKIP_REASON ?? '') as AiSkipReason,
  runId: process.env.GITHUB_RUN_ID ?? '',
};

/** Blob at `headSha` so snippet links and validation share the same tree. */
function readFileAtHead(relativePath: string, headSha: string): string | null {
  if (!headSha) {
    const sourcePath = join(WORKSPACE_ROOT, relativePath);
    if (!existsSync(sourcePath)) {
      return null;
    }
    return readFileSync(sourcePath, 'utf8');
  }
  try {
    return execFileSync('git', ['show', `${headSha}:${relativePath}`], {
      encoding: 'utf8',
      cwd: WORKSPACE_ROOT,
    });
  } catch {
    return null;
  }
}

// Missing AI / prior-state artifacts use their empty shape so Stage 3 can still
// run (Stage 2 may have been skipped). A malformed history artifact is a Stage
// 1 wiring failure and must fail the step.
function readJsonOrEmpty<T>(path: string, emptyShape: T): T {
  if (!existsSync(path)) return emptyShape;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (error) {
    core.warning(`Failed to parse ${path}: ${(error as Error).message}`);
    return emptyShape;
  }
}

function readHistoryArtifact(): ReadHistoryArtifact | null {
  try {
    return JSON.parse(
      readFileSync(HISTORY_PATH, 'utf8'),
    ) as ReadHistoryArtifact;
  } catch (error) {
    core.setFailed(
      `Failed to parse history artifact: ${(error as Error).message}`,
    );
    return null;
  }
}

const DEFAULT_WINDOWS = [14];

// Renders the fix as a ```diff fence (snippet lines as `-`, suggestedFix
// lines as `+`) so reviewers see a before/after instead of only the new
// code. This is a whole-block replace rather than a computed line diff:
// the AI's `snippet` isn't guaranteed to line up 1:1 with `suggestedFix`,
// and a mismatched line-level diff would look more broken than helpful.
// Falls back to a plain `ts` block when no snippet was captured.
function buildFixBlock(f: StoredFinding): string {
  if (!f.snippet) {
    return `\`\`\`ts\n${f.suggestedFix}\n\`\`\``;
  }
  const removed = f.snippet.split('\n').map((line) => `-${line}`);
  const added = f.suggestedFix.split('\n').map((line) => `+${line}`);
  const diff = [...removed, ...added].join('\n');
  return `\`\`\`diff\n${diff}\n\`\`\``;
}

function blobUrl(
  file: string,
  line: number | undefined,
  headSha: string,
): string {
  if (!headSha) {
    return '';
  }
  const anchor = line ? `#L${line}` : '';
  return `${env.serverUrl}/${env.repo}/blob/${headSha}/${file}${anchor}`;
}

function locationLabel(file: string, line: number | undefined): string {
  return line ? `${file}:${line}` : file;
}

function buildLocationLink(
  file: string,
  line: number | undefined,
  headSha: string,
): string {
  const label = locationLabel(file, line);
  const url = blobUrl(file, line, headSha);
  if (url.length === 0) {
    return `\`${label}\``;
  }
  return `[\`${label}\`](${url})`;
}

function buildSuggestedFixesSection(
  findings: StoredFinding[],
  headSha: string,
): string {
  if (findings.length === 0) {
    return '';
  }
  return findings
    .map(
      (finding) =>
        `${buildLocationLink(finding.file, finding.line, headSha)}\n\n${buildFixBlock(finding)}`,
    )
    .join('\n\n');
}

function workflowRunUrl(): string {
  if (!env.runId || !env.repo) {
    return '';
  }
  return `${env.serverUrl}/${env.repo}/actions/runs/${env.runId}`;
}

function findingsByFile(
  findings: StoredFinding[],
): Map<string, StoredFinding[]> {
  const byFile = new Map<string, StoredFinding[]>();
  for (const finding of findings) {
    const list = byFile.get(finding.file) ?? [];
    list.push(finding);
    byFile.set(finding.file, list);
  }
  return byFile;
}

function buildTableFiles({
  historyFiles,
  findings,
  patternsReviewedFiles,
  staleReviewShaByFile,
  headSha,
  runs,
  maxFiles,
  aiStepOutcome,
  logUrl,
}: {
  historyFiles: HistoryFile[];
  findings: StoredFinding[];
  patternsReviewedFiles: Set<string>;
  staleReviewShaByFile: Map<string, string>;
  headSha: string;
  runs: AnalyzerRunHint[] | undefined;
  maxFiles: number | undefined;
  aiStepOutcome: string;
  logUrl: string;
}): FlakyTableFile[] {
  const findingFiles = new Set(findings.map((finding) => finding.file));
  const byFile = findingsByFile(findings);
  return historyFiles
    .filter((file) => file.flaky || findingFiles.has(file.path))
    .map((file) => {
      const patternsReviewed = patternsReviewedFiles.has(file.path);
      return {
        path: file.path,
        hasHistoryHit: file.flaky,
        patternsReviewed,
        sameShaFailThenPass: file.sameShaFailThenPass,
        exampleRunUrl: file.exampleRunUrl,
        historyPath: file.historyPath,
        findings: (byFile.get(file.path) ?? []).map((finding) => ({
          patternId: finding.patternId,
          patternName: finding.patternName,
          severity: finding.severity,
          blobUrl: blobUrl(finding.file, finding.line, headSha),
        })),
        reviewedAtSha: staleReviewShaByFile.get(file.path),
        unreviewed: resolveUnreviewedReason({
          file: file.path,
          patternsReviewed,
          runs,
          aiStepOutcome,
          aiSkipReason: env.aiSkipReason,
          maxFiles,
          logUrl,
        }),
      };
    });
}

function buildCommentBody({
  historyFiles,
  findings,
  patternsReviewedFiles,
  staleReviewShaByFile,
  stateBlock,
  headSha,
  coverageLine,
  historyAvailable,
  runs,
  maxFiles,
}: {
  historyFiles: HistoryFile[];
  findings: StoredFinding[];
  patternsReviewedFiles: Set<string>;
  staleReviewShaByFile: Map<string, string>;
  stateBlock: string;
  headSha: string;
  coverageLine: string;
  historyAvailable: boolean;
  runs: AnalyzerRunHint[] | undefined;
  maxFiles: number | undefined;
}): string {
  const table = renderFlakyFindingsTable(
    buildTableFiles({
      historyFiles,
      findings,
      patternsReviewedFiles,
      staleReviewShaByFile,
      headSha,
      runs,
      maxFiles,
      aiStepOutcome: env.aiStepOutcome,
      logUrl: workflowRunUrl(),
    }),
  );
  return fitCommentBody({
    marker: MARKER,
    table:
      table.length > 0
        ? table
        : renderNoFindingsLine(historyFiles.length, historyAvailable),
    diffs: buildSuggestedFixesSection(findings, headSha),
    coverageLine,
    skillLink: SKILL_LINK,
    stateBlock,
    runUrl: workflowRunUrl(),
  });
}

const NO_COVERAGE: CoverageWindow = {
  staleDays: UNKNOWN_STALE_DAYS,
  daysCovered: 0,
  gapDays: [],
  oldestDay: '',
  newestDay: '',
  complete: false,
};

/**
 * What the index could and could not see. Missing logs and lost runners are
 * stated here rather than withheld as a reason to refuse all-clear: neither
 * comes back on a re-run, so blocking on them would keep green out of reach.
 */
function buildCoverageDisclosure(
  history: ReadHistoryArtifact,
  hasFindings: boolean,
): string {
  return [
    renderCoverageWindowLine({
      coverage: history.coverage ?? NO_COVERAGE,
      runsScanned: history.indexRunsScanned ?? 0,
      hasFindings,
    }),
    renderUnattributedRerunsLine(
      history.unattributedReruns ?? [],
      env.serverUrl,
      env.repo,
      history.unattributedRerunCount ?? 0,
    ),
    renderInfrastructureFailuresLine(history.infrastructureFailures ?? 0),
  ]
    .filter((line) => line.length > 0)
    .join('\n\n');
}

function buildAllClearBody(stateBlock: string, disclosure: string): string {
  return assembleAllClearMarkdown({
    marker: MARKER,
    stateBlock,
    note: disclosure,
  });
}

async function findExistingStickyComment(
  octokit: ReturnType<typeof getOctokit>,
  owner: string,
  repo: string,
): Promise<Comment | null> {
  // octokit.paginate follows the Link header automatically, so comments on
  // PRs with more than per_page entries are all scanned.
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: env.prNumber,
    per_page: 100,
  });
  return comments.find((c) => c.body?.startsWith(MARKER)) ?? null;
}

async function main(): Promise<void> {
  if (!env.token || !env.repo || !env.prNumber) {
    core.setFailed(
      'Missing token, repo, or PR number — cannot post sticky comment',
    );
    setStage3Outputs({
      commentPosted: false,
      commentAction: 'none',
      findingCount: 0,
      skipReason: 'missing_token_or_pr',
    });
    return;
  }

  if (!existsSync(HISTORY_PATH)) {
    core.setFailed(
      'History artifact missing — Stage 1 did not complete; cannot post sticky comment',
    );
    setStage3Outputs({
      commentPosted: false,
      commentAction: 'none',
      findingCount: 0,
      skipReason: 'history_artifact_missing',
    });
    return;
  }

  const [owner, repo] = env.repo.split('/');
  const octokit = getOctokit(env.token);

  const history = readHistoryArtifact();
  if (history === null) {
    setStage3Outputs({
      commentPosted: false,
      commentAction: 'none',
      findingCount: 0,
      skipReason: 'history_artifact_missing',
    });
    return;
  }
  const aiAnalysis = readJsonOrEmpty<AiAnalysisArtifact>(AI_ANALYSIS_PATH, {
    findings: [],
  });
  const priorState = readJsonOrEmpty<CommentState>(PRIOR_STATE_PATH, {
    version: 1,
    windows: DEFAULT_WINDOWS,
    files: {},
  });

  const historyFiles = Array.isArray(history.files) ? history.files : [];
  const windows = Array.isArray(history.windows)
    ? history.windows
    : DEFAULT_WINDOWS;
  const rawFindings = Array.isArray(aiAnalysis.findings)
    ? aiAnalysis.findings
    : [];
  // Files the deterministic history stage re-ran on this push.
  const analyzedFiles = new Set<string>(
    Array.isArray(history.analyzedFiles) ? history.analyzedFiles : [],
  );
  // Files the AI stage actually reviewed. Empty when Stage 2 failed, was
  // skipped (fork PR / no LLM key), or wrote the conservative fallback — in
  // which case we must NOT treat missing findings as "reviewed, all clear".
  const aiAnalyzedFiles = new Set<string>(
    Array.isArray(aiAnalysis.analyzedFiles) ? aiAnalysis.analyzedFiles : [],
  );
  const headSha =
    typeof history.headSha === 'string' ? history.headSha : env.headSha;

  // Deterministic validation is applied only to fresh AI findings — prior
  // findings were validated when first recorded. The snippet must exist in
  // the current file; the reported line is a hint, not a lock.
  const allowedFiles = new Set(historyFiles.map((f) => f.path));
  const filteredFreshFindings = rawFindings.filter((finding) => {
    if (!allowedFiles.has(finding.file)) {
      core.warning(
        `Dropping out-of-scope AI finding for ${finding.file} (not in the modified unit test file list)`,
      );
      return false;
    }

    if (
      !Number.isInteger(finding.line) ||
      finding.line === undefined ||
      finding.line < 1 ||
      typeof finding.snippet !== 'string' ||
      finding.snippet.length === 0
    ) {
      core.warning(
        `Dropping AI finding for ${finding.file}: a 1-based line and non-empty exact snippet are required`,
      );
      return false;
    }

    const source = readFileAtHead(finding.file, headSha);
    if (source === null) {
      core.warning(
        `Dropping AI finding for ${finding.file}: analyzed file is unavailable`,
      );
      return false;
    }
    const match = locateSnippetInSource(source, finding.snippet, finding.line);
    if (!match) {
      const snippetLineCount = finding.snippet
        .replace(/(?:\r?\n)+$/, '')
        .split(/\r?\n/).length;
      const actualAtLine = sourceSliceAtLine(
        source,
        finding.line,
        snippetLineCount,
      );
      core.warning(
        `Dropping AI finding for ${finding.file}:${finding.line}: reported snippet does not match HEAD. ${snippetMismatchPreview(finding.snippet, actualAtLine)}`,
      );
      return false;
    }

    // Point the sticky comment at the code that actually matched, which may
    // be a nearby line when the model quoted the inner statement.
    finding.line = match.line;
    finding.snippet = match.sourceSnippet;

    const gate = findingHasRequiredConstruct({
      patternId: finding.patternId,
      snippet: match.sourceSnippet,
      source,
    });
    if (!gate.ok) {
      core.warning(
        `Dropping AI finding for ${finding.file}:${match.line}: ${gate.reason}`,
      );
      return false;
    }

    return true;
  });

  // Index fresh AI findings by file for O(1) lookup during merge.
  const freshFindingsByFile = new Map<string, Finding[]>();
  for (const finding of filteredFreshFindings) {
    const list = freshFindingsByFile.get(finding.file) ?? [];
    list.push(finding);
    freshFindingsByFile.set(finding.file, list);
  }

  // Files no longer modified by the PR drop out on their own: historyFiles is
  // exactly the current modified set.
  const merged = mergePriorState({
    historyFiles,
    priorState,
    analyzedFiles,
    aiAnalyzedFiles,
    freshFindingsByFile,
    headSha,
    readFileAtHead: (path) => readFileAtHead(path, headSha),
    onDroppedFinding: (message) => core.info(message),
  });
  const mergedFindings = merged.findings;
  const patternsReviewedFiles = merged.patternsReviewedFiles;

  // Build the state block to embed in the comment for the next run to read.
  const newState: CommentState = {
    version: 1,
    windows,
    files: merged.stateFiles,
  };
  const stateBlock = buildStateBlock(newState);

  // "Has findings" means either signal fired. History alone is enough because
  // the whole point of Stage 1 is to catch flakiness even when Stage 2 was
  // skipped (fork PR / analyzer error / no LLM key).
  const hasFindings =
    historyFiles.some((f) => f.flaky) || mergedFindings.length > 0;
  const historyComplete = history.historyComplete === true;
  const coverageLine = buildCoverageDisclosure(history, hasFindings);

  const commentBody = buildCommentBody({
    historyFiles,
    findings: mergedFindings,
    patternsReviewedFiles,
    staleReviewShaByFile: merged.staleReviewShaByFile,
    stateBlock,
    headSha,
    coverageLine,
    historyAvailable: (history.coverage ?? NO_COVERAGE).daysCovered > 0,
    runs: Array.isArray(aiAnalysis.runs) ? aiAnalysis.runs : undefined,
    maxFiles:
      typeof aiAnalysis.maxFiles === 'number' ? aiAnalysis.maxFiles : undefined,
  });

  try {
    const existingComment = await findExistingStickyComment(
      octokit,
      owner,
      repo,
    );

    const action = decideCommentAction({
      hasFindings,
      hasExistingComment: existingComment !== null,
      historyComplete,
    });

    if (action === 'none') {
      console.log(
        '✅ No findings and no existing sticky comment — nothing to do',
      );
      setStage3Outputs({
        commentPosted: false,
        commentAction: 'none',
        findingCount: mergedFindings.length,
        skipReason: '',
      });
      return;
    }

    if (action === 'created') {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: env.prNumber,
        body: commentBody,
      });
      console.log('📝 Created sticky flaky-test-detection comment');
      setStage3Outputs({
        commentPosted: true,
        commentAction: 'created',
        findingCount: mergedFindings.length,
        skipReason: '',
      });
      return;
    }

    if (action === 'updated') {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment!.id,
        body: commentBody,
      });
      console.log(
        hasFindings
          ? '🔄 Updated sticky flaky-test-detection comment with latest findings'
          : '⚠️  Updated sticky comment — history coverage incomplete; not all-clear',
      );
      setStage3Outputs({
        commentPosted: true,
        commentAction: 'updated',
        findingCount: mergedFindings.length,
        skipReason: '',
      });
      return;
    }

    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment!.id,
      body: buildAllClearBody(stateBlock, coverageLine),
    });
    console.log(
      '🎉 Updated sticky comment — all previously flagged issues are fixed',
    );
    setStage3Outputs({
      commentPosted: true,
      commentAction: 'all_clear',
      findingCount: 0,
      skipReason: '',
    });
  } catch (error) {
    core.setFailed(
      `Failed to manage sticky comment: ${(error as Error).message}`,
    );
    setStage3Outputs({
      commentPosted: false,
      commentAction: 'none',
      findingCount: 0,
      skipReason: 'comment_api_failed',
    });
  }
}

main().catch((error: Error) => {
  core.setFailed(`Stage 3 failed: ${error.message}`);
  setStage3Outputs({
    commentPosted: false,
    commentAction: 'none',
    findingCount: 0,
    skipReason: 'stage3_crash',
  });
});
