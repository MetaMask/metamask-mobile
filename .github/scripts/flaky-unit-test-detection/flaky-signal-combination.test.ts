import {
  assembleAllClearMarkdown,
  assembleFlakyCommentMarkdown,
  combineFileSignals,
  combineSignalsByFile,
  fitCommentBody,
  FLAKY_TABLE_HEADER,
  patternSeverityLight,
  renderFlakyFindingsTable,
  renderFlakyPatternsCell,
  renderNoFindingsLine,
  renderPastFlakynessCell,
  renderUnreviewedPatternsCell,
  resolveUnreviewedReason,
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

  // Moving test files is routine here, and a count against a path with no
  // runs behind it reads as a bug rather than as a move.
  it('names the path that supplied the count when the file has moved', () => {
    expect(
      renderPastFlakynessCell({
        hasHistoryHit: true,
        hasPatternFinding: false,
        count: 3,
        exampleRunUrl: jobLogUrl,
        historyPath: 'app/util/old.test.ts',
      }),
    ).toBe(
      `${TRAFFIC_LIGHT.yellow} 3 (as \`app/util/old.test.ts\`) ([run](${jobLogUrl}))`,
    );
  });

  it('says nothing about a move for a file that stayed put', () => {
    expect(
      renderPastFlakynessCell({
        hasHistoryHit: true,
        hasPatternFinding: false,
        count: 3,
        exampleRunUrl: jobLogUrl,
      }),
    ).not.toContain('as `');
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

  it('says which commit a finding was reviewed at when it predates this push', () => {
    expect(
      renderFlakyPatternsCell(
        {
          patternId: 'J6',
          patternName: 'real timers',
          severity: 'high',
          blobUrl,
        },
        'abc1234567890',
      ),
    ).toBe(
      `${TRAFFIC_LIGHT.red} [J6 — real timers](${blobUrl}) _(reviewed at abc1234)_`,
    );
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

  it('writes not reviewed with the Stage 2 miss reason when history fired', () => {
    const markdown = renderFlakyFindingsTable([
      {
        path: flakyFile,
        hasHistoryHit: true,
        patternsReviewed: false,
        sameShaFailThenPass: 2,
        exampleRunUrl: jobLogUrl,
        findings: [],
        unreviewed: {
          reason: 'did_not_complete',
          attempts: 2,
          logUrl: 'https://github.com/org/repo/actions/runs/10',
        },
      },
    ]);

    expect(markdown).toContain(
      `| \`${flakyFile}\` | ${TRAFFIC_LIGHT.yellow} 2 ([run](${jobLogUrl})) | not reviewed — analysis did not complete after 2 attempts ([log](https://github.com/org/repo/actions/runs/10)) |`,
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

describe('renderUnreviewedPatternsCell', () => {
  it('names the miss reason for each unreviewed status', () => {
    expect(
      renderUnreviewedPatternsCell({
        reason: 'did_not_complete',
        attempts: 1,
        logUrl: 'https://example/run',
      }),
    ).toBe(
      'not reviewed — analysis did not complete after 1 attempt ([log](https://example/run))',
    );
    expect(
      renderUnreviewedPatternsCell({ reason: 'skipped_cap', cap: 10 }),
    ).toBe('not reviewed — over the 10-file cap');
    expect(renderUnreviewedPatternsCell({ reason: 'skipped_fork' })).toBe(
      'not reviewed — AI stage skipped on fork PRs',
    );
    expect(renderUnreviewedPatternsCell({ reason: 'not_run' })).toBe(
      'not reviewed — analyzer did not run',
    );
    expect(
      renderUnreviewedPatternsCell({
        reason: 'stage_failed',
        logUrl: 'https://example/run',
      }),
    ).toBe('not reviewed — the AI stage failed ([log](https://example/run))');
  });
});

describe('resolveUnreviewedReason', () => {
  it('reads did_not_complete and skipped_cap from the runs manifest', () => {
    expect(
      resolveUnreviewedReason({
        file: 'a.test.ts',
        patternsReviewed: false,
        runs: [{ file: 'a.test.ts', status: 'did_not_complete', attempts: 2 }],
        aiStepOutcome: 'success',
        logUrl: 'https://example/run',
      }),
    ).toEqual({
      reason: 'did_not_complete',
      attempts: 2,
      logUrl: 'https://example/run',
    });
    expect(
      resolveUnreviewedReason({
        file: 'b.test.ts',
        patternsReviewed: false,
        runs: [{ file: 'b.test.ts', status: 'skipped_cap', attempts: 0 }],
        aiStepOutcome: 'success',
        maxFiles: 10,
      }),
    ).toEqual({ reason: 'skipped_cap', cap: 10 });
  });

  it('blames a fork only when the workflow said the fork caused the skip', () => {
    expect(
      resolveUnreviewedReason({
        file: 'a.test.ts',
        patternsReviewed: false,
        runs: undefined,
        aiStepOutcome: 'skipped',
        aiSkipReason: 'fork',
      }),
    ).toEqual({ reason: 'skipped_fork' });
  });

  it('does not claim a fork when the step was skipped for want of files', () => {
    expect(
      resolveUnreviewedReason({
        file: 'a.test.ts',
        patternsReviewed: false,
        runs: undefined,
        aiStepOutcome: 'skipped',
        aiSkipReason: 'no_files',
      }),
    ).toEqual({ reason: 'not_run' });
  });

  it('points at the run log when the AI stage failed outright', () => {
    expect(
      resolveUnreviewedReason({
        file: 'a.test.ts',
        patternsReviewed: false,
        runs: undefined,
        aiStepOutcome: 'failure',
        logUrl: 'https://example/run',
      }),
    ).toEqual({ reason: 'stage_failed', logUrl: 'https://example/run' });
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

  it('keeps all-clear and appends the disclosure note when one is given', () => {
    const body = assembleAllClearMarkdown({
      marker: '<!-- marker -->',
      stateBlock: '<!-- state -->',
      note: '_1 fail-then-pass log(s) in the window are missing on GitHub._',
    });

    expect(body).toContain(`${TRAFFIC_LIGHT.green} All clear`);
    expect(body).toContain(
      '\n\n_1 fail-then-pass log(s) in the window are missing on GitHub._\n<!-- state -->',
    );
  });

  it('adds no blank paragraph when the note is empty', () => {
    expect(
      assembleAllClearMarkdown({
        marker: '<!-- marker -->',
        stateBlock: '<!-- state -->',
        note: '',
      }),
    ).toContain(`${TRAFFIC_LIGHT.green} All clear\n<!-- state -->`);
  });
});

describe('renderNoFindingsLine', () => {
  it('names the modified file count so an empty table never renders', () => {
    expect(renderNoFindingsLine(8)).toBe(
      'No same-SHA fail-then-pass history and no flaky pattern found for the 8 modified unit test files in the inspected range.',
    );
    expect(renderNoFindingsLine(1)).toContain('the modified unit test file in');
  });

  // "No history found" reads as a clean result, which an unread index cannot
  // support — only the pattern signal actually ran.
  it('does not claim a clean history when the index could not be read', () => {
    const line = renderNoFindingsLine(8, false);

    expect(line).toBe(
      'No flaky pattern found for the 8 modified unit test files. Past flakiness could not be checked.',
    );
    expect(line).not.toContain('No same-SHA fail-then-pass history');
  });
});

describe('fitCommentBody', () => {
  const base = {
    marker: '<!-- marker -->',
    table: `${FLAKY_TABLE_HEADER}\n| \`a.test.ts\` | new | J1 |\n| \`b.test.ts\` | new | J2 |`,
    diffs: '',
    coverageLine: '_coverage_',
    skillLink: 'https://example/skill',
    stateBlock: '<!-- metamask-flaky-test-detection-metadata=abc -->',
    runUrl: 'https://example/run',
  };

  it('leaves a body that already fits untouched', () => {
    expect(fitCommentBody(base)).toBe(assembleFlakyCommentMarkdown(base));
  });

  it('drops the suggested fixes first and says where they went', () => {
    const body = fitCommentBody({
      ...base,
      diffs: 'x'.repeat(2000),
      budget: 1500,
    });

    expect(body.length).toBeLessThanOrEqual(1500);
    expect(body).not.toContain('x'.repeat(100));
    expect(body).toContain('| `b.test.ts` | new | J2 |');
    expect(body).toContain('Suggested fixes omitted');
    expect(body).toContain('https://example/run');
  });

  it('truncates rows when dropping the fixes is not enough', () => {
    const manyRows = [
      FLAKY_TABLE_HEADER,
      ...Array.from(
        { length: 50 },
        (_, index) => `| \`file${index}.test.ts\` | new | ${'p'.repeat(100)} |`,
      ),
    ].join('\n');

    const body = fitCommentBody({ ...base, table: manyRows, budget: 1500 });

    expect(body.length).toBeLessThanOrEqual(1500);
    expect(body).toContain(FLAKY_TABLE_HEADER.split('\n')[0]);
    expect(body).toContain('more row(s)');
  });

  // Losing the state block makes the next run re-analyze everything and
  // re-post findings the reader already dismissed.
  it('keeps the state block even when nothing else fits', () => {
    const body = fitCommentBody({
      ...base,
      table: `${FLAKY_TABLE_HEADER}\n| \`a.test.ts\` | new | ${'p'.repeat(5000)} |`,
      budget: 400,
    });

    expect(body).toContain(base.stateBlock);
    expect(body).toContain('All findings were omitted');
  });
});
