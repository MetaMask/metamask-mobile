import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  MIN_RECORDED_SUITE_MS,
  assignDurationShards,
  buildSuiteDurationSnapshot,
  estimateSuiteWeight,
} from './duration-sharding.mjs';
import {
  collectMeasurements,
  parseArgs,
} from './refresh-suite-durations.mjs';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('assignDurationShards', () => {
  it('places every entry on exactly one shard', () => {
    const entries = Array.from({ length: 37 }, (_, id) => ({
      id,
      key: `suite-${id}.test.ts`,
      weight: (id * 7919) % 101,
    }));

    const shards = assignDurationShards(entries, 10);
    const placed = shards.flat().sort((a, b) => a - b);

    expect(shards).toHaveLength(10);
    expect(placed).toEqual(entries.map((entry) => entry.id));
  });

  it('keeps the spread between shard loads within the heaviest entry', () => {
    const weights = [900, 800, 700, 600, 500, 400, 300, 200, 100, 50, 50, 25];
    const entries = weights.map((weight, id) => ({
      id,
      key: `suite-${id}.test.ts`,
      weight,
    }));

    const shards = assignDurationShards(entries, 4);
    const loads = shards.map((ids) =>
      ids.reduce((sum, id) => sum + weights[id], 0),
    );

    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(
      Math.max(...weights),
    );
  });

  it('does not stack contiguous heavy suites on one shard', () => {
    const weights = [1000, 1000, 1000, 1000, 1, 1, 1, 1];
    const entries = weights.map((weight, id) => ({
      id,
      key: `suite-${id}.test.ts`,
      weight,
    }));

    const loads = assignDurationShards(entries, 2).map((ids) =>
      ids.reduce((sum, id) => sum + weights[id], 0),
    );

    expect(Math.max(...loads)).toBe(2002);
  });

  it('is deterministic regardless of input order', () => {
    const entries = [
      { id: 0, key: 'b.test.ts', weight: 10 },
      { id: 1, key: 'a.test.ts', weight: 10 },
      { id: 2, key: 'c.test.ts', weight: 5 },
    ];

    const forward = assignDurationShards(entries, 2);
    const reversed = assignDurationShards([...entries].reverse(), 2);

    expect(reversed).toEqual(forward);
  });

  it('returns empty shards when there are more shards than entries', () => {
    const shards = assignDurationShards(
      [{ id: 0, key: 'only.test.ts', weight: 1 }],
      3,
    );

    expect(shards).toEqual([[0], [], []]);
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'rejects an invalid shard count of %p',
    (shardCount) => {
      expect(() => assignDurationShards([], shardCount)).toThrow(
        'shardCount must be a positive integer',
      );
    },
  );
});

describe('estimateSuiteWeight', () => {
  const snapshot = {
    fallbackMsPerKiB: 100,
    suiteMs: { 'app/known.test.ts': 4321 },
  };

  it('uses the recorded duration when the suite is in the snapshot', () => {
    const weight = estimateSuiteWeight(
      { key: 'app/known.test.ts', sizeBytes: 999_999 },
      snapshot,
    );

    expect(weight).toBe(4321);
  });

  it('estimates an unrecorded suite from its size', () => {
    const weight = estimateSuiteWeight(
      { key: 'app/new.test.ts', sizeBytes: 10 * 1024 },
      snapshot,
    );

    expect(weight).toBe(1000);
  });

  it('never returns a weight below one millisecond', () => {
    const weight = estimateSuiteWeight(
      { key: 'app/empty.test.ts', sizeBytes: 0 },
      snapshot,
    );

    expect(weight).toBe(1);
  });
});

describe('buildSuiteDurationSnapshot', () => {
  it('stores only suites at or above the recording threshold', () => {
    const snapshot = buildSuiteDurationSnapshot([
      {
        key: 'app/slow.test.ts',
        durationMs: MIN_RECORDED_SUITE_MS,
        sizeBytes: 1024,
      },
      {
        key: 'app/fast.test.ts',
        durationMs: MIN_RECORDED_SUITE_MS - 1,
        sizeBytes: 1024,
      },
    ]);

    expect(snapshot.suiteMs).toEqual({
      'app/slow.test.ts': MIN_RECORDED_SUITE_MS,
    });
  });

  it('calibrates the size fallback from total duration per KiB', () => {
    const snapshot = buildSuiteDurationSnapshot([
      { key: 'app/a.test.ts', durationMs: 3000, sizeBytes: 1024 },
      { key: 'app/b.test.ts', durationMs: 1000, sizeBytes: 3 * 1024 },
    ]);

    expect(snapshot.fallbackMsPerKiB).toBe(1000);
  });

  it('writes recorded keys in sorted order with rounded durations', () => {
    const snapshot = buildSuiteDurationSnapshot([
      { key: 'app/z.test.ts', durationMs: 1234.6, sizeBytes: 1024 },
      { key: 'app/a.test.ts', durationMs: 999.4, sizeBytes: 1024 },
    ]);

    expect(Object.keys(snapshot.suiteMs)).toEqual([
      'app/a.test.ts',
      'app/z.test.ts',
    ]);
    expect(snapshot.suiteMs['app/z.test.ts']).toBe(1235);
  });

  it('reports a zero fallback when there is nothing to calibrate from', () => {
    expect(buildSuiteDurationSnapshot([])).toEqual({
      fallbackMsPerKiB: 0,
      suiteMs: {},
    });
  });
});

describe('collectMeasurements', () => {
  it('averages a suite across reports and skips paths outside the root', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-durations-'));
    const root = '/ci/checkout';
    const first = path.join(dir, 'first.json');
    const second = path.join(dir, 'second.json');
    const suite = (name: string, startTime: number, endTime: number) => ({
      name,
      startTime,
      endTime,
    });
    fs.writeFileSync(
      first,
      JSON.stringify({
        testResults: [
          suite(`${root}/app/a.test.ts`, 0, 1000),
          suite('/elsewhere/b.test.ts', 0, 5000),
        ],
      }),
    );
    fs.writeFileSync(
      second,
      JSON.stringify({
        testResults: [suite(`${root}/app/a.test.ts`, 0, 3000)],
      }),
    );

    const measurements = collectMeasurements([first, second], root, REPO_ROOT);

    expect(measurements).toEqual([
      {
        key: 'app/a.test.ts',
        durationMs: 2000,
        sizeBytes: 0,
      },
    ]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('parseArgs', () => {
  it('reads the root and the report paths', () => {
    expect(parseArgs(['--root', '/ci/root', 'a.json', 'b.json'])).toEqual({
      root: path.resolve('/ci/root'),
      reports: ['a.json', 'b.json'],
    });
  });

  it('requires a root', () => {
    expect(() => parseArgs(['a.json'])).toThrow('Missing required --root');
  });

  it('requires at least one report', () => {
    expect(() => parseArgs(['--root', '/ci/root'])).toThrow(
      'Pass at least one jest-results.json path',
    );
  });
});
