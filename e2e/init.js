import detox from 'detox';
import config from '../../.detoxrc.json';
import Utilities from './utils/Utilities';

beforeAll(async () => {
  await detox.installWorker();
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
