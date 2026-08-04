/* eslint-disable import-x/no-nodejs-modules */
import { createRequire } from 'node:module';

import {
  MobilePlatformDriver,
  type SessionLaunchInput,
} from '@metamask/client-mcp-core';
import { createBackend, type DeviceBackend } from '@metamask/device-mcp';

import { AndroidLaunchError } from '../launcher-types';
import type {
  LaunchedMobileSession,
  MobilePlatformAdapter,
  ResolvedMobileLaunchOptions,
} from '../platform-adapter';
import { runDeviceAdb } from './adb';
import {
  disableAndroidAnimations,
  restoreAndroidAnimations,
  type AndroidAnimationState,
} from './animations';
import {
  attachAndroidMetro,
  cleanupAndroidMetro,
  type AndroidMetroAttachment,
} from './metro-watch-attach';
import {
  ANDROID_APP_ID,
  assertNoDeviceSessionOverride,
  normalizeAndroidComponent,
  validateAndroidPrerequisites,
  type ResolvedAndroidLaunchOptions,
} from './prerequisites';
import {
  wrapAndroidSnapshotBackend,
  type SnapshotBackendOptions,
} from './snapshot-backend';

const ANDROID_APP_ROOT_TEST_ID = 'metamask-app-root';
// A cold Metro bundle on a memory-constrained emulator can take more than a
// minute before the React root first mounts. Warm launches return well before
// this deadline, while cold launches need enough time to finish native and JS
// initialization without being force-stopped by partial-launch cleanup.
const DEFAULT_READINESS_TIMEOUT_MS = 120_000;
const DEFAULT_READINESS_INTERVAL_MS = 250;
const UNLOCKED_SCREEN_TEST_IDS = new Set([
  'wallet-screen',
  'tab-bar-item-Wallet',
  'account-overview',
]);

interface ResolvedAndroidAdapterOptions extends ResolvedMobileLaunchOptions {
  readonly platform: 'android';
  readonly android: ResolvedAndroidLaunchOptions;
}

interface AndroidPlatformAdapterDependencies {
  readonly createBackend?: typeof createBackend;
  readonly createDriver?: (
    backend: DeviceBackend,
    appId: string,
  ) => MobilePlatformDriver;
  readonly isAdbBackend?: (backend: DeviceBackend) => boolean;
  readonly wrapBackend?: (
    backend: DeviceBackend,
    options?: SnapshotBackendOptions,
  ) => DeviceBackend;
  readonly runDeviceAdb?: typeof runDeviceAdb;
  readonly now?: () => number;
  readonly delay?: (milliseconds: number) => Promise<void>;
  readonly readinessTimeoutMs?: number;
  readonly readinessIntervalMs?: number;
}

const nodeRequire = createRequire(__filename);
const { AdbBackend } = getAndroidBackendConstructor();

export function isAdbBackend(backend: DeviceBackend): boolean {
  return backend instanceof AdbBackend;
}

export class AndroidPlatformAdapter implements MobilePlatformAdapter {
  private readonly dependencies: Required<AndroidPlatformAdapterDependencies>;

  private resolved: ResolvedAndroidLaunchOptions | undefined;

  private backend: DeviceBackend | undefined;

  private metroAttachment: AndroidMetroAttachment | undefined;

  private animationState: AndroidAnimationState | undefined;

  private appLaunchAttempted = false;

  constructor(dependencies: AndroidPlatformAdapterDependencies = {}) {
    this.dependencies = {
      createBackend,
      createDriver: (backend, appId) =>
        new MobilePlatformDriver(backend, appId),
      isAdbBackend,
      wrapBackend: wrapAndroidSnapshotBackend,
      runDeviceAdb,
      now: Date.now,
      delay: sleep,
      readinessTimeoutMs: DEFAULT_READINESS_TIMEOUT_MS,
      readinessIntervalMs: DEFAULT_READINESS_INTERVAL_MS,
      ...dependencies,
    };
  }

  async resolve(
    input: SessionLaunchInput,
    metroPort?: number,
  ): Promise<ResolvedAndroidAdapterOptions> {
    const android = validateAndroidPrerequisites(input, metroPort);
    this.resolved = android;
    return {
      platform: 'android',
      deviceId: android.serial,
      appId: android.appId,
      appPath: `android-package://${android.appId}`,
      metroPort: android.metroPort,
      metadataLines: [
        `[mm-mobile] emulator=${android.serial}`,
        `[mm-mobile] package=${android.appId}`,
        '[mm-mobile] installAction=reuse-installed',
      ],
      android,
    };
  }

  async launch(
    resolved: ResolvedMobileLaunchOptions,
  ): Promise<LaunchedMobileSession> {
    const android = assertAndroidOptions(resolved).android;
    assertNoDeviceSessionOverride();
    const rawBackend = await this.dependencies.createBackend(
      android.serial,
      'android',
    );
    if (!this.dependencies.isAdbBackend(rawBackend)) {
      throw new AndroidLaunchError({
        code: 'MM_ANDROID_BACKEND_INTEGRITY',
        message:
          'createBackend did not return the required ADB backend for the Android emulator.',
        remediation: 'Remove .device-session and retry from this worktree.',
      });
    }

    const backend = this.dependencies.wrapBackend(rawBackend);
    this.backend = backend;
    const mobileDriver = this.dependencies.createDriver(backend, ANDROID_APP_ID);

    this.animationState = disableAndroidAnimations(
      android.serial,
      this.dependencies.runDeviceAdb,
    );

    if (android.metroPort !== undefined) {
      this.metroAttachment = await attachAndroidMetro(
        android.serial,
        android.metroPort,
        undefined,
        () => {
          this.appLaunchAttempted = true;
        },
      );
    } else {
      this.appLaunchAttempted = true;
      await backend.openApp(ANDROID_APP_ID);
    }

    const state = await this.waitForReadiness(android, mobileDriver);
    return { driver: mobileDriver, state };
  }

  async cleanup(): Promise<void> {
    const resolved = this.resolved;
    const backend = this.backend;
    const metroAttachment = this.metroAttachment;
    const animationState = this.animationState;
    const appLaunchAttempted = this.appLaunchAttempted;
    this.resolved = undefined;
    this.backend = undefined;
    this.metroAttachment = undefined;
    this.animationState = undefined;
    this.appLaunchAttempted = false;

    try {
      if (resolved && appLaunchAttempted) {
        await closeAndroidApp(resolved.serial, backend);
      }
    } finally {
      try {
        if (metroAttachment) cleanupAndroidMetro(metroAttachment);
      } finally {
        if (animationState) {
          restoreAndroidAnimations(animationState, this.dependencies.runDeviceAdb);
        }
      }
    }
  }

  private async waitForReadiness(
    android: ResolvedAndroidLaunchOptions,
    mobileDriver: MobilePlatformDriver,
  ): Promise<Awaited<ReturnType<MobilePlatformDriver['getAppState']>>> {
    const deadline =
      this.dependencies.now() + this.dependencies.readinessTimeoutMs;
    let lastFailure = 'MetaMask readiness markers were not observed.';

    while (this.dependencies.now() <= deadline) {
      try {
        const activityOutput = this.dependencies.runDeviceAdb(android.serial, [
          'shell',
          'dumpsys',
          'activity',
          'activities',
          ANDROID_APP_ID,
        ]);
        if (
          !hasExactResumedMetaMaskActivity(
            activityOutput,
            android.mainActivity,
          )
        ) {
          lastFailure = `${android.mainActivity} is not the exact resumed activity.`;
        } else {
          const state = await mobileDriver.getAppState();
          if (!state.isLoaded) {
            lastFailure = `${ANDROID_APP_ID} process is not running.`;
          } else {
            const testIds = await mobileDriver.getTestIds();
            const testIdValues = new Set(testIds.map(({ testId }) => testId));
            if (!testIdValues.has(ANDROID_APP_ROOT_TEST_ID)) {
              lastFailure = `React Native root marker ${ANDROID_APP_ROOT_TEST_ID} is not mounted.`;
            } else if (
              android.metroPort !== undefined &&
              !(await hasExactHermesTarget(mobileDriver, android.metroPort))
            ) {
              lastFailure = `Metro does not expose one unambiguous ${ANDROID_APP_ID} Hermes target.`;
            } else {
              const isUnlocked = [...UNLOCKED_SCREEN_TEST_IDS].some((testId) =>
                testIdValues.has(testId),
              );
              return { ...state, isLoaded: true, isUnlocked };
            }
          }
        }
      } catch (error) {
        lastFailure = error instanceof Error ? error.message : String(error);
      }

      if (this.dependencies.now() >= deadline) {
        break;
      }
      await this.dependencies.delay(this.dependencies.readinessIntervalMs);
    }

    const metroRemediation =
      android.metroPort === undefined
        ? ''
        : ' Ensure Metro has bundled MetaMask, dismiss the Expo Dev Launcher if it remains visible, and verify exactly one io.metamask Hermes target is registered.';
    throw new AndroidLaunchError({
      code: 'MM_ANDROID_RUNNER_NOT_READY',
      message: `${ANDROID_APP_ID} did not become ready: ${lastFailure}`,
      remediation: `Open MetaMask on the emulator and resolve any system prompt.${metroRemediation}`,
    });
  }
}

function hasExactResumedMetaMaskActivity(
  output: string,
  expectedActivity: string,
): boolean {
  return output.split('\n').some((line) => {
    const isResumedLine =
      line.includes('mResumedActivity') || line.includes('topResumedActivity');
    if (!isResumedLine) {
      return false;
    }
    return line
      .split(/\s+/u)
      .map((token) => normalizeAndroidComponent(token.replace(/[},]$/u, '')))
      .some((component) => component === expectedActivity);
  });
}

async function hasExactHermesTarget(
  mobileDriver: MobilePlatformDriver,
  metroPort: number,
): Promise<boolean> {
  const result = await mobileDriver.hermesTargets({
    metroPort,
    appId: ANDROID_APP_ID,
  });
  return (
    !result.metroDown &&
    result.ambiguous === undefined &&
    result.noTargetReason === undefined &&
    result.chosen !== undefined &&
    result.candidates.length === 1 &&
    result.candidates[0]?.appId === ANDROID_APP_ID
  );
}

function assertAndroidOptions(
  resolved: ResolvedMobileLaunchOptions,
): ResolvedAndroidAdapterOptions {
  if (resolved.platform !== 'android' || !('android' in resolved)) {
    throw new AndroidLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: 'Invalid resolved Android launch options.',
    });
  }
  return resolved as ResolvedAndroidAdapterOptions;
}

async function closeAndroidApp(
  serial: string,
  backend: DeviceBackend | undefined,
): Promise<void> {
  if (backend) {
    try {
      await backend.closeApp(ANDROID_APP_ID);
      return;
    } catch {
      // Use a targeted ADB fallback below.
    }
  }
  runDeviceAdb(serial, ['shell', 'am', 'force-stop', ANDROID_APP_ID]);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function getAndroidBackendConstructor(): {
  AdbBackend: new (serial: string) => DeviceBackend;
} {
  const packageJsonPath = nodeRequire.resolve('@metamask/device-mcp/package.json');
  const modulePath = packageJsonPath.replace(
    /package\.json$/u,
    'dist/backends/adb-backend.cjs',
  );
  return nodeRequire(modulePath) as {
    AdbBackend: new (serial: string) => DeviceBackend;
  };
}
