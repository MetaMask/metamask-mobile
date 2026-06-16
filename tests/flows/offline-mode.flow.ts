import { createLogger } from '../framework/logger';
import { FrameworkDetector } from '../framework/FrameworkDetector';
import PlaywrightUtilities, {
  getDriver,
} from '../framework/PlaywrightUtilities';
import {
  OFFLINE_MODE_BODY_FRAGMENT,
  OFFLINE_MODE_TITLE,
  OfflineModeGuardError,
} from '../framework/fixtures/EmulatorHostConnectivity';

const logger = createLogger({
  name: 'OfflineModeFlow',
});

async function isOfflineModeVisible(): Promise<boolean> {
  const driver = getDriver();
  const xpath = [
    `//*[contains(@text,'${OFFLINE_MODE_TITLE}')]`,
    `//*[contains(@label,'${OFFLINE_MODE_TITLE}')]`,
    `//*[contains(@name,'${OFFLINE_MODE_TITLE}')]`,
    `//*[contains(@text,'${OFFLINE_MODE_BODY_FRAGMENT}')]`,
    `//*[contains(@label,'${OFFLINE_MODE_BODY_FRAGMENT}')]`,
    `//*[contains(@name,'${OFFLINE_MODE_BODY_FRAGMENT}')]`,
  ].join(' | ');

  const element = await driver.$(xpath);
  if (!(await element.isExisting())) {
    return false;
  }

  return element.isDisplayed();
}

/**
 * Fail fast when the app is stuck on OfflineMode instead of timing out on
 * unrelated selectors (e.g. account-picker).
 */
export async function assertNotOnOfflineModeScreen(
  context = 'during test',
): Promise<void> {
  if (!FrameworkDetector.isAppium()) {
    return;
  }

  try {
    if (await isOfflineModeVisible()) {
      throw new OfflineModeGuardError(context);
    }
  } catch (error) {
    if (error instanceof OfflineModeGuardError) {
      throw error;
    }
    logger.debug(
      `OfflineMode probe skipped (${context}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Tap "Try again" on OfflineMode when visible, then re-check.
 * Best-effort recovery for transient NetInfo flaps on CI.
 */
export async function recoverFromOfflineModeIfVisible(
  context = 'during test',
): Promise<void> {
  if (!FrameworkDetector.isAppium()) {
    return;
  }

  if (!(await isOfflineModeVisible())) {
    return;
  }

  logger.warn(`OfflineMode visible ${context}; tapping Try again once`);
  const driver = getDriver();
  const tryAgainXpath = [
    "//*[contains(@text,'Try again')]",
    "//*[contains(@label,'Try again')]",
    "//*[contains(@name,'Try again')]",
  ].join(' | ');
  const tryAgain = await driver.$(tryAgainXpath);
  if (await tryAgain.isExisting()) {
    await tryAgain.click();
    await PlaywrightUtilities.wait(3000);
  }

  if (await isOfflineModeVisible()) {
    throw new OfflineModeGuardError(`${context} (after Try again)`);
  }
}
