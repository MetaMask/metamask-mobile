/**
 * Device proxy + CA lifecycle for E2E network mocking (Appium/Playwright).
 *
 * - CA warm-up: tests/framework/config/global.setup.ts
 * - Per-test setup/cleanup: withFixtures in tests/framework/fixtures/FixtureHelper.ts
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
