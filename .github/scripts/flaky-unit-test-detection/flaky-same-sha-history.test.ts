import {
  aggregateHitsByFile,
  buildShaBatchQuery,
  candidateShaGroupsNewestFirst,
  chunkArray,
  classifyLoglessJob,
  confirmedFailThenPassJobs,
  groupRunsByHeadSha,
  historyCoverageComplete,
  hitsFromConfirmedLogs,
  intersectWithModifiedFiles,
  isCandidateShaGroup,
  jobIdFromDetailsUrl,
  jobLogUrl,
  listedWorkflowRunFromApi,
  lookbackDayBuckets,
  parseJestFailPaths,
  parseShaBatchResponse,
  renderCoverageWindowLine,
  renderInfrastructureFailuresLine,
  renderSameShaHistoryTable,
  renderUnattributedRerunsLine,
  shouldPostAllClear,
  summarizeCoverageWindow,
  unansweredModifiedFiles,
  type CoverageWindow,
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
  it('treats a re-run of a failed commit as a candidate', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 1, runAttempt: 1, conclusion: 'failure' }),
        run({ id: 1, runAttempt: 2, conclusion: 'success' }),
      ]),
    ).toBe(true);
  });

  it('keeps a re-run that stayed red, where only the unit job recovered', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 1, runAttempt: 1, conclusion: 'failure' }),
        run({ id: 1, runAttempt: 2, conclusion: 'failure' }),
      ]),
    ).toBe(true);
  });

  it('skips a re-run of an already green commit', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 1, runAttempt: 1, conclusion: 'success' }),
        run({ id: 1, runAttempt: 2, conclusion: 'success' }),
      ]),
    ).toBe(false);
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

  it('skips two failed run ids with no success and no re-run', () => {
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

  it('asks only for GitHub Actions suites and for totalCount on every page', () => {
    const { query } = buildShaBatchQuery(
      ['aaa'],
      'MetaMask',
      'metamask-mobile',
    );

    expect(query).toContain('filterBy: { appId: 15368 }');
    expect(query.match(/totalCount/g)).toHaveLength(3);
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

    expect(sha).toEqual({ headSha: 'dead', suites: [], truncated: false });
  });

  it('reports no truncation when every connection returned all its nodes', () => {
    const [sha] = parseShaBatchResponse(rerunFixture, [
      '4c386e4f037e0a5adfd69a0e7666840af2253bb9',
    ]);

    expect(sha.truncated).toBe(false);
  });

  it('flags a ci suite whose check runs were clipped', () => {
    const clipped = {
      repository: {
        c0: {
          oid: 'abc',
          checkSuites: {
            totalCount: 1,
            nodes: [
              {
                workflowRun: {
                  databaseId: 1,
                  runAttempt: 1,
                  workflow: { name: 'ci' },
                },
                failed: { totalCount: 80, nodes: [] },
                passed: { totalCount: 0, nodes: [] },
              },
            ],
          },
        },
      },
    };

    expect(parseShaBatchResponse(clipped, ['abc'])[0].truncated).toBe(true);
  });

  it('flags a commit whose suite page was clipped', () => {
    const clipped = {
      repository: {
        c0: {
          oid: 'abc',
          checkSuites: { totalCount: 60, nodes: [] },
        },
      },
    };

    expect(parseShaBatchResponse(clipped, ['abc'])[0].truncated).toBe(true);
  });

  it('ignores a clipped check-run page outside a ci suite', () => {
    const clipped = {
      repository: {
        c0: {
          oid: 'abc',
          checkSuites: {
            totalCount: 1,
            nodes: [
              {
                workflowRun: {
                  databaseId: 1,
                  runAttempt: 1,
                  workflow: { name: 'Flaky unit test detection' },
                },
                failed: { totalCount: 80, nodes: [] },
                passed: { totalCount: 0, nodes: [] },
              },
            ],
          },
        },
      },
    };

    expect(parseShaBatchResponse(clipped, ['abc'])[0].truncated).toBe(false);
  });
});

const shaResult = (suites: ShaCheckResult['suites']): ShaCheckResult => ({
  headSha: 'abc',
  suites,
  truncated: false,
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
        unreadFailedRuns: 0,
      }),
    ).toBe(true);
  });

  it('is complete when the walk finished with some files unanswered', () => {
    expect(
      historyCoverageComplete({
        everyFileHasHit: false,
        walkedAllCandidates: true,
        unreadFailedRuns: 0,
      }),
    ).toBe(true);
  });

  it('is incomplete when a cap ended the walk with files still unanswered', () => {
    expect(
      historyCoverageComplete({
        everyFileHasHit: false,
        walkedAllCandidates: false,
        unreadFailedRuns: 0,
      }),
    ).toBe(false);
  });

  it('is incomplete when a re-run could still read a confirmed fail-then-pass log', () => {
    expect(
      historyCoverageComplete({
        everyFileHasHit: false,
        walkedAllCandidates: true,
        unreadFailedRuns: 2,
      }),
    ).toBe(false);
    expect(
      historyCoverageComplete({
        everyFileHasHit: true,
        walkedAllCandidates: true,
        unreadFailedRuns: 1,
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

describe('lookbackDayBuckets', () => {
  it('returns one day per lookback day, newest first', () => {
    const days = lookbackDayBuckets(new Date('2026-09-21T10:00:00Z'), 3);

    expect(days).toEqual(['2026-09-21', '2026-09-20', '2026-09-19']);
  });

  it('returns nothing for a zero-day window', () => {
    expect(lookbackDayBuckets(new Date('2026-09-21T10:00:00Z'), 0)).toEqual([]);
  });
});

describe('summarizeCoverageWindow', () => {
  it('reports the dates actually sampled rather than the dates requested', () => {
    const window = summarizeCoverageWindow({
      runs: [
        run({ id: 1, createdAt: '2026-09-19T08:00:00Z' }),
        run({ id: 2, createdAt: '2026-09-21T08:00:00Z' }),
        run({ id: 3, createdAt: '2026-09-20T08:00:00Z' }),
      ],
      lookbackDays: 14,
      cappedDays: ['2026-09-20'],
    });

    expect(window).toEqual({
      lookbackDays: 14,
      runsListed: 3,
      oldestRunSampled: '2026-09-19',
      newestRunSampled: '2026-09-21',
      cappedDays: ['2026-09-20'],
    });
  });

  it('leaves the dates empty when nothing was listed', () => {
    const window = summarizeCoverageWindow({
      runs: [],
      lookbackDays: 14,
      cappedDays: [],
    });

    expect(window.oldestRunSampled).toBe('');
    expect(window.newestRunSampled).toBe('');
  });
});

const coverageWindow: CoverageWindow = {
  lookbackDays: 14,
  runsListed: 1204,
  oldestRunSampled: '2026-09-08',
  newestRunSampled: '2026-09-21',
  cappedDays: [],
};

describe('renderCoverageWindowLine', () => {
  it('states the dates and commits a complete walk covered', () => {
    const line = renderCoverageWindowLine({
      window: coverageWindow,
      candidatesInspected: 489,
      candidateShaCount: 489,
      complete: true,
    });

    expect(line).toBe(
      '_History coverage: 2026-09-08 to 2026-09-21, 1204 ci run(s), 489 candidate commit(s) inspected._',
    );
  });

  it('quotes inspected out of found when the walk was cut short', () => {
    const line = renderCoverageWindowLine({
      window: coverageWindow,
      candidatesInspected: 412,
      candidateShaCount: 489,
      complete: false,
    });

    expect(line).toContain('412 of 489 candidate commit(s) inspected');
    expect(line).toContain('History coverage incomplete');
  });

  it('names unread fail-then-pass logs when they blocked coverage', () => {
    expect(
      renderCoverageWindowLine({
        window: coverageWindow,
        candidatesInspected: 5,
        candidateShaCount: 5,
        unreadFailedRuns: 2,
        complete: false,
      }),
    ).toContain('2 confirmed fail-then-pass log(s) could not be read');
  });

  it('points at the findings table only when it rendered rows', () => {
    expect(
      renderCoverageWindowLine({
        window: coverageWindow,
        candidatesInspected: 1,
        candidateShaCount: 2,
        complete: false,
        hasFindings: true,
      }),
    ).toContain('Findings above are a lower bound');

    const empty = renderCoverageWindowLine({
      window: coverageWindow,
      candidatesInspected: 1,
      candidateShaCount: 2,
      complete: false,
      hasFindings: false,
    });
    expect(empty).not.toContain('Findings above');
    expect(empty).toContain('this is not an all-clear');
  });

  it('falls back to the requested window when nothing was sampled', () => {
    expect(
      renderCoverageWindowLine({
        window: {
          ...coverageWindow,
          oldestRunSampled: '',
          newestRunSampled: '',
        },
        candidatesInspected: 0,
        candidateShaCount: 0,
        complete: true,
      }),
    ).toContain('last 14 day(s)');
  });
});

describe('classifyLoglessJob', () => {
  it('reads a step still in progress as a lost runner', () => {
    expect(
      classifyLoglessJob({
        steps: [
          { status: 'completed', conclusion: 'success' },
          { status: 'in_progress', conclusion: null },
        ],
      }),
    ).toBe('infrastructure');
  });

  it('reads a job with no steps as a lost runner', () => {
    expect(classifyLoglessJob({ steps: [] })).toBe('infrastructure');
    expect(classifyLoglessJob({})).toBe('infrastructure');
  });

  it('reads completed steps with no failure as a lost runner', () => {
    expect(
      classifyLoglessJob({
        steps: [{ status: 'completed', conclusion: 'cancelled' }],
      }),
    ).toBe('infrastructure');
  });

  it('reads a completed failing step as a real failure with a lost log', () => {
    expect(
      classifyLoglessJob({
        steps: [
          { status: 'completed', conclusion: 'success' },
          { status: 'completed', conclusion: 'failure' },
        ],
      }),
    ).toBe('missing_log');
  });
});

describe('renderUnattributedRerunsLine', () => {
  it('renders nothing when every re-run was attributed', () => {
    expect(renderUnattributedRerunsLine([], 'https://github.com', 'o/r')).toBe(
      '',
    );
  });

  it('names the shard and links its job log', () => {
    const line = renderUnattributedRerunsLine(
      [
        {
          jobName: 'Unit tests (8)',
          runId: 10,
          jobId: 99,
          reason: 'missing_log',
        },
      ],
      'https://github.com',
      'o/r',
    );

    expect(line).toContain(
      '[Unit tests (8)](https://github.com/o/r/actions/runs/10/job/99) (log missing)',
    );
    expect(line).toContain('Low signal');
  });

  it('counts the re-runs it did not name', () => {
    const line = renderUnattributedRerunsLine(
      [{ jobName: 'Unit tests (1)', runId: 1, jobId: 2, reason: 'unread' }],
      'https://github.com',
      'o/r',
      4,
    );

    expect(line).toContain('4 unit-test re-run(s)');
    expect(line).toContain('and 3 more');
  });
});

describe('renderInfrastructureFailuresLine', () => {
  it('renders nothing when no runner was lost', () => {
    expect(renderInfrastructureFailuresLine(0)).toBe('');
  });

  it('says lost runners carry no test signal', () => {
    expect(renderInfrastructureFailuresLine(2)).toContain(
      'they carry no test signal',
    );
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
