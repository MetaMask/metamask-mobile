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

const DEFAULT_APPIUM_HOST = '127.0.0.1';
const DEFAULT_APPIUM_PORT = 4723;

/**
 * Resolve Appium host from env (default: 127.0.0.1).
 */
export function getAppiumHost(): string {
  return process.env.APPIUM_HOST ?? DEFAULT_APPIUM_HOST;
}

/**
 * Resolve Appium port from env (default: 4723).
 */
export function getAppiumPort(): number {
  const parsed = Number(process.env.APPIUM_PORT ?? DEFAULT_APPIUM_PORT);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid APPIUM_PORT "${process.env.APPIUM_PORT}". Expected a positive integer.`,
    );
  }
  return parsed;
}

/**
 * Build the Appium server base URL for health checks and WebDriverIO.
 */
export function getAppiumServerUrl(): string {
  return `http://${getAppiumHost()}:${getAppiumPort()}`;
}

/**
 * Whether the test runner should leave Appium running after the job.
 * Set explicitly via SKIP_APPIUM_STOP (e.g. Android CI keeps one server per job).
 */
export function shouldSkipAppiumStop(): boolean {
  return process.env.SKIP_APPIUM_STOP === 'true';
}

/**
 * Check whether Appium is already listening on the configured host/port.
 */
export async function isAppiumServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${getAppiumServerUrl()}/status`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Start the Appium server
 * @param timeoutMs - Maximum time to wait for Appium to start (default: 60 seconds)
 */
export async function startAppiumServer(
  timeoutMs: number = APPIUM_STARTUP_TIMEOUT_MS,
): Promise<ChildProcess | null> {
  if (await isAppiumServerRunning()) {
    logger.info(`Reusing existing Appium server at ${getAppiumServerUrl()}.`);
    return null;
  }

  const host = getAppiumHost();
  const port = getAppiumPort();

  return new Promise((resolve, reject) => {
    let isSettled = false;
    let startupTimeout: NodeJS.Timeout | null = null;

    const settlePromise = (
      settler: typeof resolve | typeof reject,
      value: ChildProcess | Error | null,
    ) => {
      if (isSettled) return;
      isSettled = true;
      if (startupTimeout) {
        clearTimeout(startupTimeout);
        startupTimeout = null;
      }
      settler(value as ChildProcess & Error & null);
    };

    const appiumProcess = spawn(
      'yarn',
      [
        'appium',
        '--allow-insecure=chromedriver_autodownload,adb_shell',
        '--port',
        String(port),
        '--address',
        host,
      ],
      {
        stdio: 'pipe',
        // detached: true puts appium in its own process group so we can
        // kill the whole group (yarn + appium children) with -pid later.
        detached: true,
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
        if (await isAppiumServerRunning()) {
          logger.info(
            `Appium port ${port} already in use — reusing existing server.`,
          );
          appiumProcess.kill();
          settlePromise(resolve, null);
          return;
        }
        logger.error(`Appium: ${data}`);
        settlePromise(
          reject,
          new Error(
            `Appium port ${port} is in use but /status is not reachable.`,
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
      if (shouldSkipAppiumStop()) {
        return;
      }
      logger.debug('Main process exiting. Killing Appium server...');
      if (appiumProcess.pid !== undefined) {
        try {
          process.kill(-appiumProcess.pid, 'SIGTERM');
        } catch {
          appiumProcess.kill('SIGTERM');
        }
      } else {
        appiumProcess.kill('SIGTERM');
      }
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
 * Skips stop when SKIP_APPIUM_STOP is set or when this process did not spawn Appium.
 */
export function stopAppiumServer(): Promise<void> {
  if (shouldSkipAppiumStop()) {
    logger.debug('Skipping Appium server stop (SKIP_APPIUM_STOP).');
    return Promise.resolve();
  }

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

    // Safety timeout: resolve after 10s even if 'close' never fires.
    const fallbackTimer = setTimeout(() => {
      logger.warn('Appium server did not exit within 10s; continuing anyway.');
      resolve();
    }, 10_000);

    proc.once('close', () => {
      clearTimeout(fallbackTimer);
      logger.debug('Appium server stopped successfully.');
      resolve();
    });

    // Kill the entire process group (-pid) so yarn AND the appium child
    // process are both terminated. Falls back to killing just the direct
    // child if process-group kill is unavailable (e.g. pid is undefined).
    if (proc.pid !== undefined) {
      try {
        process.kill(-proc.pid, 'SIGTERM');
      } catch {
        proc.kill('SIGTERM');
      }
    } else {
      proc.kill('SIGTERM');
    }
  });
}
