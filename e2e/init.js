import { getFixturesServerPort } from './fixtures/utils';

beforeAll(async () => {
  await device.launchApp({
    launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
  });
});
