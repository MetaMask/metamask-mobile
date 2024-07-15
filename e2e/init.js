const detox = require('detox');
const config = require('../.detoxrc.json');
import Utilities from './utils/Utilities';

beforeAll(async () => {
  await detox.init(config);
  device.appLaunchArgs.modify({
    detoxURLBlacklistRegex: Utilities.BlacklistURLs,
    permissions: { notifications: 'YES' },
  });
});

afterAll(async () => {
  await detox.cleanup();
});

global.device = detox.device;