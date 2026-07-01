import {
  groupDiskSpaceSentryReport,
  isDiskSpaceSentryReport,
} from './diskSpaceSentry';

describe('diskSpaceSentry', () => {
  it('detects disk-full Sentry reports', () => {
    expect(
      isDiskSpaceSentryReport({
        exception: {
          values: [
            {
              value:
                "File '/var/mobile/.../persist-root' could not be written; volume is out of space",
            },
          ],
        },
      }),
    ).toBe(true);
  });

  it('groups reports by persist key instead of file path', () => {
    const report = groupDiskSpaceSentryReport({
      exception: {
        values: [
          {
            value:
              "File '/var/mobile/Containers/.../persistStore/persist-root' could not be written; No space left on device",
          },
        ],
      },
    });

    expect(report.fingerprint).toEqual(['disk-space-full', 'persist:root']);
    expect(report.exception?.values?.[0]?.value).toBe(
      'Device storage full: failed to persist persist:root',
    );
    expect(report.tags?.persist_key).toBe('persist:root');
  });

  it('maps controller file names to persist keys', () => {
    const report = groupDiskSpaceSentryReport({
      exception: {
        values: [
          {
            value:
              "File '/var/mobile/.../persistStore/persist-MultichainBalancesController' could not be written",
          },
        ],
      },
    });

    expect(report.fingerprint).toEqual([
      'disk-space-full',
      'persist:MultichainBalancesController',
    ]);
  });
});
