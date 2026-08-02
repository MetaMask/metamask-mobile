const {
  getAppiumPlatformFromArtifactName,
  normalizeAppiumSpecPath,
  durationSecondsForTest,
  aggregateTimingsFromPlaywrightJson,
} = require('./playwright-json-timings.cjs');

describe('playwright-json-timings', () => {
  describe('getAppiumPlatformFromArtifactName', () => {
    it('parses android and ios suite artifacts', () => {
      expect(
        getAppiumPlatformFromArtifactName(
          'playwright-json-report-appium-accounts-android-smoke-1',
        ),
      ).toBe('android');
      expect(
        getAppiumPlatformFromArtifactName(
          'playwright-json-report-appium-snaps-ios-smoke-3',
        ),
      ).toBe('ios');
    });

    it('rejects unrelated artifacts', () => {
      expect(
        getAppiumPlatformFromArtifactName('appium-smoke-report-foo'),
      ).toBeNull();
    });
  });

  describe('normalizeAppiumSpecPath', () => {
    it('extracts repo-relative tests/ paths', () => {
      expect(
        normalizeAppiumSpecPath(
          '/home/runner/work/metamask-mobile/metamask-mobile/tests/smoke-appium/accounts/foo.spec.ts',
        ),
      ).toBe('tests/smoke-appium/accounts/foo.spec.ts');
    });

    it('rejects non-spec paths', () => {
      expect(normalizeAppiumSpecPath('tests/smoke-appium/helpers.ts')).toBeNull();
    });
  });

  describe('durationSecondsForTest', () => {
    it('uses the last retry attempt only', () => {
      expect(
        durationSecondsForTest({
          results: [{ duration: 1000 }, { duration: 5000 }],
        }),
      ).toBe(5);
    });
  });

  describe('aggregateTimingsFromPlaywrightJson', () => {
    it('sums per-file durations into the platform bucket', () => {
      const report = {
        suites: [
          {
            specs: [],
            suites: [
              {
                specs: [
                  {
                    file: 'tests/smoke-appium/accounts/a.spec.ts',
                    tests: [
                      {
                        results: [{ duration: 2000 }],
                      },
                      {
                        results: [{ duration: 3000 }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const acc: Record<string, Record<string, number>> = {};
      aggregateTimingsFromPlaywrightJson(report, 'android', acc);

      expect(acc['tests/smoke-appium/accounts/a.spec.ts'].android).toBe(5);
    });
  });
});
