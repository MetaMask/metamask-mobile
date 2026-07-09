/**
 * Stage 3 — Unified sticky PR comment (MCWP-474).
 *
 * Reads the Stage 1 (deterministic history) and Stage 2 (AI pattern findings)
 * JSON artifacts and posts ONE sticky comment combining both signals. This is
 * the only PR-visible output of the workflow — Stage 2 is deliberately
 * invoked via the analyzer CLI (not the composite action) so it never posts
 * its own comment.
 *
 * 4-state logic (per MCWP-474 AC):
 *   findings + no sticky  → create
 *   findings + sticky     → update with latest findings
 *   no findings + sticky  → update to "all previously flagged issues fixed"
 *   no findings + none    → do nothing
 *
 * Never fails the job — GitHub API errors are downgraded to warnings so the
 * check stays informational-only.
 */
import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Stable HTML comment on the first line — used to identify and update this
// script's own comment across runs. Any change breaks stickiness (a new
// comment will be created and the old one will be orphaned).
const MARKER = '<!-- metamask-flaky-test-detection -->';
// Prefix of the hidden state block appended to the comment body. Stage 1 reads
// this on the next push to determine which files changed since last analysis.
const STATE_MARKER = '<!-- metamask-flaky-test-detection:state';
// Canonical source of the flaky-test-detection skill. The synced copy at
// .agents/skills/mms-flaky-test-detection/SKILL.md is .gitignore'd, so we link
// to the real source repo (MetaMask/skills) instead of a 404 blob path.
const SKILL_LINK =
  'https://github.com/MetaMask/skills/blob/main/domains/coding/skills/flaky-test-detection/skill.md';

// GITHUB_WORKSPACE is always set in Actions; fall back to process.cwd() so
// the script can also be run locally from any directory.
const WORKSPACE_ROOT = process.env.GITHUB_WORKSPACE ?? process.cwd();
const HISTORY_PATH = join(WORKSPACE_ROOT, '.ai-pr-analyzer/flaky-history.json');
const AI_ANALYSIS_PATH = join(WORKSPACE_ROOT, '.ai-pr-analyzer/flaky-ai-analysis.json');
// Written by Stage 1; contains the per-file state parsed from the prior comment.
const PRIOR_STATE_PATH = join(WORKSPACE_ROOT, '.ai-pr-analyzer/flaky-prior-state.json');

// Failure counts bucketed by lookback window (nested: a failure in 7d also
// counts in 30d). Kept as a permissive Record so a future window edit in
// Stage 1 doesn't require a matching type change here.
type WindowCounts = Record<string, number>;

interface HistoryFile {
  path: string;
  failures: WindowCounts;
  flaky: boolean;
  runHistoryUrl: string;
}

interface HistoryArtifact {
  windows?: number[];
  // Denominator per window, shared across files (how many countable runs fell
  // in each window). Used to render `failures/runs` cells.
  runsSampled?: WindowCounts;
  // Files re-analyzed in this run (subset of the full modified-file set).
  analyzedFiles?: string[];
  // HEAD SHA at which this analysis was run.
  headSha?: string;
  files?: HistoryFile[];
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
}

interface CommentState {
  version: number;
  windows: number[];
  files: Record<string, PerFileState>;
}

interface AiAnalysisArtifact {
  findings?: Finding[];
}

interface Comment {
  id: number;
  body?: string;
}

const env = {
  token: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? '',
  repo: process.env.GITHUB_REPOSITORY ?? '',
  prNumber: Number(process.env.PR_NUMBER ?? '0'),
  serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
  headSha: process.env.HEAD_SHA ?? '',
};

// Missing/malformed artifacts are treated as their empty shape rather than a
// hard error: Stage 2 may have been skipped (no unit tests changed, or a fork
// PR without secrets), and we still want Stage 3 to reason about whatever
// artifacts DO exist so the all-clear path can fire.
function readJsonOrEmpty<T>(path: string, emptyShape: T): T {
  if (!existsSync(path)) return emptyShape;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (error) {
    core.warning(`Failed to parse ${path}: ${(error as Error).message}`);
    return emptyShape;
  }
}

// Fallback window set used only if the Stage 1 artifact predates the `windows`
// field; the live artifact always supplies its own list.
const DEFAULT_WINDOWS = [7, 15, 30];

// Serializes per-file state into a hidden HTML comment appended to the comment
// body. Stage 1 reads this on the next push to decide which files need
// re-analysis vs. which can be preserved verbatim.
function buildStateBlock(state: CommentState): string {
  return `${STATE_MARKER} ${JSON.stringify(state)} -->`;
}

// Builds the table (or an empty-state fallback line) for the "Run history
// flaky detection" section. tableFiles is the union of historically-flaky
// files and files carrying an AI finding — see buildCommentBody — so an
// empty list here only happens if that union itself is empty, which is a
// rare safety fallback rather than the common case.
function buildHistoryTable(
  tableFiles: HistoryFile[],
  windows: number[],
  runsSampled: WindowCounts,
): string {
  if (tableFiles.length === 0) {
    const windowKeys = windows.map((d) => `${d}d`);
    const noRunsSampled = windowKeys.every((key) => !runsSampled[key]);
    return noRunsSampled
      ? 'No previous run to analyse for these tests.'
      : 'No historical failures found for the changed tests in the sampled runs.';
  }
  const windowKeys = windows.map((d) => `${d}d`);
  const header = `| File | ${windowKeys.join(' | ')} |`;
  const divider = `|---|${windowKeys.map(() => '---|').join('')}`;
  const rows = tableFiles
    .map((f) => {
      // `failures/runs` — failures for the file over the number of countable
      // runs sampled in that window.
      const cells = windowKeys
        .map((key) => `${f.failures[key] ?? 0}/${runsSampled[key] ?? 0}`)
        .join(' | ');
      return `| \`${f.path}\` | ${cells} |`;
    })
    .join('\n');
  return `Failures / runs sampled per window:\n\n${header}\n${divider}\n${rows}\n`;
}

// Every line of a fenced code block nested inside a list item must carry the
// same 4-space indent, or Markdown treats it as outside the list and the
// fence collapses.
function indentBlock(text: string): string {
  return text
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
}

// Renders the fix as a ```diff fence (snippet lines as `-`, suggestedFix
// lines as `+`) so reviewers see a before/after instead of only the new
// code. This is a whole-block replace rather than a computed line diff:
// the AI's `snippet` isn't guaranteed to line up 1:1 with `suggestedFix`,
// and a mismatched line-level diff would look more broken than helpful.
// Falls back to a plain `ts` block when no snippet was captured.
function buildFixBlock(f: Finding): string {
  if (!f.snippet) {
    return `    \`\`\`ts\n${indentBlock(f.suggestedFix)}\n    \`\`\``;
  }
  const removed = f.snippet.split('\n').map((line) => `-${line}`);
  const added = f.suggestedFix.split('\n').map((line) => `+${line}`);
  const diff = [...removed, ...added].join('\n');
  return `    \`\`\`diff\n${indentBlock(diff)}\n    \`\`\``;
}

// file#L<line> anchor pointing at the analyzed SHA so the link stays valid
// even after later pushes move the head.
function buildLocationLink(file: string, line: number | undefined, headSha: string): string {
  const label = line ? `${file}:${line}` : file;
  if (!headSha) return `\`${label}\``;
  const anchor = line ? `#L${line}` : '';
  const url = `${env.serverUrl}/${env.repo}/blob/${headSha}/${file}${anchor}`;
  return `[\`${label}\`](${url})`;
}

function buildFindingsSection(findings: Finding[], headSha: string): string {
  if (findings.length === 0) return '';
  const byFile = new Map<string, Finding[]>();
  for (const finding of findings) {
    if (!byFile.has(finding.file)) byFile.set(finding.file, []);
    byFile.get(finding.file)?.push(finding);
  }

  let out = '### AI-detected flaky patterns\n\n';
  for (const [file, fileFindings] of byFile) {
    out += `#### \`${file}\`\n\n`;
    for (const f of fileFindings) {
      const hint = f.historicalHintUsed ? ' _(matches historical failure signal)_' : '';
      out += `- **${f.patternId} — ${f.patternName}** (${f.severity})${hint}\n`;
      out += `  - ${f.explanation}\n`;
      const location = buildLocationLink(f.file, f.line, headSha);
      out += `  - Suggested fix in ${location}:\n${buildFixBlock(f)}\n`;
    }
    out += '\n';
  }
  return out;
}

function buildCommentBody({
  historyFiles,
  findings,
  runHistoryUrl,
  windows,
  runsSampled,
  stateBlock,
  headSha,
}: {
  historyFiles: HistoryFile[];
  findings: Finding[];
  runHistoryUrl: string;
  windows: number[];
  runsSampled: WindowCounts;
  stateBlock: string;
  headSha: string;
}): string {
  // A file surfaces in the run-history table if it's historically flaky OR
  // an AI finding calls it out — otherwise an AI-only finding (zero
  // historical failures) would make the table disappear even though the
  // finding itself renders.
  const findingFiles = new Set(findings.map((f) => f.file));
  const tableFiles = historyFiles.filter((f) => f.flaky || findingFiles.has(f.path));
  const historyTable = buildHistoryTable(tableFiles, windows, runsSampled);
  const findingsSection = buildFindingsSection(findings, headSha);

  return `${MARKER}
## 🧪 Flaky unit test detection

### Run history flaky detection

[View recent run history](${runHistoryUrl})

Historical failure rate is a hint, not proof — review each suggestion in context. See the [flaky-test-detection skill](${SKILL_LINK}) for the full pattern reference and manual audit workflow.

${historyTable}

${findingsSection}
_This check is informational only and does not block merging._
${stateBlock}`;
}

function buildAllClearBody(runHistoryUrl: string, stateBlock: string): string {
  return `${MARKER}
## 🧪 Flaky unit test detection

✅ All previously detected unit test flakiness issues in this PR have been fixed.

[View recent run history](${runHistoryUrl})

_This check is informational only and does not block merging._
${stateBlock}`;
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
    console.log('⏭️  Missing token/repo/PR number — skipping sticky comment');
    return;
  }

  const [owner, repo] = env.repo.split('/');
  const octokit = getOctokit(env.token);

  const history = readJsonOrEmpty<HistoryArtifact>(HISTORY_PATH, { files: [] });
  const aiAnalysis = readJsonOrEmpty<AiAnalysisArtifact>(AI_ANALYSIS_PATH, { findings: [] });
  const priorState = readJsonOrEmpty<CommentState>(PRIOR_STATE_PATH, {
    version: 1,
    windows: DEFAULT_WINDOWS,
    files: {},
  });

  const historyFiles = Array.isArray(history.files) ? history.files : [];
  const windows = Array.isArray(history.windows) ? history.windows : DEFAULT_WINDOWS;
  const runsSampled = history.runsSampled ?? {};
  const rawFindings = Array.isArray(aiAnalysis.findings) ? aiAnalysis.findings : [];
  const analyzedFiles = new Set<string>(Array.isArray(history.analyzedFiles) ? history.analyzedFiles : []);
  const headSha = typeof history.headSha === 'string' ? history.headSha : env.headSha;

  // Post-hoc scope enforcement applied only to fresh AI findings — prior
  // findings were validated when they were first recorded.
  const allowedFiles = new Set(historyFiles.map((f) => f.path));
  const filteredFreshFindings = rawFindings.filter((finding) => {
    if (allowedFiles.has(finding.file)) return true;
    core.warning(
      `Dropping out-of-scope AI finding for ${finding.file} (not in the modified unit test file list)`,
    );
    return false;
  });

  // Index fresh AI findings by file for O(1) lookup during merge.
  const freshFindingsByFile = new Map<string, Finding[]>();
  for (const finding of filteredFreshFindings) {
    const list = freshFindingsByFile.get(finding.file) ?? [];
    list.push(finding);
    freshFindingsByFile.set(finding.file, list);
  }

  // Merge per file: fresh findings for re-analyzed files, prior findings for
  // untouched files (files no longer in modifiedFiles are dropped automatically
  // because historyFiles already represents exactly the current modified set).
  const mergedFindings: Finding[] = [];
  const mergedStateFiles: Record<string, PerFileState> = {};

  for (const histFile of historyFiles) {
    const { path } = histFile;
    if (analyzedFiles.has(path)) {
      const fresh = freshFindingsByFile.get(path) ?? [];
      mergedFindings.push(...fresh);
      mergedStateFiles[path] = { analyzedSha: headSha, findings: fresh };
    } else {
      const prior = priorState.files[path];
      const priorFindings = (prior?.findings ?? []) as Finding[];
      mergedFindings.push(...priorFindings);
      mergedStateFiles[path] = {
        analyzedSha: prior?.analyzedSha ?? headSha,
        findings: priorFindings,
      };
    }
  }

  // Build the state block to embed in the comment for the next run to read.
  const newState: CommentState = { version: 1, windows, files: mergedStateFiles };
  const stateBlock = buildStateBlock(newState);

  // "Has findings" means either signal fired. History alone is enough because
  // the whole point of Stage 1 is to catch flakiness even when Stage 2 was
  // skipped (fork PR / analyzer error / no LLM key).
  const hasFindings = historyFiles.some((f) => f.flaky) || mergedFindings.length > 0;

  const runHistoryUrl =
    historyFiles[0]?.runHistoryUrl ??
    `${env.serverUrl}/${env.repo}/actions/workflows/ci.yml?query=branch%3Amain`;

  try {
    const existingComment = await findExistingStickyComment(octokit, owner, repo);

    // 4-state matrix — order matters because each branch returns early.
    if (!hasFindings && !existingComment) {
      console.log('✅ No findings and no existing sticky comment — nothing to do');
      return;
    }

    if (hasFindings && !existingComment) {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: env.prNumber,
        body: buildCommentBody({ historyFiles, findings: mergedFindings, runHistoryUrl, windows, runsSampled, stateBlock, headSha }),
      });
      console.log('📝 Created sticky flaky-test-detection comment');
      return;
    }

    if (hasFindings && existingComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: buildCommentBody({ historyFiles, findings: mergedFindings, runHistoryUrl, windows, runsSampled, stateBlock, headSha }),
      });
      console.log('🔄 Updated sticky flaky-test-detection comment with latest findings');
      return;
    }

    // !hasFindings && existingComment — flip the sticky to "all clear" so the
    // author gets positive feedback that their fix landed. The state block is
    // preserved so Stage 1 still knows the last-analyzed SHA on the next push.
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment!.id,
      body: buildAllClearBody(runHistoryUrl, stateBlock),
    });
    console.log('🎉 Updated sticky comment — all previously flagged issues are fixed');
  } catch (error) {
    core.warning(`Failed to manage sticky comment: ${(error as Error).message}`);
  }
}

main().catch((error: Error) => {
  core.warning(`Stage 3 failed: ${error.message}`);
});
