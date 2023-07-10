import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../wdio/fixtures/fixture-helper';

beforeAll(async () => {
  // Avoid port forwarding in Bitrise
  const isRunningBitrise = process.env.BITRISE_APP_TITLE;
  if (!isRunningBitrise) {
    await device.reverseTcpPort(12345);
  }
  await startFixtureServer();
  await loadFixture();
  await device.launchApp();
});

afterAll(async () => {
  await stopFixtureServer();
});
