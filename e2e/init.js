import { startFixtureServer, stopFixtureServer } from './viewHelper';

beforeAll(async () => {
  await device.reverseTcpPort(12345);
  await startFixtureServer();
  await device.launchApp();
});

afterAll(async () => {
  await stopFixtureServer();
});
