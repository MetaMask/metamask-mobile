/**
 * Integration tests — perps margin-mode lock and placement validation.
 *
 * Real `HyperLiquidProvider` (the patched `@metamask/perps-controller`
 * build) runs; only the venue I/O boundary is mocked via the harness. Covers
 * the lock read (position, resting order, active TWAP, unlocked, failures)
 * and the matching placement validation for explicit `marginMode` orders.
 *
 * Reference: tests/integration/AGENTS.md · MetaMask/skills integration-test
 */

// The harness owns the perps I/O `jest.mock` declarations, so it must load
// before anything else pulls in `@metamask/perps-controller`.
import { buildPerpsIntegrationHarness } from '../../../../../tests/integration/harnesses/perps/perps';

import {
  PERPS_ERROR_CODES,
  type AggregatedProviderConfig,
  type PerpsProvider,
  type PerpsProviderType,
} from '@metamask/perps-controller';

const OTHER_USER_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

const btcPosition = (type: 'isolated' | 'cross') => ({
  position: {
    coin: 'BTC',
    szi: '0.1',
    entryPx: '50000',
    positionValue: '5000',
    unrealizedPnl: '0',
    marginUsed: '1000',
    leverage: { type, value: 5 },
    liquidationPx: '42000',
    maxLeverage: 50,
    returnOnEquity: '0',
    cumFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  },
  type: 'oneWay',
});

// Not exported from the package root; loaded from the patched dist so the
// routing added by the patch runs for real.
const { AggregatedPerpsProvider } = jest.requireActual<{
  AggregatedPerpsProvider: new (
    config: AggregatedProviderConfig,
  ) => PerpsProvider;
}>('@metamask/perps-controller/providers/AggregatedPerpsProvider');

const buildAggregatedProvider = (
  harness: ReturnType<typeof buildPerpsIntegrationHarness>,
) =>
  new AggregatedPerpsProvider({
    providers: new Map<PerpsProviderType, PerpsProvider>([
      ['hyperliquid', harness.provider],
    ]),
    defaultProvider: 'hyperliquid',
    infrastructure: harness.mocks.infrastructure,
  });

const withPositions = (
  harness: ReturnType<typeof buildPerpsIntegrationHarness>,
  assetPositions: unknown[],
) => {
  harness.mocks.infoClient.clearinghouseState.mockResolvedValue({
    marginSummary: { totalMarginUsed: '1000', accountValue: '10000' },
    withdrawable: '9000',
    assetPositions,
    crossMarginSummary: { accountValue: '10000', totalMarginUsed: '1000' },
  });
};

describe('Perps margin-mode lock — integration', () => {
  describe('reading the lock', () => {
    it('reports the mode of an open position', async () => {
      const harness = buildPerpsIntegrationHarness();
      withPositions(harness, [btcPosition('cross')]);

      const lock = await harness.provider.getMarginModeLock({ symbol: 'BTC' });

      expect(lock).toStrictEqual({
        status: 'locked',
        providerId: 'hyperliquid',
        marginMode: 'cross',
        reason: 'position',
      });
      expect(harness.mocks.infoClient.activeAssetData).not.toHaveBeenCalled();
    });

    it('reports the asset mode bound by a resting order', async () => {
      const harness = buildPerpsIntegrationHarness();
      harness.mocks.infoClient.frontendOpenOrders.mockResolvedValue([
        { coin: 'BTC' },
      ]);
      harness.mocks.infoClient.activeAssetData.mockResolvedValue({
        leverage: { type: 'cross', value: 5 },
      });

      const lock = await harness.provider.getMarginModeLock({ symbol: 'BTC' });

      expect(lock).toStrictEqual({
        status: 'locked',
        providerId: 'hyperliquid',
        marginMode: 'cross',
        reason: 'open_order',
      });
    });

    it('reports the asset mode bound by an active TWAP without resting orders', async () => {
      const harness = buildPerpsIntegrationHarness();
      harness.mocks.infoClient.twapHistory.mockResolvedValue([
        {
          time: 1_700_000_000,
          twapId: 42,
          state: { coin: 'BTC' },
          status: { status: 'activated' },
        },
      ]);

      const lock = await harness.provider.getMarginModeLock({ symbol: 'BTC' });

      expect(lock).toStrictEqual({
        status: 'locked',
        providerId: 'hyperliquid',
        marginMode: 'isolated',
        reason: 'open_order',
      });
    });

    it('reports unlocked when nothing binds the market', async () => {
      const harness = buildPerpsIntegrationHarness();

      const lock = await harness.provider.getMarginModeLock({ symbol: 'BTC' });

      expect(lock).toStrictEqual({
        status: 'unlocked',
        providerId: 'hyperliquid',
      });
    });

    it('reports unavailable when positions cannot be read', async () => {
      const harness = buildPerpsIntegrationHarness();
      harness.mocks.infoClient.clearinghouseState.mockRejectedValue(
        new Error('offline'),
      );

      const lock = await harness.provider.getMarginModeLock({ symbol: 'BTC' });

      expect(lock).toStrictEqual({
        status: 'unavailable',
        providerId: 'hyperliquid',
        reason: 'provider_unavailable',
      });
    });

    it('reports unavailable when the selected account changes mid-read', async () => {
      const harness = buildPerpsIntegrationHarness();
      harness.mocks.infoClient.frontendOpenOrders.mockResolvedValue([
        { coin: 'BTC' },
      ]);
      harness.mocks.wallet.getUserAddressWithDefault
        .mockResolvedValueOnce('0x1234567890123456789012345678901234567890')
        .mockResolvedValueOnce('0x1234567890123456789012345678901234567890')
        .mockResolvedValue(OTHER_USER_ADDRESS);

      const lock = await harness.provider.getMarginModeLock({ symbol: 'BTC' });

      expect(lock).toStrictEqual({
        status: 'unavailable',
        providerId: 'hyperliquid',
        reason: 'provider_unavailable',
      });
      expect(harness.mocks.infoClient.activeAssetData).not.toHaveBeenCalled();
    });
  });

  describe('routing through the aggregated provider', () => {
    it('reads the lock from the default provider', async () => {
      const harness = buildPerpsIntegrationHarness();
      withPositions(harness, [btcPosition('cross')]);

      const lock = await buildAggregatedProvider(harness).getMarginModeLock?.({
        symbol: 'BTC',
      });

      expect(lock).toStrictEqual({
        status: 'locked',
        providerId: 'hyperliquid',
        marginMode: 'cross',
        reason: 'position',
      });
    });

    it('reports unavailable for a provider that is not registered', async () => {
      const harness = buildPerpsIntegrationHarness();

      const lock = await buildAggregatedProvider(harness).getMarginModeLock?.({
        symbol: 'BTC',
        providerId: 'lighter',
      });

      expect(lock).toStrictEqual({
        status: 'unavailable',
        providerId: 'lighter',
        reason: 'provider_not_found',
      });
    });

    it('reports unavailable when the provider read throws', async () => {
      const harness = buildPerpsIntegrationHarness();
      jest
        .spyOn(harness.provider, 'getMarginModeLock')
        .mockRejectedValue(new Error('offline'));

      const lock = await buildAggregatedProvider(harness).getMarginModeLock?.({
        symbol: 'BTC',
      });

      expect(lock).toStrictEqual({
        status: 'unavailable',
        providerId: 'hyperliquid',
        reason: 'provider_unavailable',
      });
    });
  });

  describe('placing an order with an explicit margin mode', () => {
    it('rejects a mode that conflicts with the open position', async () => {
      const harness = buildPerpsIntegrationHarness();
      harness.setupTradingReady();
      withPositions(harness, [btcPosition('cross')]);

      const result = await harness.provider.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50_000,
        leverage: 5,
        marginMode: 'isolated',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        PERPS_ERROR_CODES.ORDER_MARGIN_MODE_POSITION_OPEN,
      );
      expect(harness.mocks.exchangeClient.order).not.toHaveBeenCalled();
    });

    it('rejects a mode that conflicts with a resting order', async () => {
      const harness = buildPerpsIntegrationHarness();
      harness.setupTradingReady();
      harness.mocks.infoClient.frontendOpenOrders.mockResolvedValue([
        { coin: 'BTC' },
      ]);

      const result = await harness.provider.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50_000,
        leverage: 5,
        marginMode: 'cross',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        PERPS_ERROR_CODES.ORDER_MARGIN_MODE_ORDER_OPEN,
      );
      expect(harness.mocks.exchangeClient.order).not.toHaveBeenCalled();
    });

    it('sets cross leverage and places the order when the market is unlocked', async () => {
      const harness = buildPerpsIntegrationHarness();
      harness.setupTradingReady();

      const result = await harness.provider.placeOrder({
        symbol: 'BTC',
        isBuy: true,
        size: '0.1',
        orderType: 'market',
        currentPrice: 50_000,
        leverage: 5,
        marginMode: 'cross',
      });

      expect(result.success).toBe(true);
      expect(harness.mocks.exchangeClient.updateLeverage).toHaveBeenCalledWith(
        expect.objectContaining({ isCross: true, leverage: 5 }),
      );
    });
  });
});
