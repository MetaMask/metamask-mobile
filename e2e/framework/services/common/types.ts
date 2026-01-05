import type { FullProject } from '@playwright/test';
import type { WebDriverConfig } from '../../types';

/**
 * Project configuration with WebDriver settings
 */
export type ProjectConfig = FullProject<WebDriverConfig>;

/**
 * Common capabilities shared across providers
 */
export interface CommonCapabilities {
  'appium:deviceName'?: string;
  'appium:platformVersion'?: string;
  'appium:automationName'?: string;
  'appium:app'?: string;
  'appium:autoGrantPermissions'?: boolean;
  'appium:autoAcceptAlerts'?: boolean;
  'appium:fullReset'?: boolean;
  'appium:deviceOrientation'?: string;
  'appium:settings[snapshotMaxDepth]'?: number;
  platformName?: string;
}
