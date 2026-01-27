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
