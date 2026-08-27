/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';

import {
  ACCESSIBILITY_SETTLE_MS,
  ensureAccessibilityBridgeEnabled,
  readAccessibilityBridge,
} from '../ios/accessibility-bridge';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));

const mockExecFileSync = jest.mocked(execFileSync);

describe('accessibility-bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ACCESSIBILITY_SETTLE_MS', () => {
    it('exports a positive conservative settle constant', () => {
      expect(ACCESSIBILITY_SETTLE_MS).toBeGreaterThan(0);
      expect(ACCESSIBILITY_SETTLE_MS).toBeLessThanOrEqual(1000);
    });
  });

  describe('readAccessibilityBridge', () => {
    it('returns true when the flag is enabled (value "1")', () => {
      mockExecFileSync.mockReturnValue('1\n');

      expect(readAccessibilityBridge('SIM-UDID')).toBe(true);

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'xcrun',
        [
          'simctl',
          'spawn',
          'SIM-UDID',
          'defaults',
          'read',
          'com.apple.Accessibility',
          'ApplicationAccessibilityEnabled',
        ],
        { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
      );
    });

    it('returns true when the flag is enabled (value "true")', () => {
      mockExecFileSync.mockReturnValue('true\n');

      expect(readAccessibilityBridge('SIM-UDID')).toBe(true);
    });

    it('returns false when the key does not exist (fresh-booted sim)', () => {
      const error = new Error(
        'Domain com.apple.Accessibility does not exist',
      ) as NodeJS.ErrnoException;
      mockExecFileSync.mockImplementation(() => {
        throw error;
      });

      expect(readAccessibilityBridge('SIM-UDID')).toBe(false);
    });

    it('returns false when the value is "0"', () => {
      mockExecFileSync.mockReturnValue('0\n');

      expect(readAccessibilityBridge('SIM-UDID')).toBe(false);
    });
  });

  describe('ensureAccessibilityBridgeEnabled', () => {
    it('fresh sim: reads false, writes true, returns wasAlreadyOn=false', () => {
      mockExecFileSync
        .mockImplementationOnce(() => {
          throw new Error('Domain does not exist');
        })
        .mockReturnValueOnce(Buffer.from(''));

      const result = ensureAccessibilityBridgeEnabled('SIM-UDID');

      expect(result).toEqual({ wasAlreadyOn: false });
      expect(mockExecFileSync).toHaveBeenCalledTimes(2);

      const writeCall = mockExecFileSync.mock.calls[1];
      expect(writeCall[0]).toBe('xcrun');
      expect(writeCall[1]).toEqual([
        'simctl',
        'spawn',
        'SIM-UDID',
        'defaults',
        'write',
        'com.apple.Accessibility',
        'ApplicationAccessibilityEnabled',
        '-bool',
        'true',
      ]);
    });

    it('warm sim: already true, does not write, returns wasAlreadyOn=true', () => {
      mockExecFileSync.mockReturnValue('1\n');

      const result = ensureAccessibilityBridgeEnabled('SIM-UDID');

      expect(result).toEqual({ wasAlreadyOn: true });
      expect(mockExecFileSync).toHaveBeenCalledTimes(1);
    });

    it('externally disabled: reads false, writes true, returns wasAlreadyOn=false', () => {
      mockExecFileSync
        .mockReturnValueOnce('0\n')
        .mockReturnValueOnce(Buffer.from(''));

      const result = ensureAccessibilityBridgeEnabled('SIM-UDID');

      expect(result).toEqual({ wasAlreadyOn: false });
      expect(mockExecFileSync).toHaveBeenCalledTimes(2);

      const writeCall = mockExecFileSync.mock.calls[1];
      const writeArgs = writeCall[1] as string[];
      expect(writeArgs).toContain('write');
      expect(writeArgs).toContain('-bool');
      expect(writeArgs).toContain('true');
    });
  });
});
