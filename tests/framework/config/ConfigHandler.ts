/* eslint-disable import-x/no-nodejs-modules */
import path from 'path';
import {
  defineConfig as defineConfigPlaywright,
  PlaywrightTestConfig,
  ReporterDescription,
} from '@playwright/test';
import { WebDriverConfig } from '../types';
import {
  DEFAULT_ACTION_TIMEOUT_MS,
  DEFAULT_IMPLICIT_WAIT_MS,
} from '../Constants';

const resolveGlobalSetup = () => path.join(__dirname, 'global.setup.ts');
const resolveGlobalTeardown = () => path.join(__dirname, 'global.teardown.ts');

const isCI = process.env.CI === 'true';

const defaultConfig: PlaywrightTestConfig<WebDriverConfig> = {
  globalSetup: resolveGlobalSetup(),
  globalTeardown: resolveGlobalTeardown(),
  testDir: './tests',
  // This is turned off so that a persistent device fixture can be
  // used across tests in a file where they run sequentially
  fullyParallel: false,
  forbidOnly: false,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'always' }]],
  timeout: 300_000,
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
    globalTeardown: resolveGlobalTeardown(),
    reporter: [...reporterConfig],
    use: {
      actionTimeout: DEFAULT_ACTION_TIMEOUT_MS,
      expectTimeout: DEFAULT_IMPLICIT_WAIT_MS,
      ...config.use,
    },
  });
}
