import blacklistURLs from './resources/blacklistURLs';

beforeAll(async () => {
  device.appLaunchArgs.modify({
    detoxURLBlacklistRegex: blacklistURLs,
  });
});
