import type { ServiceProvider } from '../common/interfaces/ServiceProvider.ts';
import type { ProjectConfig } from '../common/types.ts';
import { EmulatorProvider } from './emulator';
import { TestMuAIProvider } from './testmu';
import { ProviderName } from '../../types.ts';

/**
 * Supported provider types
 */
export type ProviderType = 'emulator' | 'testmu';

/**
 * Factory function to create the appropriate service provider
 * based on the project configuration
 */
export function createServiceProvider(project: ProjectConfig): ServiceProvider {
  const provider = project.use.device?.provider;

  if (!provider) {
    throw new Error(
      'Device provider is not specified in the configuration. Please specify "emulator" or "testmu".',
    );
  }

  switch (provider) {
    case ProviderName.EMULATOR:
    case ProviderName.SIMULATOR:
      return new EmulatorProvider(project);

    case ProviderName.TESTMU:
      return new TestMuAIProvider(project);

    case ProviderName.BROWSERSTACK:
      throw new Error(
        'BrowserStack is no longer available. Cloud performance tests use the TestMu provider.',
      );

    default:
      throw new Error(
        `Unknown device provider: "${provider}". Supported providers: emulator, testmu.`,
      );
  }
}
