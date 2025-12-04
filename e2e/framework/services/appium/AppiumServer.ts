/* eslint-disable import/no-nodejs-modules */
import { spawn, exec, type ChildProcess } from 'child_process';
import { createLogger } from '../../logger';

const logger = createLogger({ name: 'AppiumServer' });

// Track the current exit handler to prevent listener accumulation
let currentExitHandler: (() => void) | null = null;

/**
 * Start the Appium server
 */
export async function startAppiumServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    let isSettled = false;

    const appiumProcess = spawn(
      'yarn',
      ['appium', '--allow-insecure=chromedriver_autodownload'],
      {
        stdio: 'pipe',
      },
    );

    appiumProcess.stderr.on('data', async (data: Buffer) => {
      logger.debug(data.toString());
    });

    appiumProcess.stdout.on('data', async (data: Buffer) => {
      const output = data.toString();
      logger.debug(output);

      if (output.includes('Error: listen EADDRINUSE')) {
        logger.error(`Appium: ${data}`);
        isSettled = true;
        reject(
          new Error(
            'Appium server is already running. Please stop the server before running tests.',
          ),
        );
      }

      if (output.includes('Appium REST http interface listener started')) {
        logger.debug('Appium server is up and running.');
        isSettled = true;
        resolve(appiumProcess);
      }
    });

    appiumProcess.on('error', (error) => {
      logger.error(`Appium: ${error}`);
      isSettled = true;
      reject(error);
    });

    // Remove any existing exit handler before adding a new one
    if (currentExitHandler) {
      process.removeListener('exit', currentExitHandler);
    }

    // Create and track the new exit handler
    currentExitHandler = () => {
      logger.debug('Main process exiting. Killing Appium server...');
      appiumProcess.kill();
    };
    process.on('exit', currentExitHandler);

    appiumProcess.on('close', (code: number) => {
      logger.debug(`Appium server exited with code ${code}`);
      if (!isSettled) {
        reject(
          new Error(
            `Appium server exited unexpectedly with code ${code} before starting. Check logs for details.`,
          ),
        );
      }
    });
  });
}

/**
 * Stop the Appium server
 *
 * Note: pkill exit codes:
 * - 0: One or more processes matched and were signaled
 * - 1: No processes matched (not an error - server wasn't running)
 * - 2: Syntax error in command line
 * - 3: Fatal error
 */
export function stopAppiumServer(): Promise<string> {
  // Remove the exit handler since we're explicitly stopping the server
  if (currentExitHandler) {
    process.removeListener('exit', currentExitHandler);
    currentExitHandler = null;
  }

  return new Promise((resolve, reject) => {
    exec('pkill -f appium', (error, stdout) => {
      if (error) {
        // Exit code 1 means no processes matched - this is fine, server wasn't running
        if ('code' in error && error.code === 1) {
          logger.debug('No Appium server process found to stop.');
          return resolve(stdout);
        }
        // Actual error (syntax error, fatal error, or system error)
        logger.error(`Error stopping Appium server: ${error.message}`);
        return reject(error);
      }
      logger.debug('Appium server stopped successfully.');
      resolve(stdout);
    });
  });
}
