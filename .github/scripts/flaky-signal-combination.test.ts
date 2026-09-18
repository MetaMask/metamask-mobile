import {
  assembleAllClearMarkdown,
  assembleFlakyCommentMarkdown,
  combineFileSignals,
  combineSignalsByFile,
  patternSeverityLight,
  renderFlakyFindingsTable,
  renderFlakyPatternsCell,
  renderPastFlakynessCell,
  TRAFFIC_LIGHT,
  type FlakyTableFile,
} from './flaky-signal-combination';

const flakyFile = 'app/components/UI/Assets/watchlist/utils/batcher.test.ts';
const newPatternFile = 'app/util/other.test.ts';
const jobLogUrl = 'https://github.com/org/repo/actions/runs/10/job/99';
const blobUrl = 'https://github.com/org/repo/blob/abc/app/file.test.ts#L42';

const historyAndPatternFile = (): FlakyTableFile => ({
  path: flakyFile,
  hasHistoryHit: true,
  patternsReviewed: true,
  sameShaFailThenPass: 2,
  exampleRunUrl: jobLogUrl,
  findings: [
    {
      patternId: 'J6',
      patternName: 'real timers',
      severity: 'high',
      blobUrl,
    },
    {
      patternId: 'J3',
      patternName: 'mock leak',
      severity: 'medium',
      blobUrl: 'https://github.com/org/repo/blob/abc/app/file.test.ts#L10',
    },
  ],
});

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

describe('renderPastFlakynessCell', () => {
  it('marks a file with no same-SHA hit as new', () => {
    expect(
      renderPastFlakynessCell({
        hasHistoryHit: false,
        hasPatternFinding: true,
        count: 0,
        exampleRunUrl: '',
      }),
    ).toBe('new');
  });

  it('uses a red light and job-log run link when history and a pattern both fired', () => {
    expect(
      renderPastFlakynessCell({
        hasHistoryHit: true,
        hasPatternFinding: true,
        count: 2,
        exampleRunUrl: jobLogUrl,
      }),
    ).toBe(`${TRAFFIC_LIGHT.red} 2 ([run](${jobLogUrl}))`);
  });

  it('uses a yellow light when only history fired', () => {
    expect(
      renderPastFlakynessCell({
        hasHistoryHit: true,
        hasPatternFinding: false,
        count: 1,
        exampleRunUrl: jobLogUrl,
      }),
    ).toBe(`${TRAFFIC_LIGHT.yellow} 1 ([run](${jobLogUrl}))`);
  });
});

describe('patternSeverityLight', () => {
  it('maps high and critical to red', () => {
    expect(patternSeverityLight('high')).toBe(TRAFFIC_LIGHT.red);
    expect(patternSeverityLight('critical')).toBe(TRAFFIC_LIGHT.red);
  });

  it('maps medium to yellow', () => {
    expect(patternSeverityLight('medium')).toBe(TRAFFIC_LIGHT.yellow);
  });
});

describe('renderFlakyPatternsCell', () => {
  it('links the pattern id and name at the blob line', () => {
    expect(
      renderFlakyPatternsCell({
        patternId: 'J6',
        patternName: 'real timers',
        severity: 'high',
        blobUrl,
      }),
    ).toBe(`${TRAFFIC_LIGHT.red} [J6 — real timers](${blobUrl})`);
  });
});

describe('renderFlakyFindingsTable', () => {
  it('repeats File and Past flakyness on every pattern row', () => {
    const markdown = renderFlakyFindingsTable([historyAndPatternFile()]);

    expect(markdown).toContain('| File | Past flakyness | Flaky patterns |');
    expect(markdown).toContain(
      `| \`${flakyFile}\` | ${TRAFFIC_LIGHT.red} 2 ([run](${jobLogUrl})) | ${TRAFFIC_LIGHT.red} [J6 — real timers](${blobUrl}) |`,
    );
    expect(markdown).toContain(
      `| \`${flakyFile}\` | ${TRAFFIC_LIGHT.red} 2 ([run](${jobLogUrl})) | ${TRAFFIC_LIGHT.yellow} [J3 — mock leak](https://github.com/org/repo/blob/abc/app/file.test.ts#L10) |`,
    );
  });

  it('writes none in Flaky patterns when history fired and Stage 2 found nothing', () => {
    const markdown = renderFlakyFindingsTable([
      {
        path: flakyFile,
        hasHistoryHit: true,
        patternsReviewed: true,
        sameShaFailThenPass: 1,
        exampleRunUrl: jobLogUrl,
        findings: [],
      },
    ]);

    expect(markdown).toContain(
      `| \`${flakyFile}\` | ${TRAFFIC_LIGHT.yellow} 1 ([run](${jobLogUrl})) | none |`,
    );
  });

  it('writes not reviewed when history fired and Stage 2 never scanned the file', () => {
    const markdown = renderFlakyFindingsTable([
      {
        path: flakyFile,
        hasHistoryHit: true,
        patternsReviewed: false,
        sameShaFailThenPass: 2,
        exampleRunUrl: jobLogUrl,
        findings: [],
      },
    ]);

    expect(markdown).toContain(
      `| \`${flakyFile}\` | ${TRAFFIC_LIGHT.yellow} 2 ([run](${jobLogUrl})) | not reviewed |`,
    );
  });

  it('writes new in Past flakyness on every pattern-only row', () => {
    const markdown = renderFlakyFindingsTable([
      {
        path: newPatternFile,
        hasHistoryHit: false,
        patternsReviewed: true,
        sameShaFailThenPass: 0,
        exampleRunUrl: '',
        findings: [
          {
            patternId: 'J6',
            patternName: 'real timers',
            severity: 'medium',
            blobUrl,
          },
        ],
      },
    ]);

    expect(markdown).toContain(
      `| \`${newPatternFile}\` | new | ${TRAFFIC_LIGHT.yellow} [J6 — real timers](${blobUrl}) |`,
    );
  });

  it('points [run] at the job log path', () => {
    const markdown = renderFlakyFindingsTable([
      {
        path: flakyFile,
        hasHistoryHit: true,
        patternsReviewed: true,
        sameShaFailThenPass: 1,
        exampleRunUrl: jobLogUrl,
        findings: [],
      },
    ]);

    expect(markdown).toContain(`/actions/runs/10/job/99`);
    expect(markdown).not.toContain(
      '](https://github.com/org/repo/actions/runs/10)',
    );
  });

  it('omits files with neither signal', () => {
    expect(
      renderFlakyFindingsTable([
        {
          path: 'app/util/quiet.test.ts',
          hasHistoryHit: false,
          patternsReviewed: true,
          sameShaFailThenPass: 0,
          exampleRunUrl: '',
          findings: [],
        },
      ]),
    ).toBe('');
  });
});

describe('assembleFlakyCommentMarkdown', () => {
  it('is title, table, diffs, incomplete-coverage, then skill link', () => {
    const body = assembleFlakyCommentMarkdown({
      marker: '<!-- metamask-flaky-test-detection -->',
      table: '| File | Past flakyness | Flaky patterns |',
      diffs: '`file.test.ts:1`\n\n```diff\n-a\n+b\n```',
      coverageLine:
        '_History coverage incomplete: inspected 1 of 2 candidate SHA(s)._',
      skillLink: 'https://example/skill',
      stateBlock: '<!-- metamask-flaky-test-detection-metadata=abc -->',
    });

    expect(body.startsWith('<!-- metamask-flaky-test-detection -->')).toBe(
      true,
    );
    expect(body).toContain('## Flaky unit test detection');
    expect(body).toContain('| File | Past flakyness | Flaky patterns |');
    expect(body).toContain('```diff');
    expect(body).toContain('inspected 1 of 2 candidate SHA(s)');
    expect(body).toContain(
      'See the [flaky-test-detection skill](https://example/skill).',
    );
    expect(body).not.toContain('Neither signal is proof');
    expect(body).not.toContain('### Signals');
  });
});

describe('assembleAllClearMarkdown', () => {
  it('uses a green circle All clear line', () => {
    expect(
      assembleAllClearMarkdown({
        marker: '<!-- marker -->',
        stateBlock: '<!-- state -->',
      }),
    ).toContain(`${TRAFFIC_LIGHT.green} All clear`);
  });
});
