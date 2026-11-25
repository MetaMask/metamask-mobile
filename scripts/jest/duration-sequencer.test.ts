import path from 'node:path';

import suiteDurations from './suite-durations.json';
import DurationWeightedSequencer from './duration-sequencer.mjs';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

interface TestLike {
  path: string;
}

const makeTests = (relativePaths: string[]): TestLike[] =>
  relativePaths.map((relativePath) => ({
    path: path.join(REPO_ROOT, relativePath),
    context: { config: { rootDir: REPO_ROOT } },
  }));

describe('DurationWeightedSequencer', () => {
  const recordedKeys = Object.keys(suiteDurations.suiteMs).slice(0, 40);
  const tests = makeTests([
    ...recordedKeys,
    'scripts/jest/brand-new-suite.test.ts',
  ]);

  it('assigns every test to exactly one shard', () => {
    const sequencer = new DurationWeightedSequencer();
    const shardCount = 4;

    const shards = Array.from({ length: shardCount }, (_, index) =>
      sequencer.shard(tests, { shardIndex: index + 1, shardCount }),
    );
    const assigned = shards.flat().map((suite: TestLike) => suite.path);

    expect(assigned).toHaveLength(tests.length);
    expect(new Set(assigned)).toEqual(new Set(tests.map((suite: TestLike) => suite.path)));
  });

  it('gives the same partition on every call', () => {
    const sequencer = new DurationWeightedSequencer();
    const first = sequencer.shard(tests, { shardIndex: 2, shardCount: 3 });
    const second = sequencer.shard(tests, { shardIndex: 2, shardCount: 3 });

    expect(second.map((suite: TestLike) => suite.path)).toEqual(
      first.map((suite: TestLike) => suite.path),
    );
  });

  it('returns every test when no sharding is requested', () => {
    const sequencer = new DurationWeightedSequencer();

    expect(sequencer.shard(tests, { shardIndex: 1, shardCount: 1 })).toHaveLength(
      tests.length,
    );
  });
});
