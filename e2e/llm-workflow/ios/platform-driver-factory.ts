import { join } from 'node:path';

import {
  ensureRunnerBuild,
  IOSPlatformDriver,
  startRunner,
  waitForReady,
  XCUITestClient,
} from '@metamask/client-mcp-core';

import {
  IOSLaunchError,
  type ResolvedIOSLaunchOptions,
} from '../launcher-types';

export type CreatePlatformDriverOptions = {
  resolved: ResolvedIOSLaunchOptions;
  /** Optional log directory override; defaults to package default. */
  logDir?: string;
  /** Optional derived-data path override. */
  derivedDataPath?: string;
};

export type CreatedIOSDriver = {
  driver: IOSPlatformDriver;
  client: XCUITestClient;
  runnerPort: number;
};

export type StartedIOSRunner = {
  client: XCUITestClient;
  runnerPort: number;
  derivedDataPath: string;
};

export async function createIOSPlatformDriver(
  options: CreatePlatformDriverOptions,
): Promise<CreatedIOSDriver> {
  const started = await startIOSRunner(options);

  return bindAndCreateIOSDriver({ resolved: options.resolved, started });
}

export async function startIOSRunner(options: {
  resolved: ResolvedIOSLaunchOptions;
  logDir?: string;
  derivedDataPath?: string;
}): Promise<StartedIOSRunner> {
  const { resolved } = options;

  try {
    const { derivedDataPath } = await ensureRunnerBuild({
      destination: resolved.destination,
      derivedDataPath: options.derivedDataPath,
    });
    const runnerPort = await startRunner({
      derivedDataPath,
      destination: resolved.destination,
      logDir: options.logDir,
    });
    const client = new XCUITestClient({ port: runnerPort });
    const ready = await waitForReady(async () => {
      try {
        await client.ping();
        return true;
      } catch {
        return false;
      }
    }, 15_000);

    if (!ready) {
      throw new IOSLaunchError({
        code: 'MM_IOS_RUNNER_NOT_READY',
        message: 'XCUITest runner did not become ready within 15s',
      });
    }

    return { client, runnerPort, derivedDataPath };
  } catch (error) {
    if (error instanceof IOSLaunchError) {
      throw error;
    }

    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create iOS driver',
    });
  }
}

export async function bindAndCreateIOSDriver(options: {
  resolved: ResolvedIOSLaunchOptions;
  started: StartedIOSRunner;
}): Promise<CreatedIOSDriver> {
  const { resolved, started } = options;

  try {
    await started.client.bind(resolved.appBundleId);

    const driver = new IOSPlatformDriver(
      started.client,
      resolved.simulatorDeviceId,
      {
        appBundleId: resolved.appBundleId,
        screenshotDir: join(process.cwd(), 'test-artifacts', 'screenshots'),
        metroPort: resolved.metroPort,
      },
    );

    return {
      driver,
      client: started.client,
      runnerPort: started.runnerPort,
    };
  } catch (error) {
    if (error instanceof IOSLaunchError) {
      throw error;
    }

    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: error instanceof Error ? error.message : 'Failed to bind iOS driver',
    });
  }
}
