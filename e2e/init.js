import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../wdio/fixtures/fixture-helper';

beforeAll(async () => {
  await device.reverseTcpPort(12345);
  await startFixtureServer();
  await loadFixture();
  await device.launchApp();
});

afterAll(async () => {
  await stopFixtureServer();
});
