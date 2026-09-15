/* eslint-disable import-x/no-extraneous-dependencies */
import { ErrorCodes } from '@metamask/client-mcp-core';

import {
  AndroidLaunchError,
  IOSLaunchError,
  type AndroidLaunchErrorCode,
  type IOSLaunchErrorCode,
} from '../launcher-types';

// Runtime mirror of IOSLaunchErrorCode, so a newly added code is checked here.
const IOS_LAUNCH_ERROR_CODES: IOSLaunchErrorCode[] = [
  'MM_LAUNCH_FAILED',
  'MM_SESSION_ALREADY_RUNNING',
  'MM_DEPENDENCIES_MISSING',
  'MM_DEVICE_NOT_AVAILABLE',
  'MM_INVALID_CONFIG',
];

const ANDROID_LAUNCH_ERROR_CODES: AndroidLaunchErrorCode[] = [
  'MM_LAUNCH_FAILED',
  'MM_SESSION_ALREADY_RUNNING',
  'MM_DEPENDENCIES_MISSING',
  'MM_DEVICE_NOT_AVAILABLE',
  'MM_INVALID_CONFIG',
];

describe('IOSLaunchErrorCode', () => {
  it.each(IOS_LAUNCH_ERROR_CODES)(
    'uses %s, a known core ErrorCode preserved by the launch tool',
    (code) => {
      expect(Object.values(ErrorCodes)).toContain(code);
    },
  );

  it('exposes the code and remediation that the launch tool forwards', () => {
    const error = new IOSLaunchError({
      code: 'MM_DEPENDENCIES_MISSING',
      message: 'idb not found',
      remediation: 'brew install idb-companion',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('IOSLaunchError');
    expect(error.code).toBe(ErrorCodes.MM_DEPENDENCIES_MISSING);
    expect(error.message).toBe(
      'idb not found\nRemediation: brew install idb-companion',
    );
    expect(error.remediation).toBe('brew install idb-companion');
  });
});

describe('AndroidLaunchErrorCode', () => {
  it.each(ANDROID_LAUNCH_ERROR_CODES)(
    'uses %s, a known core ErrorCode preserved by the launch tool',
    (code) => {
      expect(Object.values(ErrorCodes)).toContain(code);
    },
  );

  it('includes remediation in the error message forwarded to the CLI', () => {
    const error = new AndroidLaunchError({
      code: 'MM_DEVICE_NOT_AVAILABLE',
      message: 'No online authorized Android emulator was found.',
      remediation: 'Start one Android emulator.',
    });

    expect(error.message).toBe(
      'No online authorized Android emulator was found.\nRemediation: Start one Android emulator.',
    );
    expect(error.remediation).toBe('Start one Android emulator.');
  });
});
