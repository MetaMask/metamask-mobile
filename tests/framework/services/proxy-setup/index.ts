/**
 * Framework-neutral device proxy + CA lifecycle for E2E network mocking.
 *
 * Invoked from both test runners:
 * - Detox: tests/init.detox.js (CA warm-up) and the withFixtures
 * per-test setup/cleanup in tests/framework/fixtures/FixtureHelper.ts
 * - Playwright/Appium: tests/framework/config/global.setup.ts (CA warm-up)
 * and the same withFixtures path (per-test setup/cleanup)
 *
 * See tests/framework/DEVICE_PROXY_MOCKING.md for the full architecture.
 */
export {
  IOS_E2E_APP_PROXY_LAUNCH_ARG,
  ANDROID_E2E_PROXY_HOST,
  createDefaultProxySetupState,
  warmupProxyCa,
  ensureNativeProxyCa,
  setupProxy,
  cleanupProxy,
} from './ProxySetup';
export type { ProxySetupState } from './ProxySetup';
