/**
 * How Stage 3 decides what the next sticky comment says, given what the last
 * one said.
 *
 * Kept apart from the I/O in flaky-sticky-comment.ts because this is where
 * every wrong comment comes from: a file the AI never reviewed must not read
 * as "no pattern found", a broken Stage 2 must not erase findings into a false
 * "all fixed", and a finding recorded at an older commit must not point at a
 * line that has since moved.
 */
import type {
  CommentState,
  HistoryFile,
  PerFileState,
  StoredFinding,
} from './flaky-types';
import { toStoredFinding } from './flaky-comment-state';
import { locateSnippetInSource } from './flaky-sticky-snippet';

export type MergePriorStateInput = {
  /** Exactly the unit test files the PR modifies, as Stage 1 saw them. */
  historyFiles: HistoryFile[];
  priorState: CommentState;
  /** Files Stage 1 re-walked on this push. */
  analyzedFiles: Set<string>;
  /** Files Stage 2 actually reviewed on this push. */
  aiAnalyzedFiles: Set<string>;
  freshFindingsByFile: Map<string, StoredFinding[]>;
  headSha: string;
  readFileAtHead: (path: string) => string | null;
  onDroppedFinding?: (message: string) => void;
};

export type MergePriorStateResult = {
  findings: StoredFinding[];
  stateFiles: Record<string, PerFileState>;
  /** Files whose current content Stage 2 reviewed — everything else is "not reviewed". */
  patternsReviewedFiles: Set<string>;
  /** Files rendered from a review of an older commit, keyed to that commit. */
  staleReviewShaByFile: Map<string, string>;
};

/**
 * Re-points a finding recorded at an older commit to where its snippet sits
 * now. A finding whose snippet is gone is dropped: the code it described no
 * longer exists, so keeping it would send a reviewer to an unrelated line.
 */
function relocateFinding(
  finding: StoredFinding,
  source: string | null,
): StoredFinding | null {
  if (source === null || !finding.snippet) {
    return finding;
  }
  const match = locateSnippetInSource(source, finding.snippet, finding.line);
  if (!match) {
    return null;
  }
  return { ...finding, line: match.line, snippet: match.sourceSnippet };
}

export function mergePriorState(
  input: MergePriorStateInput,
): MergePriorStateResult {
  const findings: StoredFinding[] = [];
  const stateFiles: Record<string, PerFileState> = {};
  const patternsReviewedFiles = new Set<string>();
  const staleReviewShaByFile = new Map<string, string>();
  // One read per file, however many findings it carries.
  const sourceCache = new Map<string, string | null>();
  const sourceFor = (path: string): string | null => {
    if (!sourceCache.has(path)) {
      sourceCache.set(path, input.readFileAtHead(path));
    }
    return sourceCache.get(path) ?? null;
  };

  for (const { path } of input.historyFiles) {
    const prior = input.priorState.files[path];

    // Stage 1 re-walked the file and Stage 2 reviewed its current content, so
    // fresh findings replace prior ones — including when there are none, which
    // is what clears a fixed flake.
    if (input.analyzedFiles.has(path) && input.aiAnalyzedFiles.has(path)) {
      const fresh = (input.freshFindingsByFile.get(path) ?? []).map(
        toStoredFinding,
      );
      findings.push(...fresh);
      stateFiles[path] = {
        analyzedSha: input.headSha,
        findings: fresh,
        patternsReviewed: true,
      };
      patternsReviewedFiles.add(path);
      continue;
    }

    // Stage 2 missed the file (fork PR, analyzer error, over the cap) or the
    // push never touched it. Prior findings stay up rather than vanish, but
    // they describe the commit they were found at.
    const priorFindings = prior?.findings ?? [];
    const reviewedSha = prior?.analyzedSha ?? input.headSha;
    const kept = priorFindings
      .map((finding) => {
        const relocated = relocateFinding(finding, sourceFor(path));
        if (!relocated) {
          input.onDroppedFinding?.(
            `Dropping prior finding ${finding.patternId} for ${path}: its snippet is no longer in the file at ${input.headSha}`,
          );
        }
        return relocated;
      })
      .filter((finding): finding is StoredFinding => finding !== null);

    // A file Stage 1 re-walked but Stage 2 missed loses its reviewed state:
    // that review covered an older version of the file.
    const patternsReviewed = input.analyzedFiles.has(path)
      ? false
      : (prior?.patternsReviewed ?? false);

    findings.push(...kept);
    stateFiles[path] = {
      analyzedSha: reviewedSha,
      findings: kept,
      patternsReviewed,
    };
    if (patternsReviewed) {
      patternsReviewedFiles.add(path);
    }
    if (kept.length > 0 && reviewedSha !== input.headSha) {
      staleReviewShaByFile.set(path, reviewedSha);
    }
  }

  return { findings, stateFiles, patternsReviewedFiles, staleReviewShaByFile };
}

export type CommentAction = 'created' | 'updated' | 'all_clear' | 'none';

/**
 * The four states the sticky comment can be in. All-clear is reserved for a
 * walk that finished: a truncated history has no business claiming the flakes
 * are gone.
 */
export function decideCommentAction({
  hasFindings,
  hasExistingComment,
  historyComplete,
}: {
  hasFindings: boolean;
  hasExistingComment: boolean;
  historyComplete: boolean;
}): CommentAction {
  if (!hasFindings && !hasExistingComment) {
    return 'none';
  }
  if (hasFindings) {
    return hasExistingComment ? 'updated' : 'created';
  }
  return historyComplete ? 'all_clear' : 'updated';
}
