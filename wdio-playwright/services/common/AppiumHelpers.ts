/* eslint-disable import/no-nodejs-modules */
import { exec, spawn, type ChildProcess } from 'child_process';
import { createLogger } from '../../../e2e/framework/logger';
import { Platform } from '../../../e2e/framework/types';
import path from 'path';

const logger = createLogger({
  name: 'AppiumHelpers',
});

export async function installDriver(driverName: string): Promise<void> {
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
}

export async function startAppiumServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const appiumProcess = spawn('npx', ['appium'], {
      stdio: 'pipe',
    });
    appiumProcess.stderr.on('data', async (data: Buffer) => {
      logger.debug(data.toString());
    });
    appiumProcess.stdout.on('data', async (data: Buffer) => {
      const output = data.toString();
      logger.debug(output);

      if (output.includes('Error: listen EADDRINUSE')) {
        logger.error(`Appium: ${data}`);
        throw new Error(
          `Appium server is already running. Please stop the server before running tests.`,
        );
      }

      if (output.includes('Appium REST http interface listener started')) {
        logger.debug('Appium server is up and running.');
        resolve(appiumProcess);
      }
    });

    appiumProcess.on('error', (error) => {
      logger.error(`Appium: ${error}`);
      reject(error);
    });

    process.on('exit', () => {
      logger.debug('Main process exiting. Killing Appium server...');
      appiumProcess.kill();
    });

    appiumProcess.on('close', (code: number) => {
      logger.debug(`Appium server exited with code ${code}`);
    });
  });
}

export function stopAppiumServer() {
  return new Promise((resolve, reject) => {
    exec(`pkill -f appium`, (error, stdout) => {
      if (error) {
        logger.error(`Error stopping Appium server: ${error.message}`);
        reject(error);
      }
      logger.debug('Appium server stopped successfully.');
      resolve(stdout);
    });
  });
}

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
            `Error fetching emulator list.\nPlease install emulator from Android SDK Tools.
  Follow this guide to install emulators: https://community.neptune-software.com/topics/tips--tricks/blogs/how-to-install--android-emulator-without--android--st`,
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
            `No installed emulators found.
  Follow this guide to install emulators: https://community.neptune-software.com/topics/tips--tricks/blogs/how-to-install--android-emulator-without--android--st`,
          );
        }
      });
    }
  });
}

export function startAndroidEmulator(): void {
  throw new Error('Not implemented');
}

export function stopAndroidEmulator(): void {
  throw new Error('Not implemented');
}

export function startIosEmulator(): void {
  throw new Error('Not implemented');
}

export function stopIosEmulator(): void {
  throw new Error('Not implemented');
}
