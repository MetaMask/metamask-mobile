import {
  HEAVY_DAY_REST_REQUESTS,
  MAX_REST_REQUESTS_PER_DAY,
  newWalkBudget,
  orderDaysForWalk,
  requestShareForDay,
  walkDay,
} from './flaky-history-walk';

// Virtual because @actions/* is installed under .github/scripts, which the
// repo-wide jest run does not have on its resolution path.
jest.mock(
  '@actions/core',
  () => ({
    info: jest.fn(),
    warning: jest.fn(),
  }),
  { virtual: true },
);

jest.mock('@actions/github', () => ({ getOctokit: jest.fn() }), {
  virtual: true,
});

const FILE = 'app/core/createAsyncBatcher.test.ts';

/** Green latest attempt; Unit tests (4) failed then passed, split across two pages. */
const SAME_RUN_RERUN = {
  id: 43118958390,
  conclusion: 'success' as const,
  created_at: '2026-11-11T16:04:00Z',
  head_sha: 'recorded-same-run-rerun',
  run_attempt: 2,
};

const FAILED_JOB_ID = 1001;

type FixtureJob = {
  id: number;
  run_id: number;
  run_attempt: number;
  name: string;
  conclusion: string;
};

const sameRunRerunJobs: FixtureJob[] = [
  ...Array.from({ length: 100 }, (_, index) => ({
    id: index + 1,
    run_id: SAME_RUN_RERUN.id,
    run_attempt: 1,
    name: 'Lint',
    conclusion: 'success',
  })),
  {
    id: FAILED_JOB_ID,
    run_id: SAME_RUN_RERUN.id,
    run_attempt: 1,
    name: 'Unit tests (4)',
    conclusion: 'failure',
  },
  {
    id: 1002,
    run_id: SAME_RUN_RERUN.id,
    run_attempt: 2,
    name: 'Unit tests (4)',
    conclusion: 'success',
  },
];

type JobsRequest = {
  filter?: string;
  page?: number;
  per_page?: number;
  run_id?: number;
};

function jobsResponse(params: JobsRequest) {
  const visible =
    params.filter === 'all'
      ? sameRunRerunJobs
      : sameRunRerunJobs.filter((job) => job.run_attempt === SAME_RUN_RERUN.run_attempt);
  const page = params.page ?? 1;
  const perPage = params.per_page ?? 100;
  const start = (page - 1) * perPage;
  return {
    data: {
      total_count: visible.length,
      jobs: visible.slice(start, start + perPage),
    },
  };
}

function fakeOctokit() {
  return {
    rest: {
      actions: {
        listWorkflowRuns: jest.fn(async () => ({
          data: { total_count: 1, workflow_runs: [SAME_RUN_RERUN] },
        })),
        listJobsForWorkflowRun: jest.fn(async (params: JobsRequest) =>
          jobsResponse(params),
        ),
        downloadJobLogsForWorkflowRun: jest.fn(async () => ({
          data: `FAIL ${FILE}\n`,
        })),
        getJobForWorkflowRun: jest.fn(),
      },
    },
  };
}

describe('requestShareForDay', () => {
  it('gives the first queued day enough requests to finish a heavy weekday', () => {
    const first = requestShareForDay({ spent: 0 });

    expect(first).toBe(MAX_REST_REQUESTS_PER_DAY);
    expect(first).toBeGreaterThan(HEAVY_DAY_REST_REQUESTS);
  });

  it('does not divide the hour into shares too small to finish any day', () => {
    const shares: number[] = [];
    let spent = 0;
    for (let index = 0; index < 11; index += 1) {
      const share = requestShareForDay({ spent });
      shares.push(share);
      spent += share;
    }

    expect(shares[0]).toBeGreaterThan(Math.floor(40 / 11));
    expect(
      shares.filter((share) => share >= HEAVY_DAY_REST_REQUESTS).length,
    ).toBe(2);
    expect(shares.filter((share) => share === 0).length).toBeGreaterThan(0);
  });
});

describe('orderDaysForWalk', () => {
  it('walks fresh days before gap repairs', () => {
    const ordered = orderDaysForWalk(
      ['2026-10-30', '2026-11-07', '2026-11-12'],
      ['2026-10-30'],
    );

    expect(ordered).toEqual(['2026-11-07', '2026-11-12', '2026-10-30']);
    expect(requestShareForDay({ spent: 0 })).toBeGreaterThanOrEqual(
      HEAVY_DAY_REST_REQUESTS,
    );
  });
});

describe('walkDay', () => {
  it('records a hit for a same-run re-run whose latest attempt is green', async () => {
    const octokit = fakeOctokit();

    const result = await walkDay({
      octokit: octokit as never,
      owner: 'MetaMask',
      repo: 'metamask-mobile',
      day: '2026-11-11',
      budget: newWalkBudget(),
    });

    expect(octokit.rest.actions.listJobsForWorkflowRun).toHaveBeenCalledWith(
      expect.objectContaining({
        run_id: SAME_RUN_RERUN.id,
        filter: 'all',
        page: 1,
      }),
    );
    expect(octokit.rest.actions.listJobsForWorkflowRun).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(result.complete).toBe(true);
    expect(result.hits).toEqual([
      { path: FILE, runId: SAME_RUN_RERUN.id, jobId: FAILED_JOB_ID },
    ]);
  });

  it('leaves the day incomplete when the job list stops before total_count', async () => {
    const octokit = fakeOctokit();

    const result = await walkDay({
      octokit: octokit as never,
      owner: 'MetaMask',
      repo: 'metamask-mobile',
      day: '2026-11-11',
      budget: newWalkBudget(),
      // One request lists the run. The next fetches page 1 of 100 and stops
      // short of the attempt-2 pass on page 2.
      maxRequestsForDay: 2,
    });

    expect(octokit.rest.actions.listJobsForWorkflowRun).toHaveBeenCalledTimes(1);
    expect(result.complete).toBe(false);
    expect(result.hits).toEqual([]);
  });

  it('does not fetch jobs for a single attempt that already passed', async () => {
    const octokit = fakeOctokit();
    octokit.rest.actions.listWorkflowRuns.mockResolvedValue({
      data: {
        total_count: 1,
        workflow_runs: [{ ...SAME_RUN_RERUN, run_attempt: 1, conclusion: 'success' }],
      },
    });

    const result = await walkDay({
      octokit: octokit as never,
      owner: 'MetaMask',
      repo: 'metamask-mobile',
      day: '2026-11-08',
      budget: newWalkBudget(),
    });

    expect(octokit.rest.actions.listJobsForWorkflowRun).not.toHaveBeenCalled();
    expect(result.complete).toBe(true);
    expect(result.hits).toEqual([]);
  });
});
