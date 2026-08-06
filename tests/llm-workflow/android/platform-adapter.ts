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

// MetaMask exposes no universal React-root test ID, so readiness observes any
// canonical startup-screen container instead. These IDs also distinguish the
// MetaMask UI from the Expo dev launcher, which shares the package/activity but
// exposes none of them.
const LOCKED_SCREEN_TEST_IDS = new Set([
  'login',
  'onboarding-screen',
  'onboarding-carousel-screen',
]);
const UNLOCKED_SCREEN_TEST_IDS = new Set([
  'wallet-screen',
  'tab-bar-item-Wallet',
  'account-overview',
]);
// getTestIds() defaults to 50 depth-first ids; a deeper walk avoids missing a
// top-level marker on a large screen.
const READINESS_TEST_ID_LIMIT = 150;
// Kept below the CLI's 120s request timeout (and the daemon's 180s watchdog) so
// a real failure surfaces as MM_LAUNCH_FAILED, not a bare timeout.
const DEFAULT_READINESS_TIMEOUT_MS = 90_000;
const DEFAULT_READINESS_INTERVAL_MS = 250;

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

interface AndroidBackendConstructorDependencies {
  readonly resolvePackageJson?: () => string;
  readonly requireModule?: (modulePath: string) => unknown;
}

type AdbBackendConstructor = new (serial: string) => DeviceBackend;

const nodeRequire = createRequire(__filename);
let cachedAdbBackendConstructor: AdbBackendConstructor | undefined;

export function isAdbBackend(backend: DeviceBackend): boolean {
  return backend instanceof getAndroidBackendConstructor().AdbBackend;
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
        code: 'MM_INVALID_CONFIG',
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
    const errors: Error[] = [];

    try {
      if (this.resolved && this.appLaunchAttempted) {
        await closeAndroidApp(this.resolved.serial, this.backend);
      }
      this.resolved = undefined;
      this.backend = undefined;
      this.appLaunchAttempted = false;
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    try {
      if (this.metroAttachment) {
        cleanupAndroidMetro(this.metroAttachment);
      }
      this.metroAttachment = undefined;
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    try {
      if (this.animationState) {
        restoreAndroidAnimations(
          this.animationState,
          this.dependencies.runDeviceAdb,
        );
      }
      this.animationState = undefined;
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }

    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(
        errors,
        'Android cleanup failed for multiple resources',
      );
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
            const testIds = await mobileDriver.getTestIds(
              READINESS_TEST_ID_LIMIT,
            );
            const testIdValues = new Set(testIds.map(({ testId }) => testId));
            const hasLockedMarker = [...LOCKED_SCREEN_TEST_IDS].some((testId) =>
              testIdValues.has(testId),
            );
            const hasUnlockedMarker = [...UNLOCKED_SCREEN_TEST_IDS].some(
              (testId) => testIdValues.has(testId),
            );
            if (!hasLockedMarker && !hasUnlockedMarker) {
              lastFailure = 'No recognized MetaMask startup screen is mounted.';
            } else if (
              android.metroPort !== undefined &&
              !(await hasExactHermesTarget(mobileDriver, android.metroPort))
            ) {
              lastFailure = `Metro does not expose an unambiguous ${ANDROID_APP_ID} Hermes target.`;
            } else {
              return {
                ...state,
                isLoaded: true,
                isUnlocked: hasUnlockedMarker && !hasLockedMarker,
              };
            }
          }
        }
      } catch (error) {
        lastFailure = error instanceof Error ? error.message : String(error);
      }

      const remainingMs =
        this.dependencies.now() >= deadline
          ? 0
          : deadline - this.dependencies.now();
      if (remainingMs <= 0) {
        break;
      }
      await this.dependencies.delay(
        Math.min(this.dependencies.readinessIntervalMs, remainingMs),
      );
    }

    const metroRemediation =
      android.metroPort === undefined
        ? ''
        : ' Ensure Metro has bundled MetaMask, dismiss the Expo Dev Launcher if it remains visible, and verify Metro can select an unambiguous io.metamask Hermes target from one logical device.';
    throw new AndroidLaunchError({
      code: 'MM_LAUNCH_FAILED',
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

  const chosen = result.chosen;

  if (
    result.metroDown ||
    result.filterBypassed ||
    result.expectedAppId !== ANDROID_APP_ID ||
    result.ambiguous !== undefined ||
    result.noTargetReason !== undefined ||
    chosen === undefined
  ) {
    return false;
  }

  const chosenLogicalDeviceId = chosen.logicalDeviceId;
  if (!chosenLogicalDeviceId) {
    return false;
  }

  const matchingCandidates = result.candidates.filter((candidate) => {
    if (chosen.id !== undefined) {
      return (
        candidate.id === chosen.id &&
        candidate.logicalDeviceId === chosenLogicalDeviceId
      );
    }

    return candidate.logicalDeviceId === chosenLogicalDeviceId;
  });

  return (
    matchingCandidates.length > 0 &&
    matchingCandidates.every(
      (candidate) => candidate.appId === ANDROID_APP_ID,
    )
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
  AdbBackend: AdbBackendConstructor;
};
export function getAndroidBackendConstructor(
  dependencies: AndroidBackendConstructorDependencies,
): { AdbBackend: AdbBackendConstructor };
export function getAndroidBackendConstructor(
  dependencies?: AndroidBackendConstructorDependencies,
): { AdbBackend: AdbBackendConstructor } {
  if (dependencies) {
    return loadAndroidBackendConstructor(dependencies);
  }

  cachedAdbBackendConstructor ??= loadAndroidBackendConstructor({}).AdbBackend;
  return { AdbBackend: cachedAdbBackendConstructor };
}

function loadAndroidBackendConstructor(
  dependencies: AndroidBackendConstructorDependencies,
): { AdbBackend: AdbBackendConstructor } {
  try {
    const packageJsonPath =
      dependencies.resolvePackageJson?.() ??
      nodeRequire.resolve('@metamask/device-mcp/package.json');
    // device-mcp has no public AdbBackend export. This path couples us to its
    // current CJS build layout solely to verify the backend created for Android.
    const modulePath = packageJsonPath.replace(
      /package\.json$/u,
      'dist/backends/adb-backend.cjs',
    );
    const moduleExports: unknown =
      dependencies.requireModule?.(modulePath) ?? nodeRequire(modulePath);
    const adbBackend = getAdbBackendExport(moduleExports);

    if (typeof adbBackend !== 'function') {
      throw new Error('The module does not export an AdbBackend constructor.');
    }

    return { AdbBackend: adbBackend as AdbBackendConstructor };
  } catch (error) {
    if (error instanceof AndroidLaunchError) {
      throw error;
    }

    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new AndroidLaunchError({
      code: 'MM_INVALID_CONFIG',
      message:
        'Android ADB backend is unavailable because this workflow assumes @metamask/device-mcp provides its internal dist/backends/adb-backend.cjs module.' +
        detail,
      remediation:
        'Install a compatible @metamask/device-mcp version or update this workflow for its public backend API.',
    });
  }
}

function getAdbBackendExport(moduleExports: unknown): unknown {
  if (
    typeof moduleExports !== 'object' ||
    moduleExports === null ||
    !('AdbBackend' in moduleExports)
  ) {
    return undefined;
  }

  return moduleExports.AdbBackend;
}
