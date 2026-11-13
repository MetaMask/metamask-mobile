import {
  attemptJobFromApi,
  candidateShaGroupsNewestFirst,
  classifyBatchFailure,
  classifyLoglessJob,
  MAX_FAILED_JOB_LISTS,
  confirmedFailThenPassJobs,
  groupRunsByHeadSha,
  isCandidateShaGroup,
  jobListTruncated,
  jobLogUrl,
  listedWorkflowRunFromApi,
  allHitsFromConfirmedLogs,
  parseJestFailPaths,
  renderCoverageWindowLine,
  renderInfrastructureFailuresLine,
  renderUnattributedRerunsLine,
  shouldPostAllClear,
  type AttemptJob,
  type CoverageWindow,
  type ListedWorkflowRun,
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

  // listWorkflowRuns returns one row, the latest attempt. A green re-run
  // therefore has no listed failure. Dropping that row is how the index
  // recorded zero hits on nights that otherwise finished.
  it('keeps a green latest attempt when earlier attempts are not listed', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 43118958390, runAttempt: 2, conclusion: 'success' }),
      ]),
    ).toBe(true);
  });

  it('keeps a cancelled re-run whose earlier attempt is not listed', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 1, runAttempt: 2, conclusion: 'cancelled' }),
      ]),
    ).toBe(true);
  });

  it('keeps a re-run when an earlier attempt number is missing', () => {
    expect(
      isCandidateShaGroup([
        run({ id: 1, runAttempt: 2, conclusion: 'success' }),
        run({ id: 1, runAttempt: 3, conclusion: 'success' }),
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

const job = (overrides: Partial<AttemptJob> & Pick<AttemptJob, 'id'>): AttemptJob => ({
  runId: 10,
  runAttempt: 1,
  name: 'Unit tests (8)',
  conclusion: 'failure',
  ...overrides,
});

describe('attemptJobFromApi', () => {
  it('defaults a missing attempt to 1', () => {
    expect(
      attemptJobFromApi({
        id: 5,
        run_id: 10,
        name: 'Unit tests (4)',
        conclusion: 'success',
      }),
    ).toEqual({
      id: 5,
      runId: 10,
      runAttempt: 1,
      name: 'Unit tests (4)',
      conclusion: 'success',
    });
  });
});

describe('jobListTruncated', () => {
  // ci.yml runs carry well over 100 jobs. A fixed first:100 page is not the
  // whole list, and treating it as complete is what left weekend days gapped.
  it('flags a first page that stopped short of total_count', () => {
    expect(jobListTruncated(100, 142)).toBe(true);
  });

  it('accepts a list that fetched every job the endpoint reported', () => {
    expect(jobListTruncated(142, 142)).toBe(false);
    expect(jobListTruncated(32, 32)).toBe(false);
  });

  it('does not flag a response that omitted total_count', () => {
    expect(jobListTruncated(100, null)).toBe(false);
  });
});

describe('confirmedFailThenPassJobs', () => {
  it('confirms a later attempt of the same run and job name', () => {
    expect(
      confirmedFailThenPassJobs([
        job({ id: 111, runAttempt: 1, conclusion: 'failure' }),
        job({ id: 222, runAttempt: 2, conclusion: 'success' }),
      ]),
    ).toEqual([{ name: 'Unit tests (8)', jobId: 111, runId: 10 }]);
  });

  it('confirms a later ci run that passed the same job name', () => {
    expect(
      confirmedFailThenPassJobs([
        job({ id: 111, runId: 1, runAttempt: 1, conclusion: 'failure' }),
        job({ id: 222, runId: 2, runAttempt: 1, conclusion: 'success' }),
      ]),
    ).toEqual([{ name: 'Unit tests (8)', jobId: 111, runId: 1 }]);
  });

  it('does not confirm when the retry also failed', () => {
    expect(
      confirmedFailThenPassJobs([
        job({ id: 111, runAttempt: 1, conclusion: 'failure' }),
        job({ id: 222, runAttempt: 2, conclusion: 'failure' }),
        job({
          id: 333,
          runAttempt: 2,
          name: 'Unit tests (1)',
          conclusion: 'success',
        }),
      ]),
    ).toEqual([]);
  });

  it('does not confirm when a different shard passed', () => {
    expect(
      confirmedFailThenPassJobs([
        job({ id: 111, conclusion: 'failure' }),
        job({
          id: 222,
          runAttempt: 2,
          name: 'Unit tests (3)',
          conclusion: 'success',
        }),
      ]),
    ).toEqual([]);
  });

  it('ignores jobs that are not unit-test shards', () => {
    expect(
      confirmedFailThenPassJobs([
        job({ id: 1, name: 'Integration tests (1)', conclusion: 'failure' }),
        job({
          id: 2,
          name: 'Integration tests (1)',
          runAttempt: 2,
          conclusion: 'success',
        }),
      ]),
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
    const shaA = allHitsFromConfirmedLogs(
      [{ name: 'Unit tests (8)', jobId: 1, runId: 1 }],
      new Map([[1, [modifiedFile]]]),
    );
    const shaBJobs = confirmedFailThenPassJobs([
      job({ id: 2, runId: 2, conclusion: 'success' }),
    ]);

    expect(shaA).toEqual([{ path: modifiedFile, failRunId: 1, jobId: 1 }]);
    expect(shaBJobs).toEqual([]);
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

describe('classifyBatchFailure', () => {
  it('stops the walk on a rate limit', () => {
    expect(classifyBatchFailure({ status: 403, failedBatches: 1 })).toBe(
      'stop',
    );
    expect(classifyBatchFailure({ status: 429, failedBatches: 1 })).toBe(
      'stop',
    );
  });

  // A 502 lost one run; the remaining candidates are still worth inspecting.
  it('skips the run on a transient server error', () => {
    expect(classifyBatchFailure({ status: 502, failedBatches: 1 })).toBe(
      'skip',
    );
    expect(classifyBatchFailure({ status: null, failedBatches: 1 })).toBe(
      'skip',
    );
  });

  it('stops once failures look like an outage rather than a blip', () => {
    expect(
      classifyBatchFailure({
        status: 502,
        failedBatches: MAX_FAILED_JOB_LISTS,
      }),
    ).toBe('stop');
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

describe('allHitsFromConfirmedLogs', () => {
  const job = (jobId: number) => ({
    name: 'Unit tests (3)',
    runId: 100,
    jobId,
  });

  it('keeps every unit test the job reported failing', () => {
    const hits = allHitsFromConfirmedLogs(
      [job(1)],
      new Map([[1, ['app/a.test.ts', 'app/b.test.ts']]]),
    );

    expect(hits.map((hit) => hit.path)).toStrictEqual([
      'app/a.test.ts',
      'app/b.test.ts',
    ]);
  });

  // The index is not built for any one PR, so nothing narrows it to a file set.
  it('does not narrow to a modified-file set', () => {
    const hits = allHitsFromConfirmedLogs(
      [job(1)],
      new Map([[1, ['app/unrelated.test.ts']]]),
    );

    expect(hits).toHaveLength(1);
  });

  it('drops paths the detector would never look up', () => {
    const hits = allHitsFromConfirmedLogs(
      [job(1)],
      new Map([
        [
          1,
          [
            'app/a.view.test.tsx',
            'tests/smoke-appium/x.spec.ts',
            'app/b.test.ts',
          ],
        ],
      ]),
    );

    expect(hits.map((hit) => hit.path)).toStrictEqual(['app/b.test.ts']);
  });

  it('counts a path once per job even when the log repeats it', () => {
    const hits = allHitsFromConfirmedLogs(
      [job(1)],
      new Map([[1, ['app/a.test.ts', 'app/a.test.ts']]]),
    );

    expect(hits).toHaveLength(1);
  });

  it('carries the run and job that produced each hit', () => {
    const hits = allHitsFromConfirmedLogs(
      [job(7)],
      new Map([[7, ['app/a.test.ts']]]),
    );

    expect(hits[0]).toStrictEqual({
      path: 'app/a.test.ts',
      failRunId: 100,
      jobId: 7,
    });
  });

  it('is empty when no log could be parsed', () => {
    expect(allHitsFromConfirmedLogs([job(1)], new Map())).toStrictEqual([]);
  });
});

describe('renderCoverageWindowLine', () => {
  const coverage = (
    overrides: Partial<CoverageWindow> = {},
  ): CoverageWindow => ({
    staleDays: 1,
    daysCovered: 90,
    gapDays: [],
    oldestDay: '2026-06-24',
    newestDay: '2026-09-20',
    complete: true,
    ...overrides,
  });

  it('states the window a clean result is true of', () => {
    const line = renderCoverageWindowLine({
      coverage: coverage(),
      runsScanned: 28400,
    });

    expect(line).toBe(
      '_History coverage: 2026-06-24 to 2026-09-20, 90 day(s), 28400 ci run(s)._',
    );
  });

  // A reader who sees no findings has no other way to tell a clean history
  // from an index that was never built.
  it('says the history is unknown rather than clean when there is no index', () => {
    const line = renderCoverageWindowLine({
      coverage: coverage({ daysCovered: 0, complete: false }),
      runsScanned: 0,
    });

    expect(line).toContain('the flaky history index is unavailable');
    expect(line).not.toContain('coverage incomplete');
  });

  it('names how far behind a stale index is', () => {
    const line = renderCoverageWindowLine({
      coverage: coverage({ staleDays: 5, complete: false }),
      runsScanned: 28400,
    });

    expect(line).toContain('last built 5 day(s) ago');
    expect(line).toContain('not an all-clear');
  });

  it('counts the days inside the window that were never walked', () => {
    const line = renderCoverageWindowLine({
      coverage: coverage({
        complete: false,
        gapDays: ['2026-09-01', '2026-09-02'],
      }),
      runsScanned: 28400,
    });

    expect(line).toContain(
      '2 day(s) inside the window were never fully walked',
    );
  });

  it('does not mention staleness for a normal nightly lag', () => {
    const line = renderCoverageWindowLine({
      coverage: coverage({
        staleDays: 1,
        complete: false,
        gapDays: ['2026-09-01'],
      }),
      runsScanned: 10,
    });

    expect(line).not.toContain('last built');
  });

  it('calls findings a lower bound only when the table has rows', () => {
    const incomplete = coverage({ complete: false, gapDays: ['2026-09-01'] });

    expect(
      renderCoverageWindowLine({
        coverage: incomplete,
        runsScanned: 1,
        hasFindings: true,
      }),
    ).toContain('lower bound');
    expect(
      renderCoverageWindowLine({
        coverage: incomplete,
        runsScanned: 1,
        hasFindings: false,
      }),
    ).toContain('Nothing was found in the covered range');
  });
});
