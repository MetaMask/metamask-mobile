import { startFixtureServer, stopFixtureServer } from './viewHelper';

beforeAll(async () => {
  await startFixtureServer();
  await device.launchApp();
});

afterAll(async () => {
  await stopFixtureServer();
});
