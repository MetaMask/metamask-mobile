/* eslint-disable import/no-nodejs-modules */
import { exec } from 'child_process';
import path from 'path';
import { Platform } from '../../types';
import { createLogger } from '../../logger';

const logger = createLogger({ name: 'EmulatorHelpers' });

/**
 * Check if emulator is installed for the given platform
 * Not in use for now
 */
export function isEmulatorInstalled(platform: Platform): Promise<boolean> {
  return new Promise((resolve) => {
    if (platform === Platform.ANDROID) {
      const androidHome = process.env.ANDROID_HOME;
      if (!androidHome) {
        throw new Error(
          'ANDROID_HOME is not set. Please set the ANDROID_HOME environment variable.',
        );
      }

      const emulatorPath = path.join(androidHome, 'emulator', 'emulator');
      exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
        if (error) {
          throw new Error(
            `Error fetching emulator list.\nPlease make sure to follow the steps in the Android emulator section of the environment setup guide: https://github.com/MetaMask/metamask-mobile/blob/main/docs/readme/environment.md#android`,
          );
        }
        if (stderr) {
          logger.error(`Emulator: ${stderr}`);
        }

        const lines = stdout.trim().split('\n');
        const deviceNames = lines.filter(
          (line) =>
            line.trim() && !line.startsWith('INFO') && !line.includes('/tmp/'),
        );

        if (deviceNames.length > 0) {
          resolve(true);
        } else {
          throw new Error(
            'No installed emulators found. Please make sure create an emulator with the specs mentioned at https://github.com/MetaMask/metamask-mobile/blob/main/docs/readme/e2e-testing.md#tooling-setup',
          );
        }
      });
    } else {
      // iOS simulators - to be implemented
      resolve(true);
    }
  });
}

/**
 * Start Android emulator - to be implemented
 */
export function startAndroidEmulator(deviceName: string): void {
  throw new Error(
    `Starting Android emulator ${deviceName} - Not implemented yet`,
  );
}

/**
 * Stop Android emulator - to be implemented
 */
export function stopAndroidEmulator(deviceName: string): void {
  throw new Error(
    `Stopping Android emulator ${deviceName} - Not implemented yet`,
  );
}

/**
 * Start iOS simulator - to be implemented
 */
export function startIosSimulator(deviceName: string): void {
  throw new Error(`Starting iOS simulator ${deviceName} - Not implemented yet`);
}

/**
 * Stop iOS simulator - to be implemented
 */
export function stopIosSimulator(deviceName: string): void {
  throw new Error(`Stopping iOS simulator ${deviceName} - Not implemented yet`);
}
