import type { Position } from '@metamask/social-controllers';
import {
  DAY_MS,
  NOW_MS,
  buildPerpPosition,
  buildPosition,
  buildTrade,
} from '../positionDetailsSheet.fixtures';
import { deriveChartLevels } from './chartLevels';

describe('deriveChartLevels', () => {
  it('returns entry and current for an open spot position', () => {
    const levels = deriveChartLevels({
      position: buildPosition(),
      isClosed: false,
      isPerp: false,
      currentPrice: 120,
    });

    expect(levels).toEqual([
      { kind: 'entry', price: 100, timestampMs: NOW_MS - 2 * DAY_MS },
      { kind: 'current', price: 120 },
    ]);
  });

  it('adds the last exit fill once the position is closed', () => {
    const position = buildPosition({
      positionAmount: 0,
      trades: [
        buildTrade(),
        buildTrade({
          direction: 'sell',
          intent: 'exit',
          tokenAmount: 1,
          usdCost: 130,
          timestamp: NOW_MS - DAY_MS,
          transactionHash: '0xexit-1',
        }),
        buildTrade({
          direction: 'sell',
          intent: 'exit',
          tokenAmount: 1,
          usdCost: 150,
          timestamp: NOW_MS - 3600_000,
          transactionHash: '0xexit-2',
        }),
      ],
    });

    const levels = deriveChartLevels({
      position,
      isClosed: true,
      isPerp: false,
      currentPrice: undefined,
    });

    expect(levels.map((level) => level.kind)).toEqual(['entry', 'exit']);
    expect(levels[1]).toEqual({
      kind: 'exit',
      price: 150,
      timestampMs: NOW_MS - 3600_000,
    });
  });

  it('shows take profit and stop loss for an open perp that reports them', () => {
    const position = {
      ...buildPerpPosition(),
      takeProfitPriceUsd: 90000,
      stopLossPriceUsd: 110000,
    } as Position;

    const kinds = deriveChartLevels({
      position,
      isClosed: false,
      isPerp: true,
      currentPrice: 100500,
    }).map((level) => level.kind);

    expect(kinds).toEqual(['entry', 'takeProfit', 'stopLoss', 'current']);
  });

  it('hides take profit and stop loss when they are missing', () => {
    const kinds = deriveChartLevels({
      position: buildPerpPosition(),
      isClosed: false,
      isPerp: true,
      currentPrice: 100500,
    }).map((level) => level.kind);

    expect(kinds).toEqual(['entry', 'current']);
  });

  it('never shows take profit and stop loss for spot', () => {
    const position = {
      ...buildPosition(),
      takeProfitPriceUsd: 200,
      stopLossPriceUsd: 50,
    } as Position;

    const kinds = deriveChartLevels({
      position,
      isClosed: false,
      isPerp: false,
      currentPrice: undefined,
    }).map((level) => level.kind);

    expect(kinds).toEqual(['entry']);
  });
});
