import { WebDriverConfig } from '../../e2e/framework/types';
import { ServiceProviderInterface } from './IServiceProvider';
import { BrowerStackProvider } from './BrowserStackService';
import EmulatorProvider from './EmulatorService';
import { FullProject } from '@playwright/test';

export function createDeviceServiceProvider(
  project: FullProject<WebDriverConfig>,
): ServiceProviderInterface {
  const provider = project.use.device?.provider;
  if (!provider) {
    throw new Error('Device provider is not specified in the configuration.');
  }
  switch (provider) {
    case 'emulator':
      return new EmulatorProvider(project);
    case 'browserstack':
      return new BrowerStackProvider(project);
    default:
      throw new Error(`Unknown device provider: ${provider}`);
  }
}
