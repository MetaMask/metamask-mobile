import { createLogger } from '../../logger';
import { PlatformDetector } from '../../PlatformLocator';
import type { PlatformDeviceCommandHandler } from '../device-commands';
import {
  E2E_PROXY_CA_CERT_DER_PATH,
  ensureE2EProxyCa,
} from '../../utils/E2EProxyCa';

const logger = createLogger({
  name: 'ProxySetup',
});

/**
 * Launch argument read by ios/MetaMask/E2E/E2ENativeAppProxy.swift and the
 * SocketRocket Podfile patch to route native iOS traffic through the proxy.
 */
export const IOS_E2E_APP_PROXY_LAUNCH_ARG = 'e2eIosProxyPort';

/**
 * Android emulators reach the host machine through 10.0.2.2, so the device
 * proxy points there instead of localhost.
 */
export const ANDROID_E2E_PROXY_HOST = '10.0.2.2';

export interface ProxySetupState {
  androidDeviceProxyConfigured: boolean;
}

export const createDefaultProxySetupState = (): ProxySetupState => ({
  androidDeviceProxyConfigured: false,
});

let proxyCaPreparation: Promise<void> | undefined;

/**
 * Generates (or reuses) the local proxy CA material. Idempotent and safe to
 * call from multiple lifecycle hooks in the same process — concurrent and
 * repeat callers share a single in-flight generation.
 */
async function prepareProxyCa(): Promise<void> {
  if (!proxyCaPreparation) {
    proxyCaPreparation = (async () => {
      const paths = await ensureE2EProxyCa();
      logger.debug(
        `[E2E_NATIVE_PROXY_CA_READY] Using CA certificate at ${paths.certPemPath}`,
      );
    })();
    proxyCaPreparation.catch(() => {
      // Allow a later caller to retry rather than caching the rejection.
      proxyCaPreparation = undefined;
    });
  }

  return proxyCaPreparation;
}

/**
 * Best-effort CA warm-up for framework-level lifecycle hooks (Detox's custom
 * Jest environment and Playwright's global setup). Failures are logged but
 * not thrown so suites that never touch the device proxy (e.g. BrowserStack
 * runs, hosts without openssl) are unaffected; the per-test path in
 * ensureNativeProxyCa still fails loudly when the proxy is actually needed.
 */
export async function warmupProxyCa(): Promise<void> {
  try {
    await prepareProxyCa();
  } catch (error) {
    logger.warn(
      `[E2E_NATIVE_PROXY_CA_WARMUP_FAILED] Proxy CA warm-up failed; device-proxy tests will retry and surface this error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Ensures the native proxy CA exists before Mockttp reads its HTTPS options.
 *
 * @param willRelaunchApp - Whether the current fixture relaunches the app.
 */
export async function ensureNativeProxyCa(
  willRelaunchApp: boolean,
): Promise<void> {
  const shouldPrepareIosCa = PlatformDetector.isIOS() && willRelaunchApp;
  const shouldPrepareAndroidCa = PlatformDetector.isAndroid();

  if (!shouldPrepareIosCa && !shouldPrepareAndroidCa) {
    return;
  }

  await prepareProxyCa();
}

function assertValidProxyPort(
  mockServerPort: number,
  platformName: string,
): void {
  if (
    !Number.isInteger(mockServerPort) ||
    mockServerPort < 1 ||
    mockServerPort > 65535
  ) {
    throw new Error(
      `Invalid mock server port for ${platformName} proxy: ${mockServerPort}`,
    );
  }
}

/**
 * Configures the iOS native app proxy.
 * @param mockServerPort - The mock server port.
 * @param willRelaunchApp - Whether to relaunch the app.
 * @param deviceCommands - The device commands to use.
 */
async function setupIosNativeAppProxy(
  mockServerPort: number,
  willRelaunchApp: boolean,
  deviceCommands?: PlatformDeviceCommandHandler,
): Promise<void> {
  if (!willRelaunchApp) {
    logger.warn(
      `[E2E_IOS_NATIVE_APP_PROXY_NO_RELAUNCH] restartDevice=false means the running app process will not receive ${IOS_E2E_APP_PROXY_LAUNCH_ARG}=${mockServerPort}.`,
    );
    return;
  }

  if (!deviceCommands) {
    throw new Error(
      'iOS native app proxy requires local device commands to install the proxy CA certificate.',
    );
  }

  await deviceCommands.installRootCertificate({
    certPath: E2E_PROXY_CA_CERT_DER_PATH,
  });

  logger.warn(
    `[E2E_IOS_NATIVE_APP_PROXY_CONFIGURED] Installed CA certificate. The app must be launched with ${IOS_E2E_APP_PROXY_LAUNCH_ARG}=${mockServerPort} for the proxy to engage — the Appium launch path passes it; the Detox launch path does not in Phase 0, so the proxy stays dormant on Detox iOS. Search simulator logs for E2E_IOS_NATIVE_APP_PROXY_ENABLED and E2E_IOS_NATIVE_APP_PROXY_WEBSOCKET_ENABLED, and MockServer logs for E2E_NATIVE_PROXY_WS_REQUEST or E2E_NATIVE_PROXY_DIRECT_REQUEST after app launch.`,
  );
}

/**
 * Configures Android's device-level HTTP proxy through adb.
 *
 * @param mockServerPort - The mock server port.
 * @param deviceCommands - The device commands to use.
 * @returns Whether the proxy was configured and should be cleared during cleanup.
 */
async function setupAndroidDeviceProxy(
  mockServerPort: number,
  deviceCommands?: PlatformDeviceCommandHandler,
): Promise<boolean> {
  if (!deviceCommands) {
    logger.warn(
      '[E2E_ANDROID_DEVICE_PROXY_SKIPPED] Android device proxy requires local adb device commands; skipping.',
    );
    return false;
  }

  // No runtime CA install on Android (Decision DA/A1): the E2E APK bundles
  // the proxy CA via res/raw/e2e_proxy_ca + react_native_config_e2e.xml, so
  // the adb-root-dependent push is gone entirely.
  await deviceCommands.configureHttpProxy({
    host: ANDROID_E2E_PROXY_HOST,
    port: mockServerPort,
  });

  logger.warn(
    `[E2E_ANDROID_DEVICE_PROXY_CONFIGURED] Set Android global HTTP proxy to ${ANDROID_E2E_PROXY_HOST}:${mockServerPort} with local harness exclusions (proxy CA is bundled in the E2E APK). Search MockServer logs for E2E_NATIVE_PROXY_DIRECT_REQUEST, E2E_NATIVE_PROXY_WS_REQUEST, E2E_DEVICE_PROXY_UNMOCKED_REQUEST, or E2E_NATIVE_PROXY_REQUEST_INITIATED.`,
  );

  return true;
}

/**
 * Sets up proxying for the current platform.
 *
 * Shared validation happens once here. Platform-only steps are called only from
 * the matching platform branch so unsupported platform methods are not invoked
 * as part of the normal fixture lifecycle.
 *
 * @param mockServerPort - The mock server port.
 * @param willRelaunchApp - Whether to relaunch the app.
 * @param deviceCommands - The device commands to use.
 * @returns Proxy setup state needed by cleanup.
 */
export async function setupProxy(
  mockServerPort: number,
  willRelaunchApp: boolean,
  deviceCommands?: PlatformDeviceCommandHandler,
): Promise<ProxySetupState> {
  const platform = PlatformDetector.getPlatform();
  assertValidProxyPort(mockServerPort, platform);

  if (platform === 'ios') {
    await setupIosNativeAppProxy(
      mockServerPort,
      willRelaunchApp,
      deviceCommands,
    );
    return createDefaultProxySetupState();
  }

  const androidDeviceProxyConfigured = await setupAndroidDeviceProxy(
    mockServerPort,
    deviceCommands,
  );

  return {
    androidDeviceProxyConfigured,
  };
}

/**
 * Clears Android's device-level HTTP proxy if this fixture configured it.
 *
 * @param wasConfigured - Whether the proxy was configured.
 * @param deviceCommands - The device commands to use.
 */
async function clearAndroidDeviceProxy(
  wasConfigured: boolean,
  deviceCommands?: PlatformDeviceCommandHandler,
): Promise<void> {
  if (!wasConfigured) {
    return;
  }

  if (!deviceCommands) {
    logger.warn(
      '[E2E_ANDROID_DEVICE_PROXY_CLEAR_SKIPPED] Android device proxy was marked configured, but local adb device commands are unavailable.',
    );
    return;
  }

  await deviceCommands.clearHttpProxy();
  logger.warn(
    '[E2E_ANDROID_DEVICE_PROXY_RESTORED] Cleared Android global HTTP proxy.',
  );
}

/**
 * Cleans up proxy state configured by setupProxy.
 *
 * @param proxySetupState - The proxy setup state returned by setupProxy.
 * @param deviceCommands - The device commands to use.
 */
export async function cleanupProxy(
  proxySetupState: ProxySetupState,
  deviceCommands?: PlatformDeviceCommandHandler,
): Promise<void> {
  await clearAndroidDeviceProxy(
    proxySetupState.androidDeviceProxyConfigured,
    deviceCommands,
  );
}
