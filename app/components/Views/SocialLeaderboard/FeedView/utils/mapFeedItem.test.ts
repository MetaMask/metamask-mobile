import { mapFeedItem } from './mapFeedItem';
import { mockPerpFeedItem, mockSpotFeedItem } from '../mocks/coreFeed.mock';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('mapFeedItem', () => {
  it('maps an open spot buy to a spot UI item with CAIP + hex chain', () => {
    const result = mapFeedItem(mockSpotFeedItem());

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      type: 'spot',
      id: 'pos-spot-1-1700000000',
      traderId: 'profile-1',
      username: 'dutchiono',
      traderAddress: '0x1111111111111111111111111111111111111111',
      action: 'bought',
      tokenSymbol: 'PEPE',
      tokenAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
      chain: 'eip155:1',
      chainIdHex: '0x1',
      isPnlPositive: true,
    });
  });

  it('converts the Unix-seconds timestamp to milliseconds', () => {
    const result = mapFeedItem(mockSpotFeedItem());

    expect(result?.timestamp).toBe(1_700_000_000 * 1000);
  });

  it('leaves millisecond timestamps untouched', () => {
    const result = mapFeedItem(
      mockSpotFeedItem({ timestamp: 1_700_000_000_000 }),
    );

    expect(result?.timestamp).toBe(1_700_000_000_000);
  });

  it('maps a closed perp exit to a perps UI item with direction + leverage', () => {
    const result = mapFeedItem(mockPerpFeedItem());

    expect(result).toMatchObject({
      type: 'perps',
      action: 'closed',
      traderId: 'profile-2',
      marketSymbol: 'ETH',
      tradeSymbol: 'ETH',
      direction: 'long',
      leverage: 8,
    });
  });

  it('falls back to the triggering trade leverage when the position omits it', () => {
    const result = mapFeedItem(
      mockPerpFeedItem({
        perpLeverage: null,
        trades: [
          {
            direction: 'sell',
            intent: 'exit',
            tokenAmount: 5,
            usdCost: 88000,
            timestamp: 1_700_000_500,
            transactionHash: '0xhash',
            classification: 'perp',
            perpPositionType: 'long',
            perpLeverage: 5,
          },
        ],
      }),
    );

    expect(result).toMatchObject({ type: 'perps', leverage: 5 });
  });

  it('leaves leverage null when neither the position nor trade provides it', () => {
    const result = mapFeedItem(
      mockPerpFeedItem({
        perpLeverage: null,
        trades: [
          {
            direction: 'sell',
            intent: 'exit',
            tokenAmount: 5,
            usdCost: 88000,
            timestamp: 1_700_000_500,
            transactionHash: '0xhash',
            classification: 'perp',
            perpPositionType: 'long',
            perpLeverage: null,
          },
        ],
      }),
    );

    expect(result).toMatchObject({ type: 'perps', leverage: null });
  });

  it('strips the HIP-3 DEX prefix from the displayed symbol but keeps it for navigation', () => {
    const result = mapFeedItem(mockPerpFeedItem({ tokenSymbol: 'cash:SPCX' }));

    expect(result).toMatchObject({
      type: 'perps',
      // User-facing symbol never shows the DEX prefix ...
      marketSymbol: 'SPCX',
      marketName: 'SPCX',
      // ... but navigation resolves the tradable `xyz:` market.
      tradeSymbol: 'xyz:SPCX',
    });
  });

  it('derives "sold" for a spot exit trade', () => {
    const result = mapFeedItem(
      mockSpotFeedItem({
        trades: [
          {
            direction: 'sell',
            intent: 'exit',
            tokenAmount: 1000,
            usdCost: 90000,
            timestamp: 1_700_000_000,
            transactionHash: '0xhash',
            classification: 'spot',
          },
        ],
      }),
    );

    expect(result?.action).toBe('sold');
  });

  it('falls back to the most recent trade when none matches the feed timestamp', () => {
    const result = mapFeedItem(
      mockSpotFeedItem({
        timestamp: 9_999_999_999,
        trades: [
          {
            direction: 'buy',
            intent: 'enter',
            tokenAmount: 10,
            usdCost: 100,
            timestamp: 1_700_000_000,
            transactionHash: '0xa',
            classification: 'spot',
          },
          {
            direction: 'sell',
            intent: 'exit',
            tokenAmount: 10,
            usdCost: 200,
            timestamp: 1_700_000_900,
            transactionHash: '0xb',
            classification: 'spot',
          },
        ],
      }),
    );

    // Latest trade (timestamp 1_700_000_900) is an exit -> "sold".
    expect(result?.action).toBe('sold');
  });

  it('returns null for a spot trade on an unsupported chain', () => {
    const result = mapFeedItem(mockSpotFeedItem({ chain: 'fantom' }));

    expect(result).toBeNull();
  });

  it('composes a sub-header with size and a derived price', () => {
    const result = mapFeedItem(mockSpotFeedItem());

    // usdCost 120000 -> "$120K"; price 120000/1000 = 120 -> "at $120.00".
    expect(result?.subHeader).toContain('$120K');
    expect(result?.subHeader).toContain('at');
  });

  it('leaves value and PnL labels empty when open-position fields are missing', () => {
    const result = mapFeedItem(
      mockSpotFeedItem({
        currentValueUSD: null,
        pnlPercent: null,
        pnlValueUsd: null,
      }),
    );

    expect(result?.valueLabel).toBe('');
    expect(result?.pnlLabel).toBe('');
    expect(result?.hasValueData).toBe(false);
    expect(result?.hasPnlData).toBe(false);
  });

  it('leaves value and PnL labels empty when open-position fields are missing', () => {
    const result = mapFeedItem(
      mockSpotFeedItem({
        currentValueUSD: null,
        pnlPercent: null,
        pnlValueUsd: null,
      }),
    );

    expect(result?.valueLabel).toBe('');
    expect(result?.pnlLabel).toBe('');
    expect(result?.hasValueData).toBe(false);
    expect(result?.hasPnlData).toBe(false);
  });

  it('hides value and PnL for an open perp feed row without mark-to-market fields', () => {
    const result = mapFeedItem(
      mockPerpFeedItem({
        currentValueUSD: undefined,
        pnlValueUsd: undefined,
        pnlPercent: undefined,
        realizedPnl: 0,
        marginUsd: 44_646,
        positionAmount: 275,
        perpPositionType: 'long',
        perpLeverage: 8,
        trades: [
          {
            direction: 'buy',
            intent: 'enter',
            tokenAmount: 26.785,
            usdCost: 4351.49,
            timestamp: 1_700_000_000,
            transactionHash: '0xhash',
            classification: 'perp',
            perpPositionType: 'long',
            perpLeverage: 8,
          },
        ],
        timestamp: 1_700_000_000,
      }),
    );

    expect(result?.action).toBe('opened');
    expect(result?.valueLabel).toBe('');
    expect(result?.pnlLabel).toBe('');
    expect(result?.hasValueData).toBe(false);
    expect(result?.hasPnlData).toBe(false);
  });

  it('shows realized PnL for a closed perp without mark-to-market fields', () => {
    const result = mapFeedItem(
      mockPerpFeedItem({
        currentValueUSD: 0,
        pnlValueUsd: undefined,
        pnlPercent: undefined,
        realizedPnl: 4_659,
        marginUsd: 0,
        positionAmount: 0,
        trades: [
          {
            direction: 'sell',
            intent: 'exit',
            tokenAmount: -250,
            usdCost: -40_429,
            timestamp: 1_700_000_500,
            transactionHash: '0xhash',
            classification: 'perp',
            perpPositionType: 'long',
            perpLeverage: 8,
          },
        ],
      }),
    );

    expect(result?.action).toBe('closed');
    expect(result?.hasValueData).toBe(true);
    expect(result?.hasPnlData).toBe(true);
    expect(result?.valueLabel).toContain('4,659');
  });

  it('marks negative PnL as not positive', () => {
    const result = mapFeedItem(
      mockPerpFeedItem({ pnlValueUsd: -500, realizedPnl: -500 }),
    );

    expect(result?.isPnlPositive).toBe(false);
  });
});
