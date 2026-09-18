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
import {
  renderIncompleteCoverageLine,
  shouldPostAllClear,
} from './flaky-same-sha-history';
import {
  assembleAllClearMarkdown,
  assembleFlakyCommentMarkdown,
  renderFlakyFindingsTable,
  type FlakyTableFile,
} from './flaky-signal-combination';

// Stable HTML comment on the first line — used to identify and update this
// script's own comment across runs. Any change breaks stickiness (a new
// comment will be created and the old one will be orphaned).
const MARKER = '<!-- metamask-flaky-test-detection -->';
// Prefix of the hidden state block appended to the comment body. Stage 1 reads
// this on the next push to determine which files changed since last analysis.
// The state payload is base64-encoded (see buildStateBlock below),
// so base64 alphabet can never contain the `-->` sequence that closes the HTML comment.
const STATE_MARKER = '<!-- metamask-flaky-test-detection-metadata=';
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

interface HistoryFile {
  path: string;
  flaky: boolean;
  sameShaFailThenPass?: number;
  exampleRunUrl?: string;
  runHistoryUrl: string;
}

interface HistoryArtifact {
  windows?: number[];
  analyzedFiles?: string[];
  headSha?: string;
  files?: HistoryFile[];
  historyComplete?: boolean;
  candidatesInspected?: number;
  candidateShaCount?: number;
}

interface Finding {
  file: string;
  line?: number;
  patternId: string;
  patternName: string;
  severity: string;
  snippet?: string;
  explanation: string;
  suggestedFix: string;
  historicalHintUsed: boolean;
}

// Per-file state embedded in the sticky comment body so Stage 1 can determine
// which files changed since they were last analyzed.
interface PerFileState {
  analyzedSha: string;
  findings: Finding[];
  // Whether Stage 2 reviewed the file at analyzedSha. Absent in comments
  // written before this field existed, which reads as "not reviewed" until
  // the file is analyzed again — the safe direction for the Flaky patterns cell.
  patternsReviewed?: boolean;
}

interface CommentState {
  version: number;
  windows: number[];
  files: Record<string, PerFileState>;
}

interface AiAnalysisArtifact {
  // Files the AI actually reviewed this run. Distinguishes "reviewed, no
  // findings" (present here) from "AI did not complete for this file" (absent).
  // The conservative fallback ships `analyzedFiles: []`, so a failed/skipped
  // Stage 2 leaves this empty and prior findings are preserved.
  analyzedFiles?: string[];
  findings?: Finding[];
  confidence?: number;
}

interface Comment {
  id: number;
  body?: string;
}

type CommentAction = 'created' | 'updated' | 'all_clear' | 'none';
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

function readHistoryArtifact(): HistoryArtifact | null {
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf8')) as HistoryArtifact;
  } catch (error) {
    core.setFailed(
      `Failed to parse history artifact: ${(error as Error).message}`,
    );
    return null;
  }
}

const DEFAULT_WINDOWS = [14];

// Serializes per-file state into a hidden HTML comment appended to the comment
// body. Stage 1 reads this on the next push to decide which files need
// re-analysis vs. which can be preserved verbatim. The JSON is base64-encoded
// so an AI finding's snippet/explanation/suggestedFix containing a literal
// `-->` cannot truncate the payload before the real closing delimiter.
function buildStateBlock(state: CommentState): string {
  const encoded = Buffer.from(JSON.stringify(state), 'utf8').toString('base64');
  return `${STATE_MARKER}${encoded} -->`;
}

// Renders the fix as a ```diff fence (snippet lines as `-`, suggestedFix
// lines as `+`) so reviewers see a before/after instead of only the new
// code. This is a whole-block replace rather than a computed line diff:
// the AI's `snippet` isn't guaranteed to line up 1:1 with `suggestedFix`,
// and a mismatched line-level diff would look more broken than helpful.
// Falls back to a plain `ts` block when no snippet was captured.
function buildFixBlock(f: Finding): string {
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
  findings: Finding[],
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

function findingsByFile(findings: Finding[]): Map<string, Finding[]> {
  const byFile = new Map<string, Finding[]>();
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
  headSha,
}: {
  historyFiles: HistoryFile[];
  findings: Finding[];
  patternsReviewedFiles: Set<string>;
  headSha: string;
}): FlakyTableFile[] {
  const findingFiles = new Set(findings.map((finding) => finding.file));
  const byFile = findingsByFile(findings);
  return historyFiles
    .filter((file) => file.flaky || findingFiles.has(file.path))
    .map((file) => ({
      path: file.path,
      hasHistoryHit: file.flaky,
      patternsReviewed: patternsReviewedFiles.has(file.path),
      sameShaFailThenPass: file.sameShaFailThenPass ?? 0,
      exampleRunUrl: file.exampleRunUrl ?? '',
      findings: (byFile.get(file.path) ?? []).map((finding) => ({
        patternId: finding.patternId,
        patternName: finding.patternName,
        severity: finding.severity,
        blobUrl: blobUrl(finding.file, finding.line, headSha),
      })),
    }));
}

function buildCommentBody({
  historyFiles,
  findings,
  patternsReviewedFiles,
  stateBlock,
  headSha,
  coverageLine,
}: {
  historyFiles: HistoryFile[];
  findings: Finding[];
  patternsReviewedFiles: Set<string>;
  stateBlock: string;
  headSha: string;
  coverageLine: string;
}): string {
  return assembleFlakyCommentMarkdown({
    marker: MARKER,
    table: renderFlakyFindingsTable(
      buildTableFiles({
        historyFiles,
        findings,
        patternsReviewedFiles,
        headSha,
      }),
    ),
    diffs: buildSuggestedFixesSection(findings, headSha),
    coverageLine,
    skillLink: SKILL_LINK,
    stateBlock,
  });
}

function buildAllClearBody(stateBlock: string): string {
  return assembleAllClearMarkdown({
    marker: MARKER,
    stateBlock,
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

  // Merge per file (files no longer in modifiedFiles are dropped automatically
  // because historyFiles already represents exactly the current modified set):
  //   - history re-ran AND AI reviewed the file → adopt fresh AI findings even
  //     when empty ("reviewed, all clear" clears previous findings).
  //   - history re-ran but AI did NOT complete for the file (Stage 2 failed /
  //     skipped / conservative fallback) → preserve prior findings so a broken
  //     AI run can't erase them and produce a false "all fixed" comment.
  //   - history did not re-run the file (untouched by this push) → preserve
  //     prior findings verbatim.
  const mergedFindings: Finding[] = [];
  const mergedStateFiles: Record<string, PerFileState> = {};
  // Files whose current content Stage 2 actually reviewed. A file re-analyzed
  // by Stage 1 but missed by Stage 2 loses its prior reviewed state: that
  // review covered an older version of the file.
  const patternsReviewedFiles = new Set<string>();

  for (const histFile of historyFiles) {
    const { path } = histFile;
    const prior = priorState.files[path];
    const priorFindings = (prior?.findings ?? []) as Finding[];

    if (analyzedFiles.has(path) && aiAnalyzedFiles.has(path)) {
      const fresh = freshFindingsByFile.get(path) ?? [];
      mergedFindings.push(...fresh);
      mergedStateFiles[path] = {
        analyzedSha: headSha,
        findings: fresh,
        patternsReviewed: true,
      };
      patternsReviewedFiles.add(path);
    } else {
      const patternsReviewed = analyzedFiles.has(path)
        ? false
        : (prior?.patternsReviewed ?? false);
      mergedFindings.push(...priorFindings);
      mergedStateFiles[path] = {
        analyzedSha: prior?.analyzedSha ?? headSha,
        findings: priorFindings,
        patternsReviewed,
      };
      if (patternsReviewed) patternsReviewedFiles.add(path);
    }
  }

  // Build the state block to embed in the comment for the next run to read.
  const newState: CommentState = {
    version: 1,
    windows,
    files: mergedStateFiles,
  };
  const stateBlock = buildStateBlock(newState);

  // "Has findings" means either signal fired. History alone is enough because
  // the whole point of Stage 1 is to catch flakiness even when Stage 2 was
  // skipped (fork PR / analyzer error / no LLM key).
  const hasFindings =
    historyFiles.some((f) => f.flaky) || mergedFindings.length > 0;
  const historyComplete = history.historyComplete === true;
  const coverageLine = historyComplete
    ? ''
    : `${renderIncompleteCoverageLine({
        candidatesInspected: history.candidatesInspected ?? 0,
        candidateShaCount: history.candidateShaCount ?? 0,
      })}\n`;

  const commentBody = buildCommentBody({
    historyFiles,
    findings: mergedFindings,
    patternsReviewedFiles,
    stateBlock,
    headSha,
    coverageLine,
  });

  try {
    const existingComment = await findExistingStickyComment(
      octokit,
      owner,
      repo,
    );

    // 4-state matrix — order matters because each branch returns early.
    if (!hasFindings && !existingComment) {
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

    if (hasFindings && !existingComment) {
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

    if (hasFindings && existingComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      console.log(
        '🔄 Updated sticky flaky-test-detection comment with latest findings',
      );
      setStage3Outputs({
        commentPosted: true,
        commentAction: 'updated',
        findingCount: mergedFindings.length,
        skipReason: '',
      });
      return;
    }

    // !hasFindings && existingComment. All-clear only when Stage 1 finished
    // its walk; a truncated history must not look like "all fixed".
    if (!shouldPostAllClear(hasFindings, historyComplete)) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment!.id,
        body: commentBody,
      });
      console.log(
        '⚠️  Updated sticky comment — history coverage incomplete; not all-clear',
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
      body: buildAllClearBody(stateBlock),
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
