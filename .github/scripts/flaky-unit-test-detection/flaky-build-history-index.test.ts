import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  loadPriorIndex,
  renderBuildSummary,
} from './flaky-build-history-index';
import { INDEX_VERSION, emptyIndex, mergeDayHits } from './flaky-history-index';

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

const FILE = 'app/core/createAsyncBatcher.test.ts';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'flaky-index-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const writeIndex = (contents: string): string => {
  const path = join(dir, 'index.json');
  writeFileSync(path, contents);
  return path;
};

const populated = mergeDayHits({
  index: emptyIndex(),
  day: '2026-09-20',
  hits: [{ path: FILE, runId: 1, jobId: 2 }],
  runsScanned: 300,
});

describe('loadPriorIndex', () => {
  it('loads an index a previous build published', () => {
    const path = writeIndex(JSON.stringify(populated));

    expect(loadPriorIndex(path)).toStrictEqual(populated);
  });

  it('starts cold when no artifact was downloaded', () => {
    expect(loadPriorIndex('')).toStrictEqual(emptyIndex());
    expect(loadPriorIndex(join(dir, 'absent.json'))).toStrictEqual(
      emptyIndex(),
    );
  });

  // Chaining onto a shape this build cannot reason about would bake the damage
  // into every night that follows, so a backfill is the cheaper loss.
  it('starts cold rather than chaining onto an unreadable index', () => {
    expect(loadPriorIndex(writeIndex('{"version":1,'))).toStrictEqual(
      emptyIndex(),
    );
  });

  it('starts cold rather than chaining onto a newer index version', () => {
    const path = writeIndex(
      JSON.stringify({ ...populated, version: INDEX_VERSION + 1 }),
    );

    expect(loadPriorIndex(path)).toStrictEqual(emptyIndex());
  });
});

describe('renderBuildSummary', () => {
  it('reports the walk and the window it produced', () => {
    const summary = renderBuildSummary({
      daysWalked: ['2026-09-20'],
      gapDays: [],
      runsScanned: 300,
      newHits: 1,
      index: populated,
      today: '2026-09-21',
    });

    expect(summary).toContain('| Days walked | 2026-09-20 |');
    expect(summary).toContain('| Days left as gaps | none |');
    expect(summary).toContain('| ci.yml runs scanned | 300 |');
    expect(summary).toContain('| Fail-then-pass hits found | 1 |');
    expect(summary).toContain('| Tests tracked | 1 |');
    expect(summary).toContain(
      '| Index window | 2026-09-20 to 2026-09-20, 1 day(s) |',
    );
  });

  it('names the days it could not finish', () => {
    const summary = renderBuildSummary({
      daysWalked: ['2026-09-19', '2026-09-20'],
      gapDays: ['2026-09-19'],
      runsScanned: 300,
      newHits: 0,
      index: populated,
      today: '2026-09-21',
    });

    expect(summary).toContain('| Days left as gaps | 2026-09-19 |');
  });

  it('says so when the index was already up to date', () => {
    const summary = renderBuildSummary({
      daysWalked: [],
      gapDays: [],
      runsScanned: 0,
      newHits: 0,
      index: populated,
      today: '2026-09-21',
    });

    expect(summary).toContain('| Days walked | none, already up to date |');
  });

  it('describes a cold index as empty rather than as a window', () => {
    const summary = renderBuildSummary({
      daysWalked: [],
      gapDays: [],
      runsScanned: 0,
      newHits: 0,
      index: emptyIndex(),
      today: '2026-09-21',
    });

    expect(summary).toContain('| Index window | empty |');
  });
});
