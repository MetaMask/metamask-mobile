import {
  aggregateHitsByFile,
  allUnitTestJobsSucceeded,
  candidateShaGroupsNewestFirst,
  collectSameShaHitsForGroup,
  failedUnitTestJobs,
  groupRunsByHeadSha,
  intersectWithModifiedFiles,
  isCandidateShaGroup,
  isLaterSnapshot,
  parseJestFailPaths,
  renderSameShaHistoryTable,
  snapshotInspectOrder,
  snapshotsToInspect,
  type InspectedSnapshot,
  type ListedWorkflowRun,
  type WorkflowJob,
} from './flaky-same-sha-history';

const modifiedFile = 'app/core/createAsyncBatcher.test.ts';
const otherFile = 'app/util/other.test.ts';

const run = (
  overrides: Partial<ListedWorkflowRun> & Pick<ListedWorkflowRun, 'id'>,
): ListedWorkflowRun => ({
  conclusion: 'failure',
  createdAt: '2026-09-01T00:00:00Z',
  headSha: 'abc',
  runAttempt: 1,
  ...overrides,
});

const jobs = (
  entries: { name: string; conclusion: string | null; id?: number }[],
): WorkflowJob[] =>
  entries.map((entry, index) => ({
    id: entry.id ?? index + 1,
    name: entry.name,
    conclusion: entry.conclusion,
  }));

describe('groupRunsByHeadSha', () => {
  it('groups by headSha and drops empty SHAs', () => {
    const groups = groupRunsByHeadSha([
      run({ id: 1, headSha: 'aaa' }),
      run({ id: 2, headSha: 'bbb' }),
      run({ id: 3, headSha: 'aaa' }),
      run({ id: 4, headSha: '' }),
    ]);

    expect([...groups.keys()]).toEqual(['aaa', 'bbb']);
    expect(groups.get('aaa')?.map((item) => item.id)).toEqual([1, 3]);
  });
});

describe('isCandidateShaGroup', () => {
  it('treats a rerun as a candidate', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 1, runAttempt: 2, conclusion: 'success' }),
      ]),
    ).toBe(true);
  });

  it('treats two run ids on the same SHA as a candidate', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 1 }),
        run({ id: 2, conclusion: 'success' }),
      ]),
    ).toBe(true);
  });

  it('skips a single attempt-1 run', () => {
    expect(isCandidateShaGroup([run({ id: 1 })])).toBe(false);
  });
});

describe('candidateShaGroupsNewestFirst', () => {
  it('orders candidate SHAs by newest run createdAt', () => {
    const groups = groupRunsByHeadSha([
      run({
        id: 1,
        headSha: 'old',
        runAttempt: 2,
        createdAt: '2026-09-01T00:00:00Z',
      }),
      run({
        id: 2,
        headSha: 'new',
        runAttempt: 2,
        createdAt: '2026-09-10T00:00:00Z',
      }),
    ]);

    expect(candidateShaGroupsNewestFirst(groups).map((g) => g.headSha)).toEqual(
      ['new', 'old'],
    );
  });
});

describe('snapshotsToInspect', () => {
  it('includes attempt 1 and the latest attempt for a rerun', () => {
    expect(snapshotsToInspect([run({ id: 9, runAttempt: 2 })])).toEqual([
      { runId: 9, attempt: 2, createdAt: '2026-09-01T00:00:00Z' },
      { runId: 9, attempt: 1, createdAt: '2026-09-01T00:00:00Z' },
    ]);
  });
});

describe('snapshotInspectOrder', () => {
  it('inspects rerun attempt 1 before the latest success attempt', () => {
    const listed = [run({ id: 9, runAttempt: 2, conclusion: 'success' })];
    const ordered = snapshotInspectOrder(snapshotsToInspect(listed), listed);

    expect(ordered.map((s) => s.attempt)).toEqual([1, 2]);
  });
});

describe('isLaterSnapshot', () => {
  it('uses attempt number on the same run id', () => {
    expect(
      isLaterSnapshot(
        { runId: 1, attempt: 2, createdAt: '2026-09-01T00:00:00Z' },
        { runId: 1, attempt: 1, createdAt: '2026-09-01T00:00:00Z' },
      ),
    ).toBe(true);
  });

  it('uses createdAt across different run ids', () => {
    expect(
      isLaterSnapshot(
        { runId: 2, attempt: 1, createdAt: '2026-09-02T00:00:00Z' },
        { runId: 1, attempt: 1, createdAt: '2026-09-01T00:00:00Z' },
      ),
    ).toBe(true);
  });
});

describe('unit job helpers', () => {
  it('finds failed Unit tests shards and ignores e2e', () => {
    expect(
      failedUnitTestJobs(
        jobs([
          { name: 'Unit tests (8)', conclusion: 'failure' },
          { name: 'E2E tests', conclusion: 'failure' },
        ]),
      ),
    ).toEqual([{ id: 1, name: 'Unit tests (8)', conclusion: 'failure' }]);
  });

  it('requires every Unit tests job to succeed', () => {
    expect(
      allUnitTestJobsSucceeded(
        jobs([
          { name: 'Unit tests (1)', conclusion: 'success' },
          { name: 'Unit tests (8)', conclusion: 'success' },
          { name: 'E2E tests', conclusion: 'failure' },
        ]),
      ),
    ).toBe(true);
    expect(
      allUnitTestJobsSucceeded(
        jobs([{ name: 'Unit tests (8)', conclusion: 'failure' }]),
      ),
    ).toBe(false);
  });
});

describe('parseJestFailPaths', () => {
  it('extracts FAIL paths without truncating tsx to ts', () => {
    expect(
      parseJestFailPaths(
        'FAIL app/Foo.test.tsx\nFAIL app/Bar.test.ts\nPASS app/Ok.test.ts',
      ),
    ).toEqual(['app/Foo.test.tsx', 'app/Bar.test.ts']);
  });
});

describe('collectSameShaHitsForGroup', () => {
  const failThenPassRerun = (): InspectedSnapshot[] => [
    {
      runId: 10,
      attempt: 1,
      createdAt: '2026-09-01T00:00:00Z',
      unitFailPaths: [modifiedFile],
      unitAllPassed: false,
    },
    {
      runId: 10,
      attempt: 2,
      createdAt: '2026-09-01T00:00:00Z',
      unitFailPaths: [],
      unitAllPassed: true,
    },
  ];

  it('flags a rerun where attempt 1 FAILs a modified file and later attempt unit tests pass', () => {
    expect(
      collectSameShaHitsForGroup(failThenPassRerun(), [modifiedFile]),
    ).toEqual([{ path: modifiedFile, failRunId: 10 }]);
  });

  it('flags two run ids on the same SHA with FAIL then later unit pass', () => {
    const snapshots: InspectedSnapshot[] = [
      {
        runId: 1,
        attempt: 1,
        createdAt: '2026-09-01T00:00:00Z',
        unitFailPaths: [modifiedFile],
        unitAllPassed: false,
      },
      {
        runId: 2,
        attempt: 1,
        createdAt: '2026-09-02T00:00:00Z',
        unitFailPaths: [],
        unitAllPassed: true,
      },
    ];

    expect(collectSameShaHitsForGroup(snapshots, [modifiedFile])).toEqual([
      { path: modifiedFile, failRunId: 1 },
    ]);
  });

  it('does not flag when the failed run has no unit-test FAIL jobs', () => {
    const snapshots: InspectedSnapshot[] = [
      {
        runId: 1,
        attempt: 1,
        createdAt: '2026-09-01T00:00:00Z',
        unitFailPaths: [],
        unitAllPassed: false,
      },
      {
        runId: 2,
        attempt: 1,
        createdAt: '2026-09-02T00:00:00Z',
        unitFailPaths: [],
        unitAllPassed: true,
      },
    ];

    expect(collectSameShaHitsForGroup(snapshots, [modifiedFile])).toEqual([]);
  });

  it('does not flag a cancelled attempt followed by success', () => {
    const snapshots: InspectedSnapshot[] = [
      {
        runId: 1,
        attempt: 1,
        createdAt: '2026-09-01T00:00:00Z',
        unitFailPaths: [],
        unitAllPassed: false,
      },
      {
        runId: 1,
        attempt: 2,
        createdAt: '2026-09-01T00:00:00Z',
        unitFailPaths: [],
        unitAllPassed: true,
      },
    ];

    expect(collectSameShaHitsForGroup(snapshots, [modifiedFile])).toEqual([]);
  });

  it('does not flag a FAIL path that is not in the modified file set', () => {
    expect(
      collectSameShaHitsForGroup(failThenPassRerun(), [otherFile]),
    ).toEqual([]);
    expect(intersectWithModifiedFiles([modifiedFile], [otherFile])).toEqual([]);
  });
});

describe('different SHA fail then pass', () => {
  it('does not pair a FAIL on SHA A with a pass on SHA B', () => {
    const shaA = collectSameShaHitsForGroup(
      [
        {
          runId: 1,
          attempt: 1,
          createdAt: '2026-09-01T00:00:00Z',
          unitFailPaths: [modifiedFile],
          unitAllPassed: false,
        },
      ],
      [modifiedFile],
    );
    const shaB = collectSameShaHitsForGroup(
      [
        {
          runId: 2,
          attempt: 1,
          createdAt: '2026-09-02T00:00:00Z',
          unitFailPaths: [],
          unitAllPassed: true,
        },
      ],
      [modifiedFile],
    );

    expect(shaA).toEqual([]);
    expect(shaB).toEqual([]);
    expect(
      aggregateHitsByFile([...shaA, ...shaB], (id) => `https://example/${id}`)
        .size,
    ).toBe(0);
  });
});

describe('renderSameShaHistoryTable', () => {
  it('renders count and example run link', () => {
    expect(
      renderSameShaHistoryTable([
        {
          path: modifiedFile,
          flaky: true,
          sameShaFailThenPass: 1,
          exampleRunUrl: 'https://github.com/org/repo/actions/runs/10',
        },
      ]),
    ).toContain(
      '| `app/core/createAsyncBatcher.test.ts` | 1 | [run](https://github.com/org/repo/actions/runs/10) |',
    );
  });

  it('renders the empty-window copy', () => {
    expect(renderSameShaHistoryTable([])).toBe(
      'No same-SHA unit-test fail-then-pass found for the changed tests in the sampled window.',
    );
  });
});
