import type { TestInfo } from '@playwright/test';
import { createServiceProvider, type ServiceProvider } from '../../services';

export const deviceProviderFixture = {
  deviceProvider: async (
    _fixtures: object,
    use: (deviceProvider: ServiceProvider) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    const deviceProvider = createServiceProvider(testInfo.project);
    await use(deviceProvider);
  },
};
