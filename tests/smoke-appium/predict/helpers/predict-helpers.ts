import { createLogger, LogLevel } from '../../../framework/logger.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';

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

/**
 * Disables the Perps homepage section for predict smoke tests.
 * With homepageSectionsV1 enabled, an uninitialized Perps stream crashes wallet home
 * (`PERPS_EVENT_VALUE.SECTION_NAME.BALANCE` / `usePerpsLivePositions`).
 */
export const remoteFeatureFlagPerpsDisabledForPredictSmoke = () => ({
  perpsPerpTradingEnabled: {
    enabled: false,
    minimumVersion: '0.0.0',
  },
});

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
 * Mirrors Detox `loginToApp()` — wallet wait is handled by `loginToAppPlaywright`.
 */
export async function loginForPredictTests(): Promise<void> {
  await loginToAppPlaywright({ scenarioType: 'e2e' });
}
