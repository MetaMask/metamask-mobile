import {
  collectListedRunsFromPages,
  type WorkflowRunListItem,
} from './flaky-same-sha-history';

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
