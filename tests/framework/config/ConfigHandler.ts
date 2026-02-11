/* eslint-disable import/no-nodejs-modules */
import path from 'path';
import {
  defineConfig as defineConfigPlaywright,
  PlaywrightTestConfig,
  ReporterDescription,
} from '@playwright/test';
import { WebDriverConfig } from '../types.ts';

const resolveGlobalSetup = () => path.join(__dirname, 'global.setup.ts');

const isCI = process.env.CI === 'true';

const defaultConfig: PlaywrightTestConfig<WebDriverConfig> = {
  globalSetup: resolveGlobalSetup(),
  testDir: './tests',
  // This is turned off so that a persistent device fixture can be
  // used across tests in a file where they run sequentially
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
  workers: isCI ? 2 : 1,
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
    reporter: [...reporterConfig],
    use: {
      actionTimeout: 20_000,
      expectTimeout: 20_000,
      ...config.use,
    },
  });
}
