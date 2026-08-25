import type { ServiceProvider } from '../common/interfaces/ServiceProvider.ts';
import type { ProjectConfig } from '../common/types.ts';
import { EmulatorProvider } from './emulator';
import { BrowserStackProvider } from './browserstack';
import { ProviderName } from '../../types.ts';

/* eslint-disable @typescript-eslint/no-require-imports -- Sauce Labs stays lazy-loaded */

/**
 * Supported provider types
 */
export type ProviderType = 'emulator' | 'browserstack' | 'saucelabs';

/**
 * Factory function to create the appropriate service provider
 * based on the project configuration
 */
export function createServiceProvider(project: ProjectConfig): ServiceProvider {
  const provider = project.use.device?.provider;

  if (!provider) {
    throw new Error(
      'Device provider is not specified in the configuration. Please specify "emulator", "browserstack", or "saucelabs".',
    );
  }

  switch (provider) {
    case ProviderName.EMULATOR:
    case ProviderName.SIMULATOR:
      return new EmulatorProvider(project);

    case ProviderName.BROWSERSTACK:
      return new BrowserStackProvider(project);

    case ProviderName.SAUCELABS: {
      const sauceLabsModule =
        require('./saucelabs') as typeof import('./saucelabs');
      return new sauceLabsModule.SauceLabsProvider(project);
    }

    default:
      throw new Error(
        `Unknown device provider: "${provider}". Supported providers: emulator, browserstack, saucelabs.`,
      );
  }
}
