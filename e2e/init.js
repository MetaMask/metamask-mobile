/* eslint-env jest */
import { logger } from './framework';
import Utilities from './utils/Utilities';

/**
 * Before all tests, modify the app launch arguments to include the blacklistURLs.
 * This sets up the environment for Detox tests.
 */
beforeAll(async () => {
  device.appLaunchArgs.modify({
    detoxURLBlacklistRegex: Utilities.BlacklistURLs,
    permissions: { notifications: 'YES' },
  });
});

global.liveServerRequest = [];
afterEach(() => {
  if (global.liveServerRequest.length > 0) {
    const err = JSON.stringify(global.liveServerRequest);
    global.liveServerRequest = []; // reset for next test
    // throw err;
    logger.warn(err); // change this to throw once the allow list is updated
  }
});
