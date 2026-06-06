/* eslint-disable import-x/no-nodejs-modules */
import { spawn, type ChildProcess } from 'child_process';
import { createLogger, LogLevel } from '../../logger';

const logger = createLogger({ name: 'AppiumServer', level: LogLevel.INFO });

// Track the running Appium process so we can kill it by PID instead of pkill.
let appiumServerProcess: ChildProcess | null = null;

// Track the current exit handler to prevent listener accumulation
let currentExitHandler: (() => void) | null = null;

// Default timeout for Appium server startup (in milliseconds)
const APPIUM_STARTUP_TIMEOUT_MS = 60_000;

/**
 * Start the Appium server
 * @param timeoutMs - Maximum time to wait for Appium to start (default: 60 seconds)
 */
export async function startAppiumServer(
  timeoutMs: number = APPIUM_STARTUP_TIMEOUT_MS,
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    let isSettled = false;
    let startupTimeout: NodeJS.Timeout | null = null;

    const settlePromise = (
      settler: typeof resolve | typeof reject,
      value: ChildProcess | Error,
    ) => {
      if (isSettled) return;
      isSettled = true;
      if (startupTimeout) {
        clearTimeout(startupTimeout);
        startupTimeout = null;
      }
      settler(value as ChildProcess & Error);
    };

    const appiumProcess = spawn(
      'yarn',
      ['appium', '--allow-insecure=chromedriver_autodownload'],
      {
        stdio: 'pipe',
      },
    );

    // Set up startup timeout to prevent indefinite hangs
    startupTimeout = setTimeout(() => {
      if (!isSettled) {
        logger.error(
          `Appium server failed to start within ${timeoutMs}ms. Killing process...`,
        );
        appiumProcess.kill();
        settlePromise(
          reject,
          new Error(
            `Appium server startup timed out after ${timeoutMs}ms. ` +
              'The server may be hanging or the expected startup message has changed. ' +
              'Check Appium logs for details.',
          ),
        );
      }
    }, timeoutMs);

    appiumProcess.stderr.on('data', async (data: Buffer) => {
      logger.debug(data.toString());
    });

    appiumProcess.stdout.on('data', async (data: Buffer) => {
      const output = data.toString();
      logger.debug(output);

      if (output.includes('Error: listen EADDRINUSE')) {
        logger.error(`Appium: ${data}`);
        settlePromise(
          reject,
          new Error(
            'Appium server is already running. Please stop the server before running tests.',
          ),
        );
      }

      if (output.includes('Appium REST http interface listener started')) {
        logger.debug('Appium server is up and running.');
        appiumServerProcess = appiumProcess;
        settlePromise(resolve, appiumProcess);
      }
    });

    appiumProcess.on('error', (error) => {
      logger.error(`Appium: ${error}`);
      settlePromise(reject, error);
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
        settlePromise(
          reject,
          new Error(
            `Appium server exited unexpectedly with code ${code} before starting. Check logs for details.`,
          ),
        );
      }
    });
  });
}

/**
 * Stop the Appium server.
 * Kills the tracked process by PID to avoid accidentally matching and killing
 * the parent test-runner process (which also has "appium" in its command line).
 */
export function stopAppiumServer(): Promise<void> {
  // Remove the exit handler since we're explicitly stopping the server
  if (currentExitHandler) {
    process.removeListener('exit', currentExitHandler);
    currentExitHandler = null;
  }

  return new Promise((resolve) => {
    const proc = appiumServerProcess;
    appiumServerProcess = null;

    if (!proc || proc.exitCode !== null || proc.killed) {
      logger.debug('No running Appium server process found to stop.');
      return resolve();
    }

    proc.once('close', () => {
      logger.debug('Appium server stopped successfully.');
      resolve();
    });

    proc.kill('SIGTERM');
  });
}
