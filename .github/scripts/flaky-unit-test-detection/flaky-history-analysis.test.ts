import {
  collectListedRunsFromPages,
  type WorkflowRunListItem,
} from './flaky-same-sha-history';
import {
  MAX_GRAPHQL_POINTS_PER_RUN,
  describeCoverageWindow,
} from './flaky-history-analysis';

const apiRun = (
  id: number,
  overrides: Partial<WorkflowRunListItem> = {},
): WorkflowRunListItem => ({
  id,
  conclusion: 'success',
  created_at: '2026-09-01T00:00:00Z',
  head_sha: 'abc',
  ...overrides,
});

async function* pagesFrom(
  chunks: WorkflowRunListItem[][],
): AsyncGenerator<{ data: WorkflowRunListItem[] }> {
  for (const data of chunks) {
    yield { data };
  }
}

async function* pagesThenThrow(
  chunks: WorkflowRunListItem[][],
  error: Error,
): AsyncGenerator<{ data: WorkflowRunListItem[] }> {
  for (const data of chunks) {
    yield { data };
  }
  throw error;
}

describe('collectListedRunsFromPages', () => {
  it('keeps listed runs when a later page throws', async () => {
    const pages = pagesThenThrow(
      [[apiRun(1), apiRun(2)]],
      new Error('API rate limit exceeded'),
    );

    const result = await collectListedRunsFromPages(pages, 2000);

    expect(result.runs.map((run) => run.id)).toEqual([1, 2]);
    expect(result.pageErrorMessage).toBe('API rate limit exceeded');
  });

  it('rethrows when the first page throws with no runs collected', async () => {
    const error = new Error('Service Unavailable');
    const pages = pagesThenThrow([], error);

    await expect(collectListedRunsFromPages(pages, 2000)).rejects.toBe(error);
  });

  it('stops at maxRuns without walking further pages', async () => {
    const pages = pagesFrom([[apiRun(1), apiRun(2)], [apiRun(3)]]);

    const result = await collectListedRunsFromPages(pages, 2);

    expect(result.runs.map((run) => run.id)).toEqual([1, 2]);
    expect(result.pageErrorMessage).toBeUndefined();
  });
});

describe('GraphQL budget', () => {
  // Measured against the live API: one commit alias costs one point whatever
  // the batch size, so the walk's worst case is batch x queries. GITHUB_TOKEN
  // gets 1000 points per hour per repository and this workflow can run several
  // times in an hour, so half the budget is the ceiling worth defending.
  it('cannot spend more than half the hourly GITHUB_TOKEN point budget', () => {
    expect(MAX_GRAPHQL_POINTS_PER_RUN).toBeLessThanOrEqual(500);
  });
});

describe('describeCoverageWindow', () => {
  it('reports the dates walked and how many runs backed them', () => {
    expect(
      describeCoverageWindow({
        lookbackDays: 14,
        runsListed: 1204,
        oldestRunSampled: '2026-09-08',
        newestRunSampled: '2026-09-21',
        cappedDays: [],
      }),
    ).toBe('2026-09-08 → 2026-09-21, 1204 runs');
  });

  it('says how many days were clipped by the listing ceiling', () => {
    expect(
      describeCoverageWindow({
        lookbackDays: 14,
        runsListed: 2000,
        oldestRunSampled: '2026-09-19',
        newestRunSampled: '2026-09-21',
        cappedDays: ['2026-09-20', '2026-09-19'],
      }),
    ).toContain('2 day(s) clipped');
  });

  it('falls back to the requested window when nothing was listed', () => {
    expect(
      describeCoverageWindow({
        lookbackDays: 14,
        runsListed: 0,
        oldestRunSampled: '',
        newestRunSampled: '',
        cappedDays: [],
      }),
    ).toBe('last 14d, 0 runs');
  });
});
