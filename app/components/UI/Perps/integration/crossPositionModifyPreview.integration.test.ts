/**
 * Integration tests — Cross position modify preview.
 *
 * Real `HyperLiquidProvider` (the released `@metamask/perps-controller`
 * build) runs. The harness mocks the venue I/O boundary. Covers the REST
 * fallback that `previewPositionModify` takes for a Cross position when no
 * live cross-margin stream is current for the wallet.
 *
 * Reference: tests/integration/AGENTS.md · MetaMask/skills integration-test
 */

// The harness owns the perps I/O `jest.mock` declarations, so it must load
// before anything else pulls in `@metamask/perps-controller`.
import { buildPerpsIntegrationHarness } from '../../../../../tests/integration/harnesses/perps/perps';

const crossBtcPosition = {
  symbol: 'BTC',
  size: '0.1',
  entryPrice: '50000',
  positionValue: '5000',
  marginUsed: '1000',
  leverage: { type: 'cross' as const, value: 5 },
  liquidationPrice: '35000',
  maxLeverage: 50,
};

const withStandardCrossAccount = (
  harness: ReturnType<typeof buildPerpsIntegrationHarness>,
) => {
  harness.mocks.infoClient.userAbstraction.mockResolvedValue('default');
  // A single-tier margin table: the Cross liquidation estimate needs tiers.
  harness.mocks.infoClient.meta.mockResolvedValue({
    universe: [
      { name: 'BTC', szDecimals: 3, maxLeverage: 40, marginTableId: 40 },
    ],
  });
  harness.mocks.infoClient.clearinghouseState.mockResolvedValue({
    marginSummary: { totalMarginUsed: '1000', accountValue: '1500' },
    crossMarginSummary: {
      accountValue: '1500',
      totalMarginUsed: '1000',
      totalNtlPos: '5000',
    },
    crossMaintenanceMarginUsed: '50',
    withdrawable: '500',
    assetPositions: [
      {
        type: 'oneWay',
        position: {
          coin: 'BTC',
          szi: '0.1',
          entryPx: '50000',
          positionValue: '5000',
          unrealizedPnl: '0',
          marginUsed: '1000',
          leverage: { type: 'cross', value: 5 },
          liquidationPx: '35000',
          maxLeverage: 50,
          returnOnEquity: '0',
          cumFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
        },
      },
    ],
  });
};

describe('Perps Cross position modify preview — integration', () => {
  it('reads the Cross account over REST when no live cross-margin stream is current', async () => {
    const harness = buildPerpsIntegrationHarness();
    withStandardCrossAccount(harness);

    const preview = await harness.provider.previewPositionModify({
      position: crossBtcPosition,
      direction: 'long',
      size: '0.1',
      price: '50000',
      leverage: 5,
      feeAmountUsd: 2,
    });

    expect(
      harness.mocks.subscription.getFreshCrossMarginContext,
    ).toHaveBeenCalledWith(expect.any(String), 'BTC');
    expect(harness.mocks.infoClient.clearinghouseState).toHaveBeenCalled();
    expect(preview).toMatchObject({
      status: 'open',
      resulting: {
        direction: 'long',
        size: 0.2,
        liquidationPrice: { available: true, value: expect.any(Number) },
      },
    });
  });

  it('prices a new Cross order using the venue’s higher notional tier', async () => {
    const harness = buildPerpsIntegrationHarness();
    withStandardCrossAccount(harness);
    harness.mocks.infoClient.meta.mockResolvedValue({
      universe: [
        { name: 'BTC', szDecimals: 3, maxLeverage: 40, marginTableId: 51 },
      ],
      marginTables: [
        [
          51,
          {
            marginTiers: [
              { lowerBound: '0', maxLeverage: 40 },
              { lowerBound: '5000', maxLeverage: 10 },
            ],
          },
        ],
      ],
    });
    harness.mocks.infoClient.clearinghouseState.mockResolvedValue({
      marginSummary: { accountValue: '1500', totalMarginUsed: '0' },
      crossMarginSummary: {
        accountValue: '1500',
        totalMarginUsed: '0',
        totalNtlPos: '0',
      },
      crossMaintenanceMarginUsed: '0',
      withdrawable: '1500',
      assetPositions: [],
    });

    const estimate = await harness.provider.estimateCrossLiquidation({
      symbol: 'BTC',
      direction: 'long',
      size: '0.2',
      entryPrice: '50000',
      leverage: 10,
    });

    expect(estimate).toEqual({ status: 'price', price: '43750' });
  });

  it('reports an unavailable liquidation price when the Cross account read fails', async () => {
    const harness = buildPerpsIntegrationHarness();
    withStandardCrossAccount(harness);
    harness.mocks.infoClient.clearinghouseState.mockRejectedValue(
      new Error('network down'),
    );

    const preview = await harness.provider.previewPositionModify({
      position: crossBtcPosition,
      direction: 'long',
      size: '0.1',
      price: '50000',
      leverage: 5,
      feeAmountUsd: 2,
    });

    expect(preview).toMatchObject({
      status: 'open',
      resulting: { liquidationPrice: { available: false } },
    });
  });
});
