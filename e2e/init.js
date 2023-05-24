const config = require('../package.json').detox; // eslint-disable-line

import detox from 'detox';
import adapter from 'detox/runners/jest/adapter';
// import { startFixtureServer, stopFixtureServer } from './viewHelper';

jest.setTimeout(2250000);
jasmine.getEnv().addReporter(adapter);

beforeAll(async () => {
  await detox.init(config);
  // await startFixtureServer();
  await device.launchApp();
});

beforeEach(async () => {
  await adapter.beforeEach();
});

afterAll(async () => {
  await adapter.afterAll();
  // await stopFixtureServer();
  await detox.cleanup();
  jest.setTimeout(3000);
});
