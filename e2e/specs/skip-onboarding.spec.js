'use strict';
import { Regression } from '../tags';
const config = require('../package.json').detox; // eslint-disable-line

import WalletView from '../pages/WalletView';

import LoginView from '../pages/LoginView';
import { startFixtureServer, stopFixtureServer } from '../viewHelper';
import detox from 'detox';
import adapter from 'detox/runners/jest/adapter';

const PASSWORD = '123123123';

jest.setTimeout(2250000);
jasmine.getEnv().addReporter(adapter);

beforeAll(async () => {
  await detox.cleanup();
  jest.setTimeout(3000);
  await detox.init(config);
  await startFixtureServer();
  await device.launchApp();
});

beforeEach(async () => {
  await adapter.beforeEach();
});

afterAll(async () => {
  await adapter.afterAll();
  await stopFixtureServer();
  await detox.cleanup();
  jest.setTimeout(3000);
});
describe(Regression('Skip Onboarding to test fixtures'), () => {
  it('should relaunch the app and log in', async () => {
    await LoginView.isVisible();
    await LoginView.enterPassword(PASSWORD);

    await WalletView.isVisible();
  });
});
