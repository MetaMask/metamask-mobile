import { Event as SentryEvent } from '@sentry/core';
import {
  groupDiskSpaceSentryReport,
  isDiskSpaceSentryReport,
} from './diskSpaceSentry';

const createDiskSpaceReport = (
  message: string,
  overrides: Partial<SentryEvent> = {},
): SentryEvent => ({
  ...overrides,
  exception: {
    values: [{ value: message }],
  },
});

describe('diskSpaceSentry', () => {
  it('detects disk-full Sentry reports from exception values', () => {
    const report = createDiskSpaceReport(
      "File '/var/mobile/.../persist-root' could not be written; volume is out of space",
    );

    expect(isDiskSpaceSentryReport(report)).toBe(true);
  });

  it('detects disk-full Sentry reports from top-level message', () => {
    const report: SentryEvent = {
      message: 'NSPOSIXErrorDomain Code=28 "No space left on device"',
    };

    expect(isDiskSpaceSentryReport(report)).toBe(true);
  });

  it('detects NSCocoaErrorDomain disk-full reports', () => {
    const report = createDiskSpaceReport(
      'NSCocoaErrorDomain Code=640 "There isn\'t enough space."',
    );

    expect(isDiskSpaceSentryReport(report)).toBe(true);
  });

  it('returns false for non-disk-space reports', () => {
    const report = createDiskSpaceReport('Network request failed');

    expect(isDiskSpaceSentryReport(report)).toBe(false);
  });

  it('groups reports by persist key instead of file path', () => {
    const report = groupDiskSpaceSentryReport(
      createDiskSpaceReport(
        "File '/var/mobile/Containers/.../persistStore/persist-root' could not be written; No space left on device",
      ),
    );

    expect(report.fingerprint).toEqual(['disk-space-full', 'persist:root']);
    expect(report.exception?.values?.[0]?.value).toBe(
      'Device storage full: failed to persist persist:root',
    );
    expect(report.tags?.error_category).toBe('disk_full');
    expect(report.tags?.persist_key).toBe('persist:root');
  });

  it('groups reports using Failed to set item persist key', () => {
    const report = groupDiskSpaceSentryReport(
      createDiskSpaceReport(
        'Failed to set item for persist:PreferencesController due to no space left on device',
      ),
    );

    expect(report.fingerprint).toEqual([
      'disk-space-full',
      'persist:PreferencesController',
    ]);
    expect(report.tags?.persist_key).toBe('persist:PreferencesController');
  });

  it('maps controller file names to persist keys', () => {
    const report = groupDiskSpaceSentryReport(
      createDiskSpaceReport(
        "File '/var/mobile/.../persistStore/persist-MultichainBalancesController' could not be written",
      ),
    );

    expect(report.fingerprint).toEqual([
      'disk-space-full',
      'persist:MultichainBalancesController',
    ]);
  });

  it('maps ReactNative paths to browser_screenshot persist key', () => {
    const report = groupDiskSpaceSentryReport(
      createDiskSpaceReport(
        "File '/var/mobile/.../ReactNative/.../screenshot.png' could not be written; out of space",
      ),
    );

    expect(report.fingerprint).toEqual([
      'disk-space-full',
      'browser_screenshot',
    ]);
  });

  it('maps storageService paths to snap_storage persist key', () => {
    const report = groupDiskSpaceSentryReport(
      createDiskSpaceReport(
        "File '/var/mobile/.../storageService-snap-data' could not be written; out of space",
      ),
    );

    expect(report.fingerprint).toEqual(['disk-space-full', 'snap_storage']);
  });

  it('uses unknown persist key when path is unrecognized', () => {
    const report = groupDiskSpaceSentryReport(
      createDiskSpaceReport('No space left on device while writing cache file'),
    );

    expect(report.fingerprint).toEqual(['disk-space-full', 'unknown']);
    expect(report.tags?.persist_key).toBe('unknown');
  });

  it('normalizes top-level message for disk-full reports', () => {
    const report = groupDiskSpaceSentryReport({
      message:
        'Failed to set item for persist:BrowserController due to no space left on device',
    });

    expect(report.message).toBe(
      'Device storage full: failed to persist persist:BrowserController',
    );
  });

  it('preserves existing tags when grouping disk-full reports', () => {
    const report = groupDiskSpaceSentryReport({
      tags: { existing_tag: 'keep-me' },
      exception: {
        values: [
          {
            value:
              "File '/var/mobile/.../persistStore/persist-root' could not be written; out of space",
          },
        ],
      },
    });

    expect(report.tags?.existing_tag).toBe('keep-me');
    expect(report.tags?.error_category).toBe('disk_full');
    expect(report.tags?.persist_key).toBe('persist:root');
  });
});
