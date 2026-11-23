import * as core from '@actions/core';
import {
  HEAVY_DAY_REST_REQUESTS,
  MAX_REST_REQUESTS_PER_DAY,
  MAX_UNREADABLE_RUNS_PER_DAY,
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
      : sameRunRerunJobs.filter(
          (job) => job.run_attempt === SAME_RUN_RERUN.run_attempt,
        );
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

  it('returns nothing when the leftover cannot finish a heavy weekday', () => {
    const share = requestShareForDay({
      spent: HEAVY_DAY_REST_REQUESTS * 2,
    });

    expect(share).toBe(0);
  });
});

describe('orderDaysForWalk', () => {
  it('walks fresh days before gap repairs, newest first', () => {
    const ordered = orderDaysForWalk(
      ['2026-10-30', '2026-11-07', '2026-11-12'],
      ['2026-10-30'],
    );

    expect(ordered).toEqual(['2026-11-12', '2026-11-07', '2026-10-30']);
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
      maxRequestsForDay: 2,
    });

    expect(octokit.rest.actions.listJobsForWorkflowRun).toHaveBeenCalledTimes(
      1,
    );
    expect(result.complete).toBe(false);
    expect(result.hits).toEqual([]);
  });

  it('starts no request once the wall-clock deadline has passed', async () => {
    const octokit = fakeOctokit();

    const result = await walkDay({
      octokit: octokit as never,
      owner: 'MetaMask',
      repo: 'metamask-mobile',
      day: '2026-11-11',
      budget: newWalkBudget(),
      deadlineMs: Date.now() - 1,
    });

    expect(octokit.rest.actions.listWorkflowRuns).not.toHaveBeenCalled();
    expect(result.complete).toBe(false);
  });

  it('keeps what it found and stays incomplete when the deadline passes mid-day', async () => {
    const octokit = fakeOctokit();
    const deadlineMs = Date.now() + 60_000;
    let now = deadlineMs - 1_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    octokit.rest.actions.listJobsForWorkflowRun.mockImplementation(
      async (params: JobsRequest) => {
        const response = jobsResponse(params);
        if (params.page === 2) {
          now = deadlineMs + 1;
        }
        return response;
      },
    );
    octokit.rest.actions.downloadJobLogsForWorkflowRun.mockResolvedValue({
      data: `FAIL ${FILE}\n`,
    });

    try {
      const result = await walkDay({
        octokit: octokit as never,
        owner: 'MetaMask',
        repo: 'metamask-mobile',
        day: '2026-11-11',
        budget: newWalkBudget(),
        deadlineMs,
      });

      expect(result.complete).toBe(false);
      expect(
        octokit.rest.actions.downloadJobLogsForWorkflowRun,
      ).not.toHaveBeenCalled();
    } finally {
      jest.restoreAllMocks();
    }
  });

  it('lists job pages for several runs at once but folds them in a stable order', async () => {
    const octokit = fakeOctokit();
    const runs = Array.from({ length: 12 }, (_, index) => ({
      ...SAME_RUN_RERUN,
      id: 5000 + index,
      head_sha: `sha-${index}`,
      run_attempt: 2,
      created_at: `2026-11-11T16:${String(10 + index)}:00Z`,
    }));
    octokit.rest.actions.listWorkflowRuns.mockResolvedValue({
      data: { total_count: runs.length, workflow_runs: runs },
    });
    let inFlight = 0;
    let peak = 0;
    octokit.rest.actions.listJobsForWorkflowRun.mockImplementation(
      async (params: JobsRequest) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return jobsResponse(params);
      },
    );

    const result = await walkDay({
      octokit: octokit as never,
      owner: 'MetaMask',
      repo: 'metamask-mobile',
      day: '2026-11-11',
      budget: newWalkBudget(),
    });

    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(6);
    expect(result.complete).toBe(true);
    expect(result.hits).toHaveLength(12);
  });

  describe('runs whose job list keeps failing', () => {
    beforeEach(() => {
      // The single retry waits two real seconds; the delay is not under test.
      jest.spyOn(global, 'setTimeout').mockImplementation(((
        callback: () => void,
      ) => {
        callback();
        return 0;
      }) as never);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    function withRuns(count: number, unreadable: number) {
      const octokit = fakeOctokit();
      const runs = Array.from({ length: count }, (_, index) => ({
        ...SAME_RUN_RERUN,
        id: 7000 + index,
        head_sha: `sha-${index}`,
        run_attempt: 2,
        created_at: `2026-11-11T16:${String(10 + index)}:00Z`,
      }));
      octokit.rest.actions.listWorkflowRuns.mockResolvedValue({
        data: { total_count: runs.length, workflow_runs: runs },
      });
      const error = Object.assign(new Error('Server Error'), { status: 500 });
      octokit.rest.actions.listJobsForWorkflowRun.mockImplementation(
        async (params: JobsRequest) => {
          if (Number(params.run_id) - 7000 < unreadable) {
            throw error;
          }
          return jobsResponse(params);
        },
      );
      return octokit;
    }

    const walk = (octokit: ReturnType<typeof fakeOctokit>) =>
      walkDay({
        octokit: octokit as never,
        owner: 'MetaMask',
        repo: 'metamask-mobile',
        day: '2026-11-11',
        budget: newWalkBudget(),
        maxRequestsForDay: 1000,
      });

    it('reads a page that only fails at full size in smaller pages', async () => {
      const octokit = fakeOctokit();
      const error = Object.assign(new Error('Server Error'), { status: 500 });
      octokit.rest.actions.listJobsForWorkflowRun.mockImplementation(
        async (params: JobsRequest) => {
          if (params.per_page === 100 && params.page === 2) {
            throw error;
          }
          return jobsResponse(params);
        },
      );

      const result = await walkDay({
        octokit: octokit as never,
        owner: 'MetaMask',
        repo: 'metamask-mobile',
        day: '2026-11-11',
        budget: newWalkBudget(),
        maxRequestsForDay: 100,
      });

      expect(result.complete).toBe(true);
      expect(result.hits).toEqual([
        { path: FILE, runId: SAME_RUN_RERUN.id, jobId: FAILED_JOB_ID },
      ]);
    });

    it('skips a few of them and still finishes the day', async () => {
      const result = await walk(withRuns(12, 3));

      expect(result.complete).toBe(true);
      expect(result.hits).toHaveLength(9);
    });

    it('leaves the day queued once the failures look like an outage', async () => {
      const result = await walk(
        withRuns(40, MAX_UNREADABLE_RUNS_PER_DAY + 8),
      );

      expect(result.complete).toBe(false);
    });
  });

  it('does not send a retry when the request budget is spent', async () => {
    const octokit = fakeOctokit();
    const error = Object.assign(new Error('503'), { status: 503 });
    octokit.rest.actions.listWorkflowRuns.mockRejectedValue(error);

    const result = await walkDay({
      octokit: octokit as never,
      owner: 'MetaMask',
      repo: 'metamask-mobile',
      day: '2026-11-12',
      budget: newWalkBudget(),
      maxRequestsForDay: 1,
    });

    expect(octokit.rest.actions.listWorkflowRuns).toHaveBeenCalledTimes(1);
    expect(result.complete).toBe(false);
  });

  it('leaves a 5xx on page 2 incomplete without the listing ceiling', async () => {
    const octokit = fakeOctokit();
    const page = Array.from({ length: 100 }, (_, index) => ({
      ...SAME_RUN_RERUN,
      id: index + 1,
      run_attempt: 1,
      conclusion: 'success' as const,
    }));
    const error = Object.assign(new Error('503'), { status: 503 });
    octokit.rest.actions.listWorkflowRuns
      .mockResolvedValueOnce({
        data: { total_count: 150, workflow_runs: page },
      })
      .mockRejectedValue(error);
    jest.mocked(core.warning).mockClear();

    const result = await walkDay({
      octokit: octokit as never,
      owner: 'MetaMask',
      repo: 'metamask-mobile',
      day: '2026-11-12',
      budget: newWalkBudget(),
    });
    const warnings = jest
      .mocked(core.warning)
      .mock.calls.map((call) => String(call[0]));

    expect(result.complete).toBe(false);
    expect(warnings.join(' ')).not.toContain('ceiling');
    expect(warnings.join(' ')).toContain('stopped after');
  });
});
