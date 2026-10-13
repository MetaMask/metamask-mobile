import {
  COMMENT_MARKER,
  STATE_MARKER,
  buildStateBlock,
  parseStateFromComment,
  toStoredFileState,
  toStoredFinding,
} from './flaky-comment-state';
import type { CommentState } from './flaky-types';

const state: CommentState = {
  version: 1,
  windows: [14],
  files: {
    'app/foo.test.ts': {
      analyzedSha: 'abc1234',
      patternsReviewed: true,
      findings: [
        {
          file: 'app/foo.test.ts',
          line: 12,
          patternId: 'J1',
          patternName: 'Missing act()',
          severity: 'high',
          snippet: 'onRefresh();',
          suggestedFix: 'await act(async () => onRefresh());',
        },
      ],
    },
  },
};

describe('buildStateBlock / parseStateFromComment', () => {
  it('round-trips state through a comment body', () => {
    const body = `${COMMENT_MARKER}\n## Flaky unit test detection\n\n${buildStateBlock(state)}`;

    const parsed = parseStateFromComment(body);

    expect(parsed).toStrictEqual(state);
  });

  it('survives a finding containing the HTML comment terminator', () => {
    const withTerminator: CommentState = {
      ...state,
      files: {
        'app/foo.test.ts': {
          analyzedSha: 'abc1234',
          findings: [
            {
              file: 'app/foo.test.ts',
              patternId: 'J2',
              patternName: 'Real timer',
              severity: 'medium',
              snippet: 'const arrow = () --> {};',
              suggestedFix: 'fix --> here',
            },
          ],
        },
      },
    };

    const parsed = parseStateFromComment(buildStateBlock(withTerminator));

    expect(parsed).toStrictEqual(withTerminator);
  });

  it('returns null when the body carries no state block', () => {
    const parsed = parseStateFromComment(`${COMMENT_MARKER}\nAll clear`);

    expect(parsed).toBeNull();
  });

  it('returns null when the payload is not decodable state', () => {
    const parsed = parseStateFromComment(`${STATE_MARKER}not-base64-json -->`);

    expect(parsed).toBeNull();
  });
});

describe('toStoredFinding', () => {
  it('drops fields the comment never re-renders', () => {
    const stored = toStoredFinding({
      file: 'app/foo.test.ts',
      line: 12,
      patternId: 'J1',
      patternName: 'Missing act()',
      severity: 'high',
      snippet: 'onRefresh();',
      suggestedFix: 'await act(async () => onRefresh());',
      // Present on a fresh Stage 2 finding, never read back from state.
      explanation: 'A long explanation that costs comment budget',
      historicalHintUsed: true,
    } as Parameters<typeof toStoredFinding>[0]);

    expect(stored).toStrictEqual({
      file: 'app/foo.test.ts',
      line: 12,
      patternId: 'J1',
      patternName: 'Missing act()',
      severity: 'high',
      snippet: 'onRefresh();',
      suggestedFix: 'await act(async () => onRefresh());',
    });
  });
});

describe('toStoredFileState', () => {
  it('keeps the review bookkeeping and trims its findings', () => {
    const stored = toStoredFileState({
      analyzedSha: 'abc1234',
      patternsReviewed: true,
      findings: [
        {
          file: 'app/foo.test.ts',
          patternId: 'J1',
          patternName: 'Missing act()',
          severity: 'high',
          snippet: 'onRefresh();',
          suggestedFix: 'await act(async () => onRefresh());',
          explanation: 'dropped',
        } as Parameters<typeof toStoredFinding>[0],
      ],
    });

    expect(stored.analyzedSha).toBe('abc1234');
    expect(stored.patternsReviewed).toBe(true);
    expect(stored.findings[0]).not.toHaveProperty('explanation');
  });
});
