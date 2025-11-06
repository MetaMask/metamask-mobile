import { WebDriverConfig } from '../../e2e/framework/types';
import { DeviceProvider } from './common/interfaces/DeviceProvider';
import EmulatorProvider from './emulator/EmulatorService';
import { FullProject } from '@playwright/test';

export function createDeviceProvider(
  project: FullProject<WebDriverConfig>,
): DeviceProvider {
  const provider = project.use.device?.provider;
  if (!provider) {
    throw new Error('Device provider is not specified in the configuration.');
  }
  switch (provider) {
    case 'emulator':
      return new EmulatorProvider(project);
    default:
      throw new Error(`Unknown device provider: ${provider}`);
  }
}
