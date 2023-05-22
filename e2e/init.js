import { startFixtureServer, stopFixtureServer } from './helpers';
beforeAll(async () => {
  await startFixtureServer();
  await device.launchApp();
});

afterAll(async () => {
  await stopFixtureServer();
});
