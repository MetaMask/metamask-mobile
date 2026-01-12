import type { ServiceProvider } from '../common/interfaces/ServiceProvider';
import type { ProjectConfig } from '../common/types';
import { EmulatorProvider } from './emulator';
import { BrowserStackProvider } from './browserstack';

/**
 * Supported provider types
 */
export type ProviderType = 'emulator' | 'browserstack';

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
    case 'emulator':
      return new EmulatorProvider(project);

    case 'browserstack':
      return new BrowserStackProvider(project);

    default:
      throw new Error(
        `Unknown device provider: "${provider}". Supported providers: emulator, browserstack.`,
      );
  }
}
