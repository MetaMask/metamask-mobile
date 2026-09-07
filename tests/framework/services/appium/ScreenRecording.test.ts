/* eslint-disable import-x/no-nodejs-modules */
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildRecordingFileBaseName,
  extractRecordingPayload,
  isAndroidPlatform,
  isFfmpegAvailable,
  isLocalEmulatorProvider,
  isVideoRecordingOnFailureEnabled,
  sanitizeRecordingFileName,
  shouldPersistRecordingAlways,
} from './ScreenRecording.ts';
import { ProviderName } from '../../types.ts';

describe('ScreenRecording', () => {
  const recordVideoKey = 'APPIUM_RECORD_VIDEO_ON_FAILURE';
  const recordVideoAlwaysKey = 'APPIUM_RECORD_VIDEO_ALWAYS';
  const ciKey = 'CI';
  let previousRecordVideo: string | undefined;
  let previousRecordVideoAlways: string | undefined;
  let previousCi: string | undefined;

  beforeEach(() => {
    previousRecordVideo = process.env[recordVideoKey];
    previousRecordVideoAlways = process.env[recordVideoAlwaysKey];
    previousCi = process.env[ciKey];
    delete process.env[recordVideoKey];
    delete process.env[recordVideoAlwaysKey];
    delete process.env[ciKey];
  });

  afterEach(() => {
    if (previousRecordVideo === undefined) {
      delete process.env[recordVideoKey];
    } else {
      process.env[recordVideoKey] = previousRecordVideo;
    }
    if (previousRecordVideoAlways === undefined) {
      delete process.env[recordVideoAlwaysKey];
    } else {
      process.env[recordVideoAlwaysKey] = previousRecordVideoAlways;
    }
    if (previousCi === undefined) {
      delete process.env[ciKey];
    } else {
      process.env[ciKey] = previousCi;
    }
  });

  describe('isVideoRecordingOnFailureEnabled', () => {
    it('returns false for BrowserStack', () => {
      process.env[ciKey] = 'true';
      expect(isVideoRecordingOnFailureEnabled(ProviderName.BROWSERSTACK)).toBe(
        false,
      );
    });

    it('returns true on CI for local emulator by default', () => {
      process.env[ciKey] = 'true';
      expect(isVideoRecordingOnFailureEnabled(ProviderName.EMULATOR)).toBe(
        true,
      );
    });

    it('returns false on CI when explicitly disabled', () => {
      process.env[ciKey] = 'true';
      process.env[recordVideoKey] = 'false';
      expect(isVideoRecordingOnFailureEnabled(ProviderName.SIMULATOR)).toBe(
        false,
      );
    });

    it('returns false locally unless explicitly enabled', () => {
      expect(isVideoRecordingOnFailureEnabled(ProviderName.EMULATOR)).toBe(
        false,
      );
      process.env[recordVideoKey] = 'true';
      expect(isVideoRecordingOnFailureEnabled(ProviderName.EMULATOR)).toBe(
        true,
      );
    });
  });

  describe('isLocalEmulatorProvider', () => {
    it('accepts emulator and simulator providers', () => {
      expect(isLocalEmulatorProvider(ProviderName.EMULATOR)).toBe(true);
      expect(isLocalEmulatorProvider(ProviderName.SIMULATOR)).toBe(true);
      expect(isLocalEmulatorProvider(ProviderName.BROWSERSTACK)).toBe(false);
    });
  });

  describe('sanitizeRecordingFileName', () => {
    it('replaces unsafe characters', () => {
      expect(sanitizeRecordingFileName('should login')).toBe('should_login');
    });
  });

  describe('buildRecordingFileBaseName', () => {
    it('includes describe block and test title in the file name', () => {
      expect(
        buildRecordingFileBaseName({
          projectName: 'android-smoke',
          titlePath: ['SmokeAccounts: Login to app', 'logs in successfully'],
        }),
      ).toBe('android-smoke-SmokeAccounts_Login_to_app__logs_in_successfully');
    });

    it('adds a retry suffix when the test is retried', () => {
      expect(
        buildRecordingFileBaseName({
          projectName: 'ios-smoke',
          titlePath: ['SmokeAccounts: Login to app', 'logs in successfully'],
          retry: 1,
        }),
      ).toBe(
        'ios-smoke-SmokeAccounts_Login_to_app__logs_in_successfully-retry1',
      );
    });
  });

  describe('shouldPersistRecordingAlways', () => {
    it('returns false by default', () => {
      expect(shouldPersistRecordingAlways()).toBe(false);
    });

    it('returns true when APPIUM_RECORD_VIDEO_ALWAYS is true', () => {
      process.env[recordVideoAlwaysKey] = 'true';
      expect(shouldPersistRecordingAlways()).toBe(true);
    });
  });

  describe('isFfmpegAvailable', () => {
    const pathKey = 'PATH';
    let previousPath: string | undefined;

    beforeEach(() => {
      previousPath = process.env[pathKey];
    });

    afterEach(() => {
      if (previousPath === undefined) {
        delete process.env[pathKey];
      } else {
        process.env[pathKey] = previousPath;
      }
    });

    it('returns false when PATH has no ffmpeg binary', () => {
      process.env[pathKey] = '/tmp/mms-no-ffmpeg-on-path';

      expect(isFfmpegAvailable()).toBe(false);
    });

    it('returns false when PATH is empty', () => {
      process.env[pathKey] = '';

      expect(isFfmpegAvailable()).toBe(false);
    });

    it('returns true when PATH contains an executable ffmpeg', () => {
      const dir = mkdtempSync(join(tmpdir(), 'mms-ffmpeg-'));
      const binaryPath = join(dir, 'ffmpeg');
      writeFileSync(binaryPath, '#!/bin/sh\n');
      chmodSync(binaryPath, 0o755);
      process.env[pathKey] = dir;

      try {
        expect(isFfmpegAvailable()).toBe(true);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe('isAndroidPlatform', () => {
    it('detects Android platform names case-insensitively', () => {
      expect(isAndroidPlatform('Android')).toBe(true);
      expect(isAndroidPlatform('android')).toBe(true);
      expect(isAndroidPlatform('iOS')).toBe(false);
      expect(isAndroidPlatform(undefined)).toBe(false);
    });
  });

  describe('extractRecordingPayload', () => {
    it('reads a raw base64 string', () => {
      expect(extractRecordingPayload('abc123')).toBe('abc123');
    });

    it('ignores empty strings', () => {
      expect(extractRecordingPayload('')).toBeUndefined();
    });

    it('reads payload from object wrappers', () => {
      expect(extractRecordingPayload({ payload: 'video-data' })).toBe(
        'video-data',
      );
      expect(extractRecordingPayload({ media: 'video-data' })).toBe(
        'video-data',
      );
    });
  });
});
