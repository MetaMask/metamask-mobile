/**
 * Integration test — an existing user's symbol-keyed trade config survives
 * the installed PerpsController startup migration and stays readable through
 * the selector usePerpsOrderForm uses.
 */

import { buildPerpsPersistedStateHarness } from '../../../../../tests/integration/harnesses/perps/perps';
import {
  selectTradeConfiguration,
  type PerpsControllerState,
} from '@metamask/perps-controller';

describe('legacy Perps trade configuration — integration', () => {
  it('keeps a saved leverage after the provider-keyed upgrade', async () => {
    // Arrange — the shape written before trade config was keyed by venue.
    const legacyState = {
      activeProvider: 'hyperliquid',
      isTestnet: false,
      hasMigratedToMultiProvider: false,
      tradeConfigurations: {
        mainnet: {
          BTC: { leverage: 5 },
        },
        testnet: {},
      },
    } as Partial<PerpsControllerState>;
    const { controller } = buildPerpsPersistedStateHarness(legacyState);

    try {
      // Act
      const savedLeverage = selectTradeConfiguration(controller.state, 'BTC');

      // Assert
      expect(
        controller.state.tradeConfigurations.mainnet.hyperliquid?.BTC?.leverage,
      ).toBe(5);
      expect(savedLeverage).toEqual({ leverage: 5 });
      // Aggregated mode is a separate, flag-gated migration.
      expect(controller.state.hasMigratedToMultiProvider).toBe(false);
    } finally {
      await controller.disconnect();
    }
  });
});
