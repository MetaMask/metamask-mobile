import { BrowserStackProvider } from '../services/providers/browserstack/BrowserStackProvider.ts';
import { createLogger, LogLevel } from '../logger';

const logger = createLogger({
  name: 'GlobalTeardown',
  level: LogLevel.INFO,
});

/**
 * Global teardown hook - runs once after all tests
 * Stops any long-lived resources started in globalSetup (e.g. BrowserStack Local tunnel)
 */
async function globalTeardown() {
  await BrowserStackProvider.stopLocalTunnel();
  logger.info('✨ Global teardown complete');
}

export default globalTeardown;
