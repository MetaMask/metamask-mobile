import {
  extractRecordingPayload,
  isLocalEmulatorProvider,
  isVideoRecordingOnFailureEnabled,
  sanitizeRecordingFileName,
} from './ScreenRecording.ts';
import { ProviderName } from '../../types.ts';

describe('ScreenRecording', () => {
  const recordVideoKey = 'APPIUM_RECORD_VIDEO_ON_FAILURE';
  const ciKey = 'CI';
  let previousRecordVideo: string | undefined;
  let previousCi: string | undefined;

  beforeEach(() => {
    previousRecordVideo = process.env[recordVideoKey];
    previousCi = process.env[ciKey];
    delete process.env[recordVideoKey];
    delete process.env[ciKey];
  });

  afterEach(() => {
    if (previousRecordVideo === undefined) {
      delete process.env[recordVideoKey];
    } else {
      process.env[recordVideoKey] = previousRecordVideo;
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
      expect(sanitizeRecordingFileName('should login @SmokeAppium')).toBe(
        'should_login_SmokeAppium',
      );
    });
  });

  describe('extractRecordingPayload', () => {
    it('reads a raw base64 string', () => {
      expect(extractRecordingPayload('abc123')).toBe('abc123');
    });

    it('reads payload from object wrappers', () => {
      expect(extractRecordingPayload({ payload: 'video-data' })).toBe(
        'video-data',
      );
    });
  });
});
