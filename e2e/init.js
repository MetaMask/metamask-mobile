import blacklistURLs from './resources/blacklistURLs';

beforeAll(async () => {
  jest.setTimeout(150000);
  device.appLaunchArgs.modify({
    detoxURLBlacklistRegex: blacklistURLs,
  });
});
