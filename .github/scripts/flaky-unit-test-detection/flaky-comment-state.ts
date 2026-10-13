/**
 * The sticky comment's identity marker and its hidden state block.
 *
 * Stage 3 writes the block, Stage 1 reads it back on the next push to decide
 * which files still need a review. Both markers must be byte-identical across
 * stages: a drift in either one orphans the comment (Stage 3 creates a second
 * one) or silently resets the state (Stage 1 re-analyzes everything).
 */
import type { CommentState, PerFileState, StoredFinding } from './flaky-types';

/** Stable first line of the comment body — how both stages find it again. */
export const COMMENT_MARKER = '<!-- metamask-flaky-test-detection -->';

/**
 * Prefix of the hidden state block. The payload is base64 so a finding's
 * snippet or suggested fix containing a literal `-->` cannot truncate it
 * before the real closing delimiter.
 */
export const STATE_MARKER = '<!-- metamask-flaky-test-detection-metadata=';

export function buildStateBlock(state: CommentState): string {
  const encoded = Buffer.from(JSON.stringify(state), 'utf8').toString('base64');
  return `${STATE_MARKER}${encoded} -->`;
}

export function parseStateFromComment(body: string): CommentState | null {
  const start = body.indexOf(STATE_MARKER);
  if (start === -1) {
    return null;
  }
  const after = body.slice(start + STATE_MARKER.length).trimStart();
  const end = after.indexOf(' -->');
  if (end === -1) {
    return null;
  }
  try {
    const json = Buffer.from(after.slice(0, end).trim(), 'base64').toString(
      'utf8',
    );
    return JSON.parse(json) as CommentState;
  } catch {
    return null;
  }
}

/**
 * Keeps only what the comment re-renders. `explanation` and
 * `historicalHintUsed` are never read back, and every stored byte costs
 * ~1.33 base64 characters of the 65536-character comment budget.
 */
export function toStoredFinding(finding: StoredFinding): StoredFinding {
  return {
    file: finding.file,
    line: finding.line,
    patternId: finding.patternId,
    patternName: finding.patternName,
    severity: finding.severity,
    snippet: finding.snippet,
    suggestedFix: finding.suggestedFix,
  };
}

export function toStoredFileState(state: PerFileState): PerFileState {
  return {
    analyzedSha: state.analyzedSha,
    findings: state.findings.map(toStoredFinding),
    patternsReviewed: state.patternsReviewed,
  };
}
