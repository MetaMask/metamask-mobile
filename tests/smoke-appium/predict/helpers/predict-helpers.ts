import { createLogger, LogLevel } from '../../../framework/logger.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import Assertions from '../../../framework/Assertions.js';
import { resolveE2EWaitTimeoutMs } from '../../../framework/Constants.js';
import WalletView from '../../../page-objects/wallet/WalletView.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';

const logger = createLogger({
  name: 'PredictHelpers',
  level: LogLevel.INFO,
});

/**
 * Location coordinates for Portugal (required for Predictions, specifically when US engineers are debugging locally)
 */
export const PORTUGAL_LOCATION = {
  lat: 41.1318702,
  lon: -7.798836,
};

export class PredictHelpers {
  /**
   * Sets the device location to Portugal coordinates.
   * Required for Predictions feature access in e2e tests.
   */
  static async setPortugalLocation(): Promise<void> {
    const driver = globalThis.driver;
    if (!driver) {
      throw new Error(
        'WebDriver session not available — setPortugalLocation requires an active Appium session',
      );
    }

    logger.info('[PredictHelpers] Setting device location to Portugal...');
    await driver.setGeoLocation({
      latitude: String(PORTUGAL_LOCATION.lat),
      longitude: String(PORTUGAL_LOCATION.lon),
    });
    logger.info(
      '[PredictHelpers] Device location set to Portugal successfully',
    );
  }
}

/**
 * Logs into the app and waits for the wallet screen (Appium smoke tests).
 */
export async function loginForPredictTests(): Promise<void> {
  await loginToAppPlaywright({ scenarioType: 'e2e' });
  await PredictHelpers.setPortugalLocation();
  await TabBarComponent.tapWallet();
  await Assertions.expectElementToBeVisible(WalletView.container, {
    description: 'Wallet should be visible after login',
    timeout: resolveE2EWaitTimeoutMs(60_000),
  });
}
