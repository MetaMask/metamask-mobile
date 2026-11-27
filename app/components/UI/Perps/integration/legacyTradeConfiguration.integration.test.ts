/**
 * Restore pre-upgrade trade settings through the installed PerpsController
 * and read them through the same selector as usePerpsOrderForm.
 */
// Register the harness's I/O mocks before importing the controller package.
import { buildPerpsPersistedStateHarness } from '../../../../../tests/integration/harnesses/perps/perps';
import {
  selectTradeConfiguration,
  type PerpsControllerState,
  type TradeConfiguration,
} from '@metamask/perps-controller';

const legacySettings = {
  mainnet: { BTC: { leverage: 7, marginMode: 'isolated' } },
  testnet: { ETH: { leverage: 3, marginMode: 'cross' } },
} as const;

function legacyState(
  tradeConfigurations: Record<
    'mainnet' | 'testnet',
    Record<string, TradeConfiguration>
  >,
  isTestnet = false,
): Partial<PerpsControllerState> {
  return {
    activeProvider: 'hyperliquid',
    hasMigratedToMultiProvider: false,
    isTestnet,
    // The pre-upgrade snapshot keys these settings by symbol, not by venue.
    tradeConfigurations:
      tradeConfigurations as unknown as PerpsControllerState['tradeConfigurations'],
  };
}

const migratedSettings = {
  mainnet: { hyperliquid: legacySettings.mainnet },
  testnet: { hyperliquid: legacySettings.testnet },
};

describe('legacy Perps trade configuration — integration', () => {
  it('restores a leverage-only snapshot before remote flags have loaded', async () => {
    const { controller } = buildPerpsPersistedStateHarness(
      legacyState({
        mainnet: { BTC: { leverage: 5 } },
        testnet: {},
      }),
    );

    try {
      expect(selectTradeConfiguration(controller.state, 'BTC')).toEqual({
        leverage: 5,
      });
      expect(controller.state.hasMigratedToMultiProvider).toBe(false);
    } finally {
      await controller.disconnect();
    }
  });

  it.each([
    { isTestnet: false, symbol: 'BTC', leverage: 7, marginMode: 'isolated' },
    { isTestnet: true, symbol: 'ETH', leverage: 3, marginMode: 'cross' },
  ])(
    'restores saved $symbol settings with multi-provider mode off',
    async ({ isTestnet, symbol, leverage, marginMode }) => {
      const { controller } = buildPerpsPersistedStateHarness(
        legacyState(legacySettings, isTestnet),
        { multiProviderModeEnabled: false },
      );

      try {
        const saved = selectTradeConfiguration(controller.state, symbol);

        expect(saved).toEqual({ leverage });
        expect(controller.getTradeConfiguration(symbol)).toEqual(saved);
        expect(controller.getMarginMode(symbol)).toBe(marginMode);
        expect(controller.state.tradeConfigurations).toEqual(migratedSettings);
        expect(controller.state.activeProvider).toBe('hyperliquid');
        expect(controller.state.hasMigratedToMultiProvider).toBe(false);
      } finally {
        await controller.disconnect();
      }
    },
  );

  it('keeps legacy settings on the default exchange when switching to aggregated mode', async () => {
    const { controller } = buildPerpsPersistedStateHarness(
      legacyState(legacySettings),
      {
        multiProviderModeEnabled: true,
      },
    );

    try {
      const saved = selectTradeConfiguration(controller.state, 'BTC');

      expect(controller.state.activeProvider).toBe('aggregated');
      expect(controller.state.defaultProvider).toBe('hyperliquid');
      expect(controller.state.tradeConfigurations).toEqual(migratedSettings);
      expect(saved).toEqual({ leverage: 7 });
      expect(controller.getTradeConfiguration('BTC')).toEqual(saved);
    } finally {
      await controller.disconnect();
    }
  });

  it('leaves already venue-keyed settings unchanged on the next startup', async () => {
    const { controller } = buildPerpsPersistedStateHarness({
      tradeConfigurations: migratedSettings,
    });

    try {
      expect(controller.state.tradeConfigurations).toEqual(migratedSettings);
      expect(selectTradeConfiguration(controller.state, 'BTC')).toEqual({
        leverage: 7,
      });
    } finally {
      await controller.disconnect();
    }
  });
});
