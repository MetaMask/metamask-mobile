/* eslint-disable import-x/no-extraneous-dependencies */
import { ErrorCodes } from '@metamask/client-mcp-core';

import { IOSLaunchError, type IOSLaunchErrorCode } from '../launcher-types';

// Runtime mirror of IOSLaunchErrorCode, so a newly added code is checked here.
const IOS_LAUNCH_ERROR_CODES: IOSLaunchErrorCode[] = [
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
    expect(error.message).toBe('idb not found');
    expect(error.remediation).toBe('brew install idb-companion');
  });
});
