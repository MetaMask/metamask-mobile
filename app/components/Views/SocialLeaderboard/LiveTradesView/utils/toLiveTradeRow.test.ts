import type { Trade } from '@metamask/social-controllers';
import {
  mockPerpFeedItem,
  mockSpotFeedItem,
} from '../../../../UI/SocialFeed/mocks/coreFeed.mock';
import { formatTradeUnitPrice } from '../../../../UI/SocialFeed/utils/formatters';
import { toLiveTradeRow } from './toLiveTradeRow';

describe('toLiveTradeRow', () => {
  it('maps a spot fill onto unit price, buy side, and an open card', () => {
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
    expect(row.subtitleLabel).toBe(formatTradeUnitPrice(0.5));
    expect(row.isClosed).toBe(false);
    expect(row.closedAtMs).toBeUndefined();
    expect(row.traderId).toBe('trader-1');
    expect(row.positionId).toBe('pepe-1');
    expect(row.position).toBe(core);
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

  it('infers short from a sell fill when the position omits perpPositionType', () => {
    const core = mockPerpFeedItem({
      positionId: 'hype-1',
      tokenSymbol: 'HYPE',
      chain: 'hyperliquid',
      perpPositionType: null,
      trades: [
        {
          direction: 'sell',
          intent: 'enter',
          action: 'opened',
          tokenAmount: 10,
          usdCost: 700,
          timestamp: 1_700_000_000,
          transactionHash: '0x3',
          classification: 'perp',
        },
      ],
      timestamp: 1_700_000_000,
    });

    const row = toLiveTradeRow(core);

    expect(row.type).toBe('perps');
    expect(row.direction).toBe('short');
  });

  it('omits direction when a hyperliquid row has no type and no fill to infer from', () => {
    const core = mockPerpFeedItem({
      positionId: 'unk-1',
      tokenSymbol: 'BTC',
      chain: 'hyperliquid',
      perpPositionType: null,
      trades: [],
    });

    const row = toLiveTradeRow(core);

    expect(row.type).toBe('perps');
    expect(row.direction).toBeUndefined();
  });

  it('omits buy/sell when a spot fill has no side', () => {
    const core = mockSpotFeedItem({
      positionId: 'pepe-2',
      tokenSymbol: 'PEPE',
      trades: [
        {
          intent: 'enter',
          tokenAmount: 100,
          usdCost: 50,
          timestamp: 1_700_000_000,
          transactionHash: '0x4',
          classification: 'spot',
        } as Trade,
      ],
      timestamp: 1_700_000_000,
    });

    const row = toLiveTradeRow(core);

    expect(row.type).toBe('spot');
    expect(row.side).toBeUndefined();
  });

  it('quotes a perp in unit price even when its fill carries a market cap', () => {
    const core = mockPerpFeedItem({
      positionAmount: 2,
      currentValueUSD: 200,
      isOpen: true,
      trades: [
        {
          direction: 'buy',
          intent: 'enter',
          action: 'opened',
          tokenAmount: 2,
          usdCost: 200,
          marketCap: 1_000_000,
          timestamp: 1_700_000_000,
          transactionHash: '0x5',
          classification: 'perp',
          perpPositionType: 'long',
        },
      ],
      timestamp: 1_700_000_000,
    });

    const row = toLiveTradeRow(core);

    expect(row.subtitleLabel).toBe(formatTradeUnitPrice(100));
  });

  it('carries running P&L on an open trade', () => {
    const core = mockPerpFeedItem({
      isOpen: true,
      pnlValueUsd: 1_500,
      pnlPercent: 25,
      trades: [
        {
          direction: 'buy',
          intent: 'enter',
          action: 'opened',
          tokenAmount: 5,
          usdCost: 50_000,
          timestamp: 1_700_000_000,
          transactionHash: '0x6',
          classification: 'perp',
          perpPositionType: 'long',
        },
      ],
      timestamp: 1_700_000_000,
    });

    const row = toLiveTradeRow(core);

    expect(row.isClosed).toBe(false);
    expect(row.pnlValueLabel).toBe('+$1.5K');
    expect(row.pnlLabel).toContain('25');
    expect(row.isPnlPositive).toBe(true);
  });

  it('marks a closing fill closed and carries its close time', () => {
    const core = mockPerpFeedItem({
      isOpen: false,
      positionAmount: 0,
      pnlValueUsd: -400,
      pnlPercent: -4,
      lastTradeAt: 1_700_086_400,
      timestamp: 1_700_086_400,
      trades: [
        {
          direction: 'buy',
          intent: 'enter',
          action: 'opened',
          tokenAmount: 5,
          usdCost: 50_000,
          timestamp: 1_700_000_000,
          transactionHash: '0x7',
          classification: 'perp',
          perpPositionType: 'long',
        },
        {
          direction: 'sell',
          intent: 'exit',
          action: 'closed',
          tokenAmount: 5,
          usdCost: 49_600,
          timestamp: 1_700_086_400,
          transactionHash: '0x8',
          classification: 'perp',
          perpPositionType: 'long',
        },
      ],
    });

    const row = toLiveTradeRow(core);

    expect(row.isClosed).toBe(true);
    expect(row.isPnlPositive).toBe(false);
    expect(row.closedAtMs).toBe(1_700_086_400_000);
    expect(row.live).toBeUndefined();
  });

  it('keeps a reducing fill on the open card', () => {
    const core = mockPerpFeedItem({
      isOpen: true,
      positionAmount: 3,
      timestamp: 1_700_000_100,
      trades: [
        {
          direction: 'sell',
          intent: 'exit',
          action: 'reduced',
          tokenAmount: 2,
          usdCost: 20_000,
          timestamp: 1_700_000_100,
          transactionHash: '0x9',
          classification: 'perp',
          perpPositionType: 'long',
        },
      ],
    });

    const row = toLiveTradeRow(core);

    expect(row.isClosed).toBe(false);
    expect(row.closedAtMs).toBeUndefined();
    expect(row.live).toMatchObject({
      key: 'perp:ETH',
      positionAmount: 3,
      marketCapPerPrice: null,
    });
  });
});
