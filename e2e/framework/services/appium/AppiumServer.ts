/* eslint-disable import/no-nodejs-modules */
import { spawn, exec, type ChildProcess } from 'child_process';
import { createLogger } from '../../logger';

const logger = createLogger({ name: 'AppiumServer' });

/**
 * Start the Appium server
 */
export async function startAppiumServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
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
        reject(
          new Error(
            'Appium server is already running. Please stop the server before running tests.',
          ),
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

/**
 * Stop the Appium server
 */
export function stopAppiumServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec('pkill -f appium', (error, stdout) => {
      if (error) {
        logger.error(`Error stopping Appium server: ${error.message}`);
        reject(error);
      }
      logger.debug('Appium server stopped successfully.');
      resolve(stdout);
    });
  });
}
