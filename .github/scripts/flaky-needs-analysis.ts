/**
 * Decides which modified unit-test files Stage 2 must review on this push.
 *
 * A file is always re-analyzed when Stage 2 has not reviewed its current
 * content (`patternsReviewed !== true`), even if its bytes are unchanged —
 * otherwise a failed or skipped AI run sticks as "not reviewed" until the
 * file is edited.
 */

export type PriorFileAnalysisState = {
  analyzedSha?: string;
  patternsReviewed?: boolean;
};

export type PriorCommentState = {
  files: Record<string, PriorFileAnalysisState>;
};

export type NeedsAnalysisContext = {
  headSha: string;
  isCommitReachable: (sha: string) => boolean;
  diffNameOnly: (fromSha: string, toSha: string) => string[];
};

export function fileNeedsAnalysisFromPriorState(
  prior: PriorFileAnalysisState | undefined,
): boolean {
  return !prior?.analyzedSha || prior.patternsReviewed !== true;
}

/**
 * The comment renders one section per unit-test file the PR modifies, so it
 * goes stale as soon as that set changes — a reverted file keeps its findings
 * on screen forever if staleness is only ever judged file by file.
 */
export function commentFileSetChanged(
  modifiedFiles: string[],
  priorState: PriorCommentState | null,
): boolean {
  if (!priorState) {
    return true;
  }
  const priorFiles = Object.keys(priorState.files);
  const modified = new Set(modifiedFiles);
  return (
    priorFiles.length !== modified.size ||
    priorFiles.some((file) => !modified.has(file))
  );
}

export function computeNeedsAnalysis(
  modifiedFiles: string[],
  priorState: PriorCommentState | null,
  context: NeedsAnalysisContext,
): { files: string[]; missingPriorShaCount: number } {
  if (!priorState) {
    return { files: [...modifiedFiles], missingPriorShaCount: 0 };
  }

  const byAnalyzedSha = new Map<string, string[]>();
  const always: string[] = [];

  for (const file of modifiedFiles) {
    const prior = priorState.files[file];
    if (!prior?.analyzedSha || prior.patternsReviewed !== true) {
      always.push(file);
      continue;
    }
    const analyzedSha = prior.analyzedSha;
    const list = byAnalyzedSha.get(analyzedSha) ?? [];
    list.push(file);
    byAnalyzedSha.set(analyzedSha, list);
  }

  const changedFiles = new Set<string>(always);
  let missingPriorShaCount = 0;

  for (const [analyzedSha, files] of byAnalyzedSha) {
    if (!context.isCommitReachable(analyzedSha)) {
      missingPriorShaCount += 1;
      files.forEach((file) => changedFiles.add(file));
      continue;
    }

    let changedInDiff: Set<string>;
    try {
      changedInDiff = new Set(
        context.diffNameOnly(analyzedSha, context.headSha),
      );
    } catch {
      files.forEach((file) => changedFiles.add(file));
      continue;
    }
    for (const file of files) {
      if (changedInDiff.has(file)) {
        changedFiles.add(file);
      }
    }
  }

  return {
    files: modifiedFiles.filter((file) => changedFiles.has(file)),
    missingPriorShaCount,
  };
}
