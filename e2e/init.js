import { getFixturesServerPort } from './utils';

beforeAll(async () => {
  await device.launchApp({
    launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
  });
});
