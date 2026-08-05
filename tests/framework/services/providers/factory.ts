import type { ServiceProvider } from '../common/interfaces/ServiceProvider.ts';
import type { ProjectConfig } from '../common/types.ts';
import { ProviderName } from '../../types.ts';

/* eslint-disable @typescript-eslint/no-require-imports -- providers must remain lazy-loaded */

/**
 * Supported provider types
 */
export type ProviderType = 'emulator' | 'browserstack' | 'testmu';

/**
 * Factory function to create the appropriate service provider
 * based on the project configuration.
 *
 * Providers are required lazily so cloud runs (BrowserStack / TestMu) do not
 * load the local emulator/Appium helper graph at module evaluation time.
 */
export function createServiceProvider(project: ProjectConfig): ServiceProvider {
  const provider = project.use.device?.provider;

  if (!provider) {
    throw new Error(
      'Device provider is not specified in the configuration. Please specify "emulator" or "browserstack".',
    );
  }

  switch (provider) {
    case ProviderName.EMULATOR:
    case ProviderName.SIMULATOR: {
      const { EmulatorProvider } =
        require('./emulator') as typeof import('./emulator');
      return new EmulatorProvider(project);
    }

    case ProviderName.BROWSERSTACK: {
      const browserStackModule =
        require('./browserstack') as typeof import('./browserstack');
      const { BrowserStackProvider } = browserStackModule;
      return new BrowserStackProvider(project);
    }

    case ProviderName.TESTMU: {
      const testMuModule = require('./testmu') as typeof import('./testmu');
      const { TestMuAIProvider } = testMuModule;
      return new TestMuAIProvider(project);
    }

    default:
      throw new Error(
        `Unknown device provider: "${provider}". Supported providers: emulator, browserstack, testmu.`,
      );
  }
}
