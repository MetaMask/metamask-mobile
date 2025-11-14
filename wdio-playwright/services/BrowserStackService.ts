import { ServiceProviderInterface } from './IServiceProvider';
import { createLogger } from '../../e2e/framework/logger';
import { BrowserStackConfig, WebDriverConfig } from '../../e2e/framework';
import { FullProject } from '@playwright/test';
import { remote } from 'webdriverio';
// eslint-disable-next-line import/no-nodejs-modules
import path from 'path';

const API_BASE_URL = 'https://api-cloud.browserstack.com/app-automate';
const BROWSERSTACK_USERNAME = process.env.BROWSERSTACK_USERNAME;
const BROWSERSTACK_ACCESS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;

const logger = createLogger({
  name: 'BrowserStackProvider',
});

export class BrowerStackProvider implements ServiceProviderInterface {
  sessionId?: string | undefined;
  private project: FullProject<WebDriverConfig>;

  constructor(project: FullProject<WebDriverConfig>) {
    this.project = project;
  }

  async globalSetup?(): Promise<void> {
    // TODO verify that the bs:// app exists in BrowserStack and is valid
    logger.info('Global setup for BrowserStack was not implemented yet.');
  }

  async getDriver() {
    const webDriverClient = await remote(this.createConfig());
    this.sessionId = webDriverClient.sessionId;
    return webDriverClient;
  }

  async syncTestDetails(details: {
    status?: string;
    reason?: string;
    name?: string;
  }) {
    if (!BROWSERSTACK_USERNAME || !BROWSERSTACK_ACCESS_KEY) {
      throw new Error(
        'BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY are required',
      );
    }

    const authHeader = `Basic ${Buffer.from(`${BROWSERSTACK_USERNAME}:${BROWSERSTACK_ACCESS_KEY}`).toString('base64')}`;
    const response = await fetch(
      `${API_BASE_URL}/sessions/${this.sessionId}.json`,
      {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: details.status
          ? JSON.stringify({
              status: details.status,
              reason: details.reason,
            })
          : JSON.stringify({
              name: details.name,
            }),
      },
    );
    if (!response.ok) {
      throw new Error(`Error setting session details: ${response.statusText}`);
    }

    const responseData = await response.json();
    return responseData;
  }

  private createConfig() {
    const platformName = this.project.use.platform;
    const projectName = path.basename(process.cwd());
    const appBsUrl = this.project.use.buildPath;

    if (!appBsUrl) {
      throw new Error('Browerstack Service Error: appBsUrl is not set');
    }

    return {
      port: 443,
      path: '/wd/hub',
      protocol: 'https',
      logLevel: 'warn' as const,
      user: process.env.BROWSERSTACK_USERNAME,
      key: process.env.BROWSERSTACK_ACCESS_KEY,
      hostname: 'hub.browserstack.com',
      capabilities: {
        'bstack:options': {
          // local: true, // To be implemented
          debug: true,
          interactiveDebugging: true,
          networkLogs: true,
          appiumVersion: '2.6.0', // Browserstack does not support appium 3 just yet.
          idleTimeout: 180,
          deviceName: this.project.use.device?.name,
          osVersion: (this.project.use.device as BrowserStackConfig).osVersion,
          platformName,
          deviceOrientation: this.project.use.device?.orientation,
          buildName: `${projectName} ${platformName}`,
          sessionName: `${projectName} ${platformName} test`,
          buildIdentifier:
            process.env.GITHUB_ACTIONS === 'true'
              ? `CI ${process.env.GITHUB_RUN_ID}`
              : process.env.USER,
        },
        'appium:autoGrantPermissions': true,
        'appium:app': appBsUrl,
        'appium:autoAcceptAlerts': true,
        'appium:fullReset': true,
        'appium:settings[snapshotMaxDepth]': 62,
      },
    };
  }
}
