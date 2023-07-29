import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from './fixtures/fixture-helper';

beforeAll(async () => {
  // Avoid port forwarding in Bitrise
  const isRunningBitrise = process.env.BITRISE_APP_TITLE;
  if (!isRunningBitrise) {
    await device.reverseTcpPort(12345);
  }
  // Start server cause all E2E test relies on the new infrastructure for fixtures once IS_TEST is `true`
  await startFixtureServer();
  // Load an empty fixtures to go through the onboarding process
  await loadFixture();
  await device.launchApp();
});

afterAll(async () => {
  await stopFixtureServer();
});
