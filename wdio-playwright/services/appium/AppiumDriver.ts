/* eslint-disable import/no-nodejs-modules */
import { spawn } from 'child_process';
import { createLogger } from '../../../e2e/framework/logger';

const logger = createLogger({ name: 'AppiumDriver' });

/**
 * Install an Appium driver
 */
export async function installDriver(driverName: string): Promise<void> {
  logger.debug(`Installing Appium driver: ${driverName}`);

  const uninstallPromise = new Promise<number>((resolve) => {
    const uninstallProcess = spawn(
      'npx',
      ['appium', 'driver', 'uninstall', driverName],
      {
        stdio: 'pipe',
      },
    );
    uninstallProcess.on('exit', (code) => {
      resolve(code ?? 0);
    });
  });

  const installPromise = new Promise<number>((resolve) => {
    const installProcess = spawn(
      'npx',
      ['appium', 'driver', 'install', driverName],
      {
        stdio: 'pipe',
      },
    );
    installProcess.on('exit', (code) => {
      resolve(code ?? 0);
    });
  });

  await Promise.all([uninstallPromise, installPromise]);
  logger.debug(`Driver ${driverName} installed successfully`);
}
