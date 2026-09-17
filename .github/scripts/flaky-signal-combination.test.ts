import {
  combineFileSignals,
  combineSignalsByFile,
  renderSignalsSection,
  signalCombinationLabel,
} from './flaky-signal-combination';

const flakyFile = 'app/components/UI/Assets/watchlist/utils/batcher.test.ts';
const newPatternFile = 'app/util/other.test.ts';

describe('combineFileSignals', () => {
  it('reports history_and_pattern when both signals fired', () => {
    expect(
      combineFileSignals({
        path: flakyFile,
        hasHistoryHit: true,
        hasPatternFinding: true,
        patternsReviewed: true,
      }),
    ).toBe('history_and_pattern');
  });

  it('reports history_only when the reviewed file has no pattern left', () => {
    expect(
      combineFileSignals({
        path: flakyFile,
        hasHistoryHit: true,
        hasPatternFinding: false,
        patternsReviewed: true,
      }),
    ).toBe('history_only');
  });

  it('reports history_unreviewed when pattern analysis never ran on the file', () => {
    expect(
      combineFileSignals({
        path: flakyFile,
        hasHistoryHit: true,
        hasPatternFinding: false,
        patternsReviewed: false,
      }),
    ).toBe('history_unreviewed');
  });

  it('reports pattern_only when history has no same-SHA hit', () => {
    expect(
      combineFileSignals({
        path: newPatternFile,
        hasHistoryHit: false,
        hasPatternFinding: true,
        patternsReviewed: true,
      }),
    ).toBe('pattern_only');
  });

  it('returns null when neither signal fired', () => {
    expect(
      combineFileSignals({
        path: newPatternFile,
        hasHistoryHit: false,
        hasPatternFinding: false,
        patternsReviewed: true,
      }),
    ).toBeNull();
  });
});

describe('combineSignalsByFile', () => {
  it('drops files with neither signal and keeps the rest in order', () => {
    expect(
      combineSignalsByFile([
        {
          path: flakyFile,
          hasHistoryHit: true,
          hasPatternFinding: true,
          patternsReviewed: true,
        },
        {
          path: 'app/util/quiet.test.ts',
          hasHistoryHit: false,
          hasPatternFinding: false,
          patternsReviewed: true,
        },
        {
          path: newPatternFile,
          hasHistoryHit: false,
          hasPatternFinding: true,
          patternsReviewed: true,
        },
      ]),
    ).toStrictEqual([
      { path: flakyFile, combination: 'history_and_pattern' },
      { path: newPatternFile, combination: 'pattern_only' },
    ]);
  });
});

describe('signalCombinationLabel', () => {
  it('calls out an unfixed flake when both signals fired', () => {
    expect(signalCombinationLabel('history_and_pattern')).toContain('unfixed');
  });

  it('suggests checking for an existing fix when only history fired', () => {
    expect(signalCombinationLabel('history_only')).toContain('already fixed');
  });

  it('points at this PR when only a pattern fired', () => {
    expect(signalCombinationLabel('pattern_only')).toContain('introduced here');
  });

  it('claims no verdict when pattern analysis did not review the file', () => {
    expect(signalCombinationLabel('history_unreviewed')).toContain(
      'did not review this version of the file',
    );
  });
});

describe('renderSignalsSection', () => {
  it('renders one labelled line per file with a signal', () => {
    const markdown = renderSignalsSection([
      {
        path: flakyFile,
        hasHistoryHit: true,
        hasPatternFinding: false,
        patternsReviewed: true,
      },
      {
        path: newPatternFile,
        hasHistoryHit: false,
        hasPatternFinding: true,
        patternsReviewed: true,
      },
    ]);

    expect(markdown).toContain('### Signals');
    expect(markdown).toContain(
      `- \`${flakyFile}\` — ${signalCombinationLabel('history_only')}`,
    );
    expect(markdown).toContain(
      `- \`${newPatternFile}\` — ${signalCombinationLabel('pattern_only')}`,
    );
  });

  it('flags an unreviewed historically flaky file instead of claiming it is clean', () => {
    const markdown = renderSignalsSection([
      {
        path: flakyFile,
        hasHistoryHit: true,
        hasPatternFinding: false,
        patternsReviewed: false,
      },
    ]);

    expect(markdown).toContain(
      `- \`${flakyFile}\` — ${signalCombinationLabel('history_unreviewed')}`,
    );
  });

  it('renders nothing when no file carries a signal', () => {
    expect(
      renderSignalsSection([
        {
          path: flakyFile,
          hasHistoryHit: false,
          hasPatternFinding: false,
          patternsReviewed: true,
        },
      ]),
    ).toBe('');
  });
});
