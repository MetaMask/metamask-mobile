import type { SpeculosBleConfig, ButtonPress } from './speculos-ble-test-helper/src/types';
import { SpeculosTestHelper } from './speculos-ble-test-helper/src/speculos-test-helper';

const DEFAULT_CONFIG: Partial<SpeculosBleConfig> = {
  speculosHost: '127.0.0.1',
  speculosApduPort: 9999,
  speculosApiPort: 5000,
  controlApiPort: 5002,
  deviceName: 'Ledger Nano X',
};

export async function withSpeculosFixtures(
  testFn: (helper: SpeculosTestHelper) => Promise<void>,
  config: Partial<SpeculosBleConfig> = {},
): Promise<void> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const helper = new SpeculosTestHelper(mergedConfig);

  try {
    await helper.start();
    await testFn(helper);
  } finally {
    try {
      await helper.disconnectBle();
    } catch {
      // Ignore disconnect errors during cleanup
    }
  }
}

export { SpeculosTestHelper };
export type { SpeculosBleConfig, ButtonPress };
