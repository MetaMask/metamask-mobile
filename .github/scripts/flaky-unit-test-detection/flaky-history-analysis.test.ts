import {
  collectListedRunsFromPages,
  type WorkflowRunListItem,
} from './flaky-same-sha-history';
import { describeCoverageWindow } from './flaky-history-analysis';
import type { CoverageWindow } from './flaky-types';

// Virtual because @actions/* is installed under .github/scripts, which the
// repo-wide jest run does not have on its resolution path.
jest.mock(
  '@actions/core',
  () => ({
    info: jest.fn(),
    warning: jest.fn(),
    setFailed: jest.fn(),
    setOutput: jest.fn(),
  }),
  { virtual: true },
);

jest.mock('@actions/github', () => ({ getOctokit: jest.fn() }), {
  virtual: true,
});

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

const coverage = (overrides: Partial<CoverageWindow> = {}): CoverageWindow => ({
  staleDays: 1,
  daysCovered: 90,
  gapDays: [],
  oldestDay: '2026-06-24',
  newestDay: '2026-09-20',
  complete: true,
  ...overrides,
});

describe('describeCoverageWindow', () => {
  it('reports the span the index covers', () => {
    expect(describeCoverageWindow(coverage())).toBe(
      '2026-06-24 \u2192 2026-09-20, 90d',
    );
  });

  it('says how far behind a stale index is', () => {
    expect(describeCoverageWindow(coverage({ staleDays: 5 }))).toContain(
      '5d stale',
    );
  });

  // A nightly build covers up to yesterday, so one day behind is the steady
  // state rather than something to flag.
  it('stays quiet about the normal nightly lag', () => {
    expect(describeCoverageWindow(coverage({ staleDays: 1 }))).not.toContain(
      'stale',
    );
  });

  it('counts days inside the window that were never walked', () => {
    expect(
      describeCoverageWindow(
        coverage({ gapDays: ['2026-09-01', '2026-09-02'] }),
      ),
    ).toContain('2 gap day(s)');
  });

  it('says so when there is no index to read', () => {
    expect(describeCoverageWindow(coverage({ daysCovered: 0 }))).toBe(
      'index unavailable',
    );
  });
});
