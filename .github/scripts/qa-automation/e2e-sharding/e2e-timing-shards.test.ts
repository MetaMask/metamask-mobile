import {
  computeMedian,
  computeShardingSplit,
  planShards,
  binPackShards,
  timingLookupKey,
  baseSpecPath,
} from './e2e-timing-shards.mjs';

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
});
