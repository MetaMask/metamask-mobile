// Common interfaces and types
export type { ServiceProvider } from './common/interfaces/ServiceProvider.ts';
export type { ProjectConfig, CommonCapabilities } from './common/types.ts';

// Base provider
export { BaseServiceProvider } from './common/base/BaseServiceProvider.ts';

// Providers — factory only here so TestMu/BrowserStack setup does not load
// EmulatorProvider (local Appium/ADB helpers) at import time.
export {
  createServiceProvider,
  type ProviderType,
} from './providers/factory.ts';
export { EmulatorProvider } from './providers/emulator';
export { BrowserStackProvider } from './providers/browserstack';
export { TestMuAIProvider } from './providers/testmu';

// Appium utilities
export { startAppiumServer, stopAppiumServer } from './appium';

// Local device command handlers
export {
  DeviceCommandHandler,
  AndroidDeviceCommandHandler,
  IOSDeviceCommandHandler,
  type ClearAppDataOptions,
  type DeviceCommandHandlerOptions,
  type DeviceCommandLogger,
  type InstallAppOptions,
  type IsAppInstalledOptions,
  type PlatformDeviceCommandHandler,
  type ReinstallAppOptions,
  type UninstallAppOptions,
} from './device-commands';

// BrowserStack specific exports
export {
  BrowserStackAPI,
  type BrowserStackSessionDetails,
} from './providers/browserstack';

// Legacy alias for backward compatibility (deprecated)
/** @deprecated Use createServiceProvider instead */
export { createServiceProvider as createDeviceServiceProvider } from './providers/factory.ts';
