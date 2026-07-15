import type { ServiceProvider } from '../common/interfaces/ServiceProvider.ts';
import type { ProjectConfig } from '../common/types.ts';
import { EmulatorProvider } from './emulator';
import { BrowserStackProvider } from './browserstack';
import { TestMuAIProvider } from './testmu';
import { ProviderName } from '../../types.ts';

/**
 * Supported provider types
 */
export type ProviderType = 'emulator' | 'browserstack' | 'testmu';

/**
 * Factory function to create the appropriate service provider
 * based on the project configuration
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
    case ProviderName.SIMULATOR:
      return new EmulatorProvider(project);

    case ProviderName.BROWSERSTACK:
      return new BrowserStackProvider(project);

    case ProviderName.TESTMU:
      return new TestMuAIProvider(project);

    default:
      throw new Error(
        `Unknown device provider: "${provider}". Supported providers: emulator, browserstack, testmu.`,
      );
  }
}
