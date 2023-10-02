import { getFixturesServerPort } from './dynamical-port-generator';

beforeAll(async () => {
  await device.launchApp({
    launchArgs: { jestWorkerId: `${getFixturesServerPort()}` },
  });
});
