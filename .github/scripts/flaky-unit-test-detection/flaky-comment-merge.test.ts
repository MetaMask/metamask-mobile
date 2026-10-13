import {
  decideCommentAction,
  mergePriorState,
  type MergePriorStateInput,
} from './flaky-comment-merge';
import type { CommentState, HistoryFile, StoredFinding } from './flaky-types';

const FILE = 'app/core/createAsyncBatcher.test.ts';
const HEAD = 'head1234567890';
const OLDER = 'old1234567890';

const source = [
  'import x from "x";',
  '',
  'it("works", () => {',
  '  flush();',
  '});',
].join('\n');

const finding = (overrides: Partial<StoredFinding> = {}): StoredFinding => ({
  file: FILE,
  line: 4,
  patternId: 'J1',
  patternName: 'Missing act()',
  severity: 'high',
  snippet: '  flush();',
  suggestedFix: '  await act(async () => flush());',
  ...overrides,
});

const historyFile = (overrides: Partial<HistoryFile> = {}): HistoryFile => ({
  path: FILE,
  flaky: true,
  sameShaFailThenPass: 1,
  exampleRunUrl: 'https://github.com/o/r/actions/runs/1/job/2',
  runHistoryUrl: 'https://github.com/o/r/actions/runs/1/job/2',
  ...overrides,
});

const priorState = (
  findings: StoredFinding[],
  analyzedSha = OLDER,
): CommentState => ({
  version: 1,
  windows: [14],
  files: {
    [FILE]: { analyzedSha, findings, patternsReviewed: true },
  },
});

const merge = (
  overrides: Partial<MergePriorStateInput> = {},
): ReturnType<typeof mergePriorState> =>
  mergePriorState({
    historyFiles: [historyFile()],
    priorState: { version: 1, windows: [14], files: {} },
    analyzedFiles: new Set<string>(),
    aiAnalyzedFiles: new Set<string>(),
    freshFindingsByFile: new Map(),
    headSha: HEAD,
    readFileAtHead: () => source,
    ...overrides,
  });

describe('mergePriorState', () => {
  it('adopts fresh findings when both stages covered the file', () => {
    const fresh = finding({ patternId: 'J2' });

    const result = merge({
      priorState: priorState([finding()]),
      analyzedFiles: new Set([FILE]),
      aiAnalyzedFiles: new Set([FILE]),
      freshFindingsByFile: new Map([[FILE, [fresh]]]),
    });

    expect(result.findings).toStrictEqual([fresh]);
    expect(result.stateFiles[FILE].analyzedSha).toBe(HEAD);
    expect(result.patternsReviewedFiles.has(FILE)).toBe(true);
  });

  it('clears prior findings when a fresh review found nothing', () => {
    const result = merge({
      priorState: priorState([finding()]),
      analyzedFiles: new Set([FILE]),
      aiAnalyzedFiles: new Set([FILE]),
      freshFindingsByFile: new Map(),
    });

    expect(result.findings).toStrictEqual([]);
    expect(result.stateFiles[FILE].patternsReviewed).toBe(true);
  });

  it('keeps prior findings when Stage 2 missed a file Stage 1 re-walked', () => {
    const result = merge({
      priorState: priorState([finding()]),
      analyzedFiles: new Set([FILE]),
      aiAnalyzedFiles: new Set<string>(),
    });

    expect(result.findings).toHaveLength(1);
    // The old review covered an older version of the file, so the table must
    // say "not reviewed" rather than "no pattern found".
    expect(result.stateFiles[FILE].patternsReviewed).toBe(false);
    expect(result.patternsReviewedFiles.has(FILE)).toBe(false);
  });

  it('keeps the reviewed state of a file this push never touched', () => {
    const result = merge({ priorState: priorState([finding()]) });

    expect(result.findings).toHaveLength(1);
    expect(result.stateFiles[FILE].patternsReviewed).toBe(true);
    expect(result.patternsReviewedFiles.has(FILE)).toBe(true);
  });

  it('drops a file the PR no longer modifies', () => {
    const result = merge({
      historyFiles: [],
      priorState: priorState([finding()]),
    });

    expect(result.findings).toStrictEqual([]);
    expect(result.stateFiles).toStrictEqual({});
  });

  it('defaults a file with no prior entry to not reviewed', () => {
    const result = merge();

    expect(result.stateFiles[FILE]).toStrictEqual({
      analyzedSha: HEAD,
      findings: [],
      patternsReviewed: false,
    });
  });

  it('stores only the fields the comment re-renders', () => {
    const fresh = {
      ...finding(),
      explanation: 'a long explanation that costs comment budget',
      historicalHintUsed: true,
    };

    const result = merge({
      analyzedFiles: new Set([FILE]),
      aiAnalyzedFiles: new Set([FILE]),
      freshFindingsByFile: new Map([[FILE, [fresh]]]),
    });

    expect(result.stateFiles[FILE].findings[0]).not.toHaveProperty(
      'explanation',
    );
    expect(result.stateFiles[FILE].findings[0]).not.toHaveProperty(
      'historicalHintUsed',
    );
  });
});

describe('mergePriorState re-validation at head', () => {
  it('moves a preserved finding to where its snippet sits now', () => {
    const movedSource = ['', '', ...source.split('\n')].join('\n');

    const result = merge({
      priorState: priorState([finding({ line: 4 })]),
      readFileAtHead: () => movedSource,
    });

    expect(result.findings[0].line).toBe(6);
  });

  it('drops a preserved finding whose snippet is gone', () => {
    const dropped: string[] = [];

    const result = merge({
      priorState: priorState([finding()]),
      readFileAtHead: () => 'it("works", () => {});',
      onDroppedFinding: (message) => dropped.push(message),
    });

    expect(result.findings).toStrictEqual([]);
    expect(dropped[0]).toContain(FILE);
  });

  it('keeps a preserved finding when the file cannot be read at head', () => {
    const result = merge({
      priorState: priorState([finding()]),
      readFileAtHead: () => null,
    });

    expect(result.findings).toHaveLength(1);
  });

  it('tags a preserved finding with the commit it was reviewed at', () => {
    const result = merge({ priorState: priorState([finding()]) });

    expect(result.staleReviewShaByFile.get(FILE)).toBe(OLDER);
  });

  it('does not tag findings already reviewed at head', () => {
    const result = merge({ priorState: priorState([finding()], HEAD) });

    expect(result.staleReviewShaByFile.has(FILE)).toBe(false);
  });
});

describe('decideCommentAction', () => {
  it('does nothing when there is neither a finding nor a comment', () => {
    expect(
      decideCommentAction({
        hasFindings: false,
        hasExistingComment: false,
        historyComplete: true,
      }),
    ).toBe('none');
  });

  it('creates a comment for the first findings', () => {
    expect(
      decideCommentAction({
        hasFindings: true,
        hasExistingComment: false,
        historyComplete: true,
      }),
    ).toBe('created');
  });

  it('updates an existing comment with new findings', () => {
    expect(
      decideCommentAction({
        hasFindings: true,
        hasExistingComment: true,
        historyComplete: true,
      }),
    ).toBe('updated');
  });

  it('declares all clear once the findings are gone', () => {
    expect(
      decideCommentAction({
        hasFindings: false,
        hasExistingComment: true,
        historyComplete: true,
      }),
    ).toBe('all_clear');
  });

  it('withholds all clear when the walk did not finish', () => {
    expect(
      decideCommentAction({
        hasFindings: false,
        hasExistingComment: true,
        historyComplete: false,
      }),
    ).toBe('updated');
  });
});
