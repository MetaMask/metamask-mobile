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
      }),
    ).toBe('history_and_pattern');
  });

  it('reports history_only when no pattern remains in the file', () => {
    expect(
      combineFileSignals({
        path: flakyFile,
        hasHistoryHit: true,
        hasPatternFinding: false,
      }),
    ).toBe('history_only');
  });

  it('reports pattern_only when history has no same-SHA hit', () => {
    expect(
      combineFileSignals({
        path: newPatternFile,
        hasHistoryHit: false,
        hasPatternFinding: true,
      }),
    ).toBe('pattern_only');
  });

  it('returns null when neither signal fired', () => {
    expect(
      combineFileSignals({
        path: newPatternFile,
        hasHistoryHit: false,
        hasPatternFinding: false,
      }),
    ).toBeNull();
  });
});

describe('combineSignalsByFile', () => {
  it('drops files with neither signal and keeps the rest in order', () => {
    expect(
      combineSignalsByFile([
        { path: flakyFile, hasHistoryHit: true, hasPatternFinding: true },
        {
          path: 'app/util/quiet.test.ts',
          hasHistoryHit: false,
          hasPatternFinding: false,
        },
        { path: newPatternFile, hasHistoryHit: false, hasPatternFinding: true },
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
});

describe('renderSignalsSection', () => {
  it('renders one labelled line per file with a signal', () => {
    const markdown = renderSignalsSection([
      { path: flakyFile, hasHistoryHit: true, hasPatternFinding: false },
      { path: newPatternFile, hasHistoryHit: false, hasPatternFinding: true },
    ]);

    expect(markdown).toContain('### Signals');
    expect(markdown).toContain(
      `- \`${flakyFile}\` — ${signalCombinationLabel('history_only')}`,
    );
    expect(markdown).toContain(
      `- \`${newPatternFile}\` — ${signalCombinationLabel('pattern_only')}`,
    );
  });

  it('renders nothing when no file carries a signal', () => {
    expect(
      renderSignalsSection([
        { path: flakyFile, hasHistoryHit: false, hasPatternFinding: false },
      ]),
    ).toBe('');
  });
});
