import {
  computeMedian,
  computeShardingSplit,
  planShards,
  binPackShards,
  timingLookupKey,
  baseSpecPath,
  chooseShardCount,
  estimateTotalDurationSeconds,
  assignShards,
  shardsToGithubMatrix,
  DYNAMIC_SHARD_DEFAULTS,
} from './shared/e2e-timing-shards.mjs';

describe('e2e-timing-shards', () => {
  describe('computeShardingSplit (equal-count fallback)', () => {
    const files = ['a.spec.ts', 'b.spec.ts', 'c.spec.ts', 'd.spec.ts'];

    it('slices alphabetically by count', () => {
      expect(computeShardingSplit(files, 1, 2)).toEqual([
        'a.spec.ts',
        'b.spec.ts',
      ]);
      expect(computeShardingSplit(files, 2, 2)).toEqual([
        'c.spec.ts',
        'd.spec.ts',
      ]);
    });

    it('can put both long files on one shard when sorted together', () => {
      // Equal-count ignores duration — both "long-*" land on shard 1.
      const longFirst = [
        'long-a.spec.ts',
        'long-b.spec.ts',
        'short-c.spec.ts',
        'short-d.spec.ts',
      ];
      expect(computeShardingSplit(longFirst, 1, 2)).toEqual([
        'long-a.spec.ts',
        'long-b.spec.ts',
      ]);
    });
  });

  describe('planShards / binPackShards (LPT)', () => {
    const files = [
      'tests/smoke-appium/long-a.spec.ts',
      'tests/smoke-appium/long-b.spec.ts',
      'tests/smoke-appium/short-c.spec.ts',
      'tests/smoke-appium/short-d.spec.ts',
    ];

    const timings = {
      'tests/smoke-appium/long-a.spec.ts': { android: 300, ios: 400 },
      'tests/smoke-appium/long-b.spec.ts': { android: 300, ios: 400 },
      'tests/smoke-appium/short-c.spec.ts': { android: 10, ios: 20 },
      'tests/smoke-appium/short-d.spec.ts': { android: 10, ios: 20 },
    };

    it('does not put both long-running files on the same shard', () => {
      const shards = planShards(files, timings, 'android', 2);

      const longFiles = new Set([
        'tests/smoke-appium/long-a.spec.ts',
        'tests/smoke-appium/long-b.spec.ts',
      ]);

      for (const shard of shards) {
        const longsHere = shard.files.filter((f) => longFiles.has(f));
        expect(longsHere.length).toBe(1);
      }

      expect(shards[0].totalDuration).toBe(310);
      expect(shards[1].totalDuration).toBe(310);
    });

    it('returns the same assignment via binPackShards per split', () => {
      const shards = planShards(files, timings, 'android', 2);
      expect(binPackShards(files, timings, 'android', 1, 2)).toEqual(
        shards[0].files,
      );
      expect(binPackShards(files, timings, 'android', 2, 2)).toEqual(
        shards[1].files,
      );
    });

    it('uses platform-specific durations', () => {
      const android = planShards(files, timings, 'android', 2);
      const ios = planShards(files, timings, 'ios', 2);

      expect(android[0].totalDuration).toBe(310);
      expect(ios[0].totalDuration).toBe(420);
    });

    it('uses median fallback for files without timings', () => {
      const withUnknown = [...files, 'tests/smoke-appium/unknown.spec.ts'];
      const shards = planShards(withUnknown, timings, 'android', 2);
      const all = shards.flatMap((s) => s.files);
      expect(all).toContain('tests/smoke-appium/unknown.spec.ts');
      expect(all).toHaveLength(5);
    });
  });

  describe('helpers', () => {
    it('normalize path separators for timing keys', () => {
      expect(timingLookupKey('tests\\smoke-appium\\a.spec.ts')).toBe(
        'tests/smoke-appium/a.spec.ts',
      );
    });

    it('maps flakiness retry copies back to the original spec', () => {
      expect(baseSpecPath('tests/smoke-appium/foo-retry-1.spec.ts')).toBe(
        'tests/smoke-appium/foo.spec.ts',
      );
      expect(baseSpecPath('tests/smoke-appium/foo.spec.ts')).toBe(
        'tests/smoke-appium/foo.spec.ts',
      );
    });

    it('treats a failed retry as a failed base for re-run filtering', () => {
      const splitFiles = [
        'tests/smoke-appium/foo.spec.ts',
        'tests/smoke-appium/bar.spec.ts',
      ];
      const passed = ['tests/smoke-appium/foo.spec.ts', 'tests/smoke-appium/bar.spec.ts'];
      const failed = ['tests/smoke-appium/foo-retry-1.spec.ts'];

      const failedBases = new Set(failed.map(baseSpecPath));
      const passedBases = new Set(
        passed.map(baseSpecPath).filter((base) => !failedBases.has(base)),
      );
      const testsToRerun = splitFiles.filter(
        (testPath) => !passedBases.has(baseSpecPath(testPath)),
      );

      expect(testsToRerun).toEqual(['tests/smoke-appium/foo.spec.ts']);
    });

    it('computeMedian', () => {
      expect(computeMedian([])).toBe(60);
      expect(computeMedian([10])).toBe(10);
      expect(computeMedian([10, 30])).toBe(20);
      expect(computeMedian([10, 20, 30])).toBe(20);
    });
  });

  describe('chooseShardCount (dynamic)', () => {
    const cfg = {
      targetMinutes: 25,
      overheadMinutes: 8,
      maxShards: 6,
    };
    // budget = 17 minutes = 1020s

    it('returns 0 for empty file lists', () => {
      expect(chooseShardCount(0, 9999, cfg)).toBe(0);
    });

    it('caps at maxShards and file count', () => {
      expect(chooseShardCount(3, 10_000, cfg)).toBe(3);
      expect(chooseShardCount(20, 10_000, cfg)).toBe(6);
    });

    it('uses packed budget (target − overhead)', () => {
      // 1020s → 1 shard; 1021s → 2
      expect(chooseShardCount(10, 1020, cfg)).toBe(1);
      expect(chooseShardCount(10, 1021, cfg)).toBe(2);
    });

    it('exposes defaults matching the opt-in label policy', () => {
      expect(DYNAMIC_SHARD_DEFAULTS.overheadMinutes).toBe(8);
      expect(DYNAMIC_SHARD_DEFAULTS.maxShards).toBe(6);
      expect(DYNAMIC_SHARD_DEFAULTS.targetMinutes).toBe(25);
    });
  });

  describe('assignShards / shardsToGithubMatrix', () => {
    const files = [
      'tests/smoke-appium/long-a.spec.ts',
      'tests/smoke-appium/long-b.spec.ts',
      'tests/smoke-appium/short-c.spec.ts',
      'tests/smoke-appium/short-d.spec.ts',
    ];
    const timings = {
      'tests/smoke-appium/long-a.spec.ts': { android: 300 },
      'tests/smoke-appium/long-b.spec.ts': { android: 300 },
      'tests/smoke-appium/short-c.spec.ts': { android: 10 },
      'tests/smoke-appium/short-d.spec.ts': { android: 10 },
    };

    it('LPT-assigns when timings exist', () => {
      const shards = assignShards(files, timings, 'android', 2);
      expect(shards).toHaveLength(2);
      expect(shards[0].totalDuration).toBe(310);
    });

    it('equal-count assigns when timings are missing', () => {
      const shards = assignShards(files, null, 'android', 2);
      expect(shards[0].files).toEqual([
        'tests/smoke-appium/long-a.spec.ts',
        'tests/smoke-appium/long-b.spec.ts',
      ]);
      expect(shards[1].files).toEqual([
        'tests/smoke-appium/short-c.spec.ts',
        'tests/smoke-appium/short-d.spec.ts',
      ]);
    });

    it('builds a GitHub matrix and drops empty shards', () => {
      const shards = [
        { index: 1, files: ['a.spec.ts'], totalDuration: 1 },
        { index: 2, files: [], totalDuration: 0 },
      ];
      expect(shardsToGithubMatrix(shards)).toEqual({
        include: [{ shard: 1, spec_files: 'a.spec.ts' }],
      });
    });

    it('estimates total duration with median fallback', () => {
      expect(estimateTotalDurationSeconds(files, timings, 'android')).toBe(620);
    });
  });
});
