import { createLogger, LogLevel } from '../../../framework/logger';

const logger = createLogger({
  name: 'PredictHelpers',
  level: LogLevel.INFO,
});

/**
 * Location coordinates for Portugal (required for Predictions, specifically when US engineers aredebugging locally)
 */
export const PORTUGAL_LOCATION = {
  lat: 41.1318702,
  lon: -7.798836,
};

/**
 * Disables the Perps homepage section for predict smoke tests.
 * With homepage sections enabled, an uninitialized Perps stream can crash wallet home
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
  static async setPortugalLocation() {
    logger.info('[PredictHelpers] Setting device location to Portugal...');
    await device.setLocation(PORTUGAL_LOCATION.lat, PORTUGAL_LOCATION.lon);
    logger.info(
      '[PredictHelpers] Device location set to Portugal successfully',
    );
  }
}
