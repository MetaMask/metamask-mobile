/* eslint-disable import/no-nodejs-modules */
import path from 'path';
import {
  defineConfig as defineConfigPlaywright,
  PlaywrightTestConfig,
  ReporterDescription,
} from '@playwright/test';
import { WebDriverConfig } from '../../e2e/framework/types';

const resolveGlobalSetup = () => path.join(__dirname, 'global.setup.ts');

const defaultConfig: PlaywrightTestConfig<WebDriverConfig> = {
  globalSetup: resolveGlobalSetup(),
  testDir: './tests',
  // This is turned off so that a persistent device fixture can be
  // used across tests in a file where they run sequentially
  fullyParallel: false,
  forbidOnly: false,
  retries: 1, // Locking this to 1 worker only before moving to CI
  workers: 2,
  reporter: [['list'], ['html', { open: 'always' }]],
  use: {
    actionTimeout: 20_000,
    expectTimeout: 20_000,
  },
  expect: {
    // This is not used right now
    timeout: 20_000,
  },
  timeout: 0,
};

export function defineConfig(config: PlaywrightTestConfig<WebDriverConfig>) {
  let reporterConfig: ReporterDescription[];
  if (config.reporter) {
    reporterConfig = config.reporter as ReporterDescription[];
  } else {
    reporterConfig = [['list'], ['html', { open: 'always' }]];
  }
  return defineConfigPlaywright<WebDriverConfig>({
    ...defaultConfig,
    ...config,
    globalSetup: [resolveGlobalSetup()],
    reporter: [...reporterConfig],
    use: {
      ...defaultConfig.use,
      expectTimeout: config.use?.expectTimeout
        ? config.use?.expectTimeout
        : defaultConfig.use?.expectTimeout,
    },
  });
}
