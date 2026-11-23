/**
 * Integration test — Core selects a Mobile trading-fee grant for a
 * Hyperliquid mainnet fee preview.
 */

import { buildPerpsFeeResolutionHarness } from '../../../../../tests/integration/harnesses/perps/perps';

describe('Perps fee grant resolution — integration', () => {
  it('prices a Hyperliquid mainnet quote from the active grant', async () => {
    // Arrange
    const grant = {
      providerId: 'hyperliquid' as const,
      isTestnet: false,
      feeBips: 2.5,
      expiresAt: Date.now() + 60_000,
    };
    const { controller } = buildPerpsFeeResolutionHarness(grant);
    await controller.init();

    try {
      // Act
      const fees = await controller.calculateFees({
        orderType: 'market',
        isMaker: false,
        amount: '1000',
        symbol: 'ETH',
      });

      // Assert
      expect(fees).toEqual(
        expect.objectContaining({
          chargesMetamaskBuilderFee: true,
          feeSource: 'grant',
          metamaskFeeDiscountBips: 7500,
          metamaskFeeRate: 0.00025,
          undiscountedMetamaskFeeRate: 0.001,
        }),
      );
    } finally {
      await controller.disconnect();
    }
  });
});
