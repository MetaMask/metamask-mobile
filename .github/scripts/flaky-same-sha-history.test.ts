import {
  aggregateHitsByFile,
  buildShaBatchQuery,
  candidateShaGroupsNewestFirst,
  chunkArray,
  confirmedFailThenPassJobs,
  filesToAnalyzeWithHistoryHits,
  groupRunsByHeadSha,
  historyCoverageComplete,
  hitsFromConfirmedLogs,
  intersectWithModifiedFiles,
  isCandidateShaGroup,
  jobIdFromDetailsUrl,
  jobLogUrl,
  listedWorkflowRunFromApi,
  parseJestFailPaths,
  parseShaBatchResponse,
  renderIncompleteCoverageLine,
  renderSameShaHistoryTable,
  shouldPostAllClear,
  unansweredModifiedFiles,
  type ListedWorkflowRun,
  type ShaCheckResult,
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

describe('listedWorkflowRunFromApi', () => {
  it('defaults a missing run_attempt to 1', () => {
    expect(
      listedWorkflowRunFromApi({
        id: 1,
        conclusion: 'success',
        created_at: '2026-09-01T00:00:00Z',
        head_sha: 'abc',
      }).runAttempt,
    ).toBe(1);
  });
});

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
  it('treats a rerun as a candidate even without a listed failure', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 1, runAttempt: 2, conclusion: 'success' }),
      ]),
    ).toBe(true);
  });

  it('treats two run ids with a failure and a success as a candidate', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 1 }),
        run({ id: 2, conclusion: 'success' }),
      ]),
    ).toBe(true);
  });

  it('skips two successful run ids with no failure', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 1, conclusion: 'success' }),
        run({ id: 2, conclusion: 'success' }),
      ]),
    ).toBe(false);
  });

  it('skips two failed run ids with no success', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 1, conclusion: 'failure' }),
        run({ id: 2, conclusion: 'failure' }),
      ]),
    ).toBe(false);
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

describe('chunkArray', () => {
  it('splits into batches of the given size', () => {
    expect(chunkArray(['a', 'b', 'c', 'd', 'e'], 2)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e'],
    ]);
  });
});

describe('buildShaBatchQuery', () => {
  it('aliases each SHA as c0, c1, … with GitObjectID variables', () => {
    const { query, variables } = buildShaBatchQuery(
      ['aaa', 'bbb'],
      'MetaMask',
      'metamask-mobile',
    );

    expect(variables).toEqual({
      owner: 'MetaMask',
      name: 'metamask-mobile',
      sha0: 'aaa',
      sha1: 'bbb',
    });
    expect(query).toContain('c0: object(oid: $sha0)');
    expect(query).toContain('c1: object(oid: $sha1)');
    expect(query).toContain('checkType: ALL, conclusions: [FAILURE]');
    expect(query).toContain('checkType: LATEST, conclusions: [SUCCESS]');
  });
});

describe('jobIdFromDetailsUrl', () => {
  it('parses run id and job id from a GitHub detailsUrl', () => {
    expect(
      jobIdFromDetailsUrl(
        'https://github.com/MetaMask/metamask-mobile/actions/runs/35130023071/job/104908899143',
      ),
    ).toEqual({ runId: 35130023071, jobId: 104908899143 });
  });

  it('returns null when the URL has no job id', () => {
    expect(
      jobIdFromDetailsUrl('https://github.com/MetaMask/metamask-mobile'),
    ).toBeNull();
  });
});

const rerunFixture = {
  repository: {
    c0: {
      oid: '4c386e4f037e0a5adfd69a0e7666840af2253bb9',
      checkSuites: {
        nodes: [
          {
            workflowRun: {
              databaseId: 35130017888,
              runAttempt: 1,
              workflow: { name: 'Flaky unit test detection' },
            },
            failed: { nodes: [] },
            passed: { nodes: [] },
          },
          {
            workflowRun: {
              databaseId: 35130023071,
              runAttempt: 2,
              workflow: { name: 'ci' },
            },
            failed: {
              nodes: [
                {
                  name: 'Unit tests (8)',
                  detailsUrl:
                    'https://github.com/MetaMask/metamask-mobile/actions/runs/35130023071/job/104908899143',
                },
                {
                  name: 'E2E tests',
                  detailsUrl:
                    'https://github.com/MetaMask/metamask-mobile/actions/runs/35130023071/job/1',
                },
              ],
            },
            passed: {
              nodes: [{ name: 'Unit tests (8)' }, { name: 'Unit tests (1)' }],
            },
          },
        ],
      },
    },
  },
};

describe('parseShaBatchResponse', () => {
  it('keeps only ci Unit tests failures and parses the job id', () => {
    const [sha] = parseShaBatchResponse(rerunFixture, [
      '4c386e4f037e0a5adfd69a0e7666840af2253bb9',
    ]);

    expect(sha.suites).toHaveLength(1);
    expect(sha.suites[0].failedUnit).toEqual([
      {
        name: 'Unit tests (8)',
        jobId: 104908899143,
        runId: 35130023071,
        runAttempt: 2,
        suiteOrder: 35130023071,
      },
    ]);
    expect(sha.suites[0].passedUnitNames).toEqual([
      'Unit tests (8)',
      'Unit tests (1)',
    ]);
  });

  it('returns an empty suite list when the commit object is missing', () => {
    const [sha] = parseShaBatchResponse({ repository: { c0: null } }, ['dead']);

    expect(sha).toEqual({ headSha: 'dead', suites: [] });
  });
});

const shaResult = (suites: ShaCheckResult['suites']): ShaCheckResult => ({
  headSha: 'abc',
  suites,
});

describe('confirmedFailThenPassJobs', () => {
  it('confirms a same-suite re-run when LATEST SUCCESS includes the failed job name', () => {
    expect(
      confirmedFailThenPassJobs(
        shaResult([
          {
            suiteOrder: 10,
            runId: 10,
            runAttempt: 2,
            failedUnit: [
              {
                name: 'Unit tests (8)',
                jobId: 111,
                runId: 10,
                runAttempt: 2,
                suiteOrder: 10,
              },
            ],
            passedUnitNames: ['Unit tests (8)'],
          },
        ]),
      ),
    ).toEqual([{ name: 'Unit tests (8)', jobId: 111, runId: 10 }]);
  });

  it('confirms a later ci suite that passed the same job name', () => {
    expect(
      confirmedFailThenPassJobs(
        shaResult([
          {
            suiteOrder: 1,
            runId: 1,
            runAttempt: 1,
            failedUnit: [
              {
                name: 'Unit tests (8)',
                jobId: 111,
                runId: 1,
                runAttempt: 1,
                suiteOrder: 1,
              },
            ],
            passedUnitNames: [],
          },
          {
            suiteOrder: 2,
            runId: 2,
            runAttempt: 1,
            failedUnit: [],
            passedUnitNames: ['Unit tests (8)'],
          },
        ]),
      ),
    ).toEqual([{ name: 'Unit tests (8)', jobId: 111, runId: 1 }]);
  });

  it('does not confirm when the retry also failed', () => {
    expect(
      confirmedFailThenPassJobs(
        shaResult([
          {
            suiteOrder: 10,
            runId: 10,
            runAttempt: 2,
            failedUnit: [
              {
                name: 'Unit tests (8)',
                jobId: 111,
                runId: 10,
                runAttempt: 2,
                suiteOrder: 10,
              },
            ],
            passedUnitNames: ['Unit tests (1)'],
          },
        ]),
      ),
    ).toEqual([]);
  });

  it('does not confirm when a different shard passed', () => {
    expect(
      confirmedFailThenPassJobs(
        shaResult([
          {
            suiteOrder: 10,
            runId: 10,
            runAttempt: 2,
            failedUnit: [
              {
                name: 'Unit tests (8)',
                jobId: 111,
                runId: 10,
                runAttempt: 2,
                suiteOrder: 10,
              },
            ],
            passedUnitNames: ['Unit tests (3)'],
          },
        ]),
      ),
    ).toEqual([]);
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

describe('hitsFromConfirmedLogs', () => {
  it('attributes FAIL paths from a confirmed job to modified files', () => {
    const failPaths = new Map<number, string[]>([
      [111, [modifiedFile, otherFile]],
    ]);

    expect(
      hitsFromConfirmedLogs(
        [{ name: 'Unit tests (8)', jobId: 111, runId: 10 }],
        failPaths,
        [modifiedFile],
      ),
    ).toEqual([{ path: modifiedFile, failRunId: 10, jobId: 111 }]);
  });

  it('does not flag a FAIL path that is not in the modified file set', () => {
    expect(intersectWithModifiedFiles([modifiedFile], [otherFile])).toEqual([]);
  });
});

describe('unansweredModifiedFiles and early exit', () => {
  it('drops files that already have a hit', () => {
    expect(
      unansweredModifiedFiles(
        [modifiedFile, otherFile],
        [{ path: modifiedFile }],
      ),
    ).toEqual([otherFile]);
  });

  it('is empty when every modified file has a hit', () => {
    expect(
      unansweredModifiedFiles(
        [modifiedFile],
        [{ path: modifiedFile }, { path: modifiedFile }],
      ),
    ).toEqual([]);
  });
});

describe('historyCoverageComplete', () => {
  it('is complete when every file has a hit even if candidates remain', () => {
    expect(
      historyCoverageComplete({
        everyFileHasHit: true,
        walkedAllCandidates: false,
      }),
    ).toBe(true);
  });

  it('is complete when the walk finished with some files unanswered', () => {
    expect(
      historyCoverageComplete({
        everyFileHasHit: false,
        walkedAllCandidates: true,
      }),
    ).toBe(true);
  });

  it('is incomplete when a cap ended the walk with files still unanswered', () => {
    expect(
      historyCoverageComplete({
        everyFileHasHit: false,
        walkedAllCandidates: false,
      }),
    ).toBe(false);
  });
});

describe('shouldPostAllClear', () => {
  it('posts all-clear only when there are no findings and history finished', () => {
    expect(shouldPostAllClear(false, true)).toBe(true);
  });

  it('does not post all-clear when history coverage is incomplete', () => {
    expect(shouldPostAllClear(false, false)).toBe(false);
  });

  it('does not post all-clear when findings exist', () => {
    expect(shouldPostAllClear(true, true)).toBe(false);
  });
});

describe('different SHA fail then pass', () => {
  it('does not pair a FAIL on SHA A with a pass on SHA B', () => {
    const shaA = hitsFromConfirmedLogs(
      [{ name: 'Unit tests (8)', jobId: 1, runId: 1 }],
      new Map([[1, [modifiedFile]]]),
      [modifiedFile],
    );
    const shaBJobs = confirmedFailThenPassJobs(
      shaResult([
        {
          suiteOrder: 2,
          runId: 2,
          runAttempt: 1,
          failedUnit: [],
          passedUnitNames: ['Unit tests (8)'],
        },
      ]),
    );

    expect(shaA).toEqual([{ path: modifiedFile, failRunId: 1, jobId: 1 }]);
    expect(shaBJobs).toEqual([]);
    expect(
      aggregateHitsByFile(shaA, (runId, jobId) =>
        jobLogUrl('https://github.com', 'org/repo', runId, jobId),
      ).get(modifiedFile)?.exampleRunUrl,
    ).toBe('https://github.com/org/repo/actions/runs/1/job/1');
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

describe('renderIncompleteCoverageLine', () => {
  it('states how many candidate SHAs were inspected', () => {
    expect(
      renderIncompleteCoverageLine({
        candidatesInspected: 200,
        candidateShaCount: 230,
      }),
    ).toContain('inspected 200 of 230 candidate SHA(s)');
  });
});

describe('jobLogUrl', () => {
  it('points at the GitHub job log page, not the workflow-run summary', () => {
    const url = jobLogUrl(
      'https://github.com',
      'MetaMask/metamask-mobile',
      10,
      99,
    );

    expect(url).toBe(
      'https://github.com/MetaMask/metamask-mobile/actions/runs/10/job/99',
    );
    expect(url).not.toMatch(/\/actions\/runs\/10$/);
  });
});

describe('filesToAnalyzeWithHistoryHits', () => {
  it('keeps needsAnalysis order and appends flaky paths that were skipped as unchanged', () => {
    const needsAnalysis = ['app/new.test.ts', 'app/also-new.test.ts'];
    const historyFiles = [
      { path: 'app/new.test.ts', flaky: true },
      { path: 'app/unchanged-flaky.test.ts', flaky: true },
      { path: 'app/quiet.test.ts', flaky: false },
    ];

    expect(filesToAnalyzeWithHistoryHits(needsAnalysis, historyFiles)).toEqual([
      'app/new.test.ts',
      'app/also-new.test.ts',
      'app/unchanged-flaky.test.ts',
    ]);
  });

  it('does not duplicate a flaky file already in needsAnalysis', () => {
    expect(
      filesToAnalyzeWithHistoryHits(
        ['app/new.test.ts'],
        [{ path: 'app/new.test.ts', flaky: true }],
      ),
    ).toEqual(['app/new.test.ts']);
  });
});

describe('aggregateHitsByFile', () => {
  it('stores the first confirmed job log URL for a file', () => {
    const byFile = aggregateHitsByFile(
      [
        { path: modifiedFile, failRunId: 10, jobId: 99 },
        { path: modifiedFile, failRunId: 11, jobId: 88 },
      ],
      (runId, jobId) =>
        jobLogUrl('https://github.com', 'org/repo', runId, jobId),
    );

    expect(byFile.get(modifiedFile)).toEqual({
      count: 2,
      exampleRunUrl: 'https://github.com/org/repo/actions/runs/10/job/99',
    });
  });
});
