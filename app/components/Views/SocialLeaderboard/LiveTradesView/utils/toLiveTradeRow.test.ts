import {
  mockPerpFeedItem,
  mockSpotFeedItem,
} from '../../FeedView/mocks/coreFeed.mock';
import { toLiveTradeRow } from './toLiveTradeRow';

describe('toLiveTradeRow', () => {
  it('maps a spot fill onto unit price, amount, buy side, and market cap', () => {
    const core = mockSpotFeedItem({
      positionId: 'pepe-1',
      tokenSymbol: 'PEPE',
      positionAmount: 100,
      currentValueUSD: 50,
      timestamp: 1_700_000_000,
      trades: [
        {
          direction: 'buy',
          intent: 'enter',
          action: 'opened',
          tokenAmount: 100,
          usdCost: 50,
          marketCap: 5_200_000_000,
          timestamp: 1_700_000_000,
          transactionHash: '0x1',
          classification: 'spot',
        },
      ],
      actor: {
        profileId: 'trader-1',
        address: '0xabc',
        name: 'cented',
        imageUrl: null,
        winRate30d: 0.5,
        pnl30d: 48_000,
      },
    });

    const row = toLiveTradeRow(core);

    expect(row.type).toBe('spot');
    expect(row.side).toBe('buy');
    expect(row.symbol).toBe('PEPE');
    expect(row.authorHandle).toBe('cented');
    expect(row.author.winRatePercent).toBe(50);
    expect(row.author.pnl30d).toBe(48_000);
    expect(row.marketCapUsd).toBe(5_200_000_000);
    expect(row.markPriceLabel).toBe('$0.5');
    expect(row.amountLabel).toContain('PEPE');
    expect(row.traderId).toBe('trader-1');
    expect(row.positionId).toBe('pepe-1');
  });

  it('maps a perp fill onto direction and leverage without a market cap', () => {
    const core = mockPerpFeedItem({
      positionId: 'sol-1',
      tokenSymbol: 'SOL',
      positionAmount: 4.9282,
      currentValueUSD: 830,
      isOpen: true,
      timestamp: 1_700_000_000,
      lastTradeAt: 1_700_000_000,
      perpPositionType: 'long',
      perpLeverage: 10,
      trades: [
        {
          direction: 'buy',
          intent: 'enter',
          action: 'opened',
          tokenAmount: 4.9282,
          usdCost: 830,
          timestamp: 1_700_000_000,
          transactionHash: '0x2',
          classification: 'perp',
          perpPositionType: 'long',
          perpLeverage: 10,
        },
      ],
      actor: {
        profileId: 'trader-2',
        address: '0xdef',
        name: 'liq-hunter',
        imageUrl: null,
      },
    });

    const row = toLiveTradeRow(core);

    expect(row.type).toBe('perps');
    expect(row.direction).toBe('long');
    expect(row.leverageLabel).toBe('10x');
    expect(row.marketCapUsd).toBeNull();
    expect(row.symbol).toBe('SOL');
  });
});
