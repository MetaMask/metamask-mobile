import { mapFeedItem } from './mapFeedItem';
import { mockPerpFeedItem, mockSpotFeedItem } from '../mocks/coreFeed.mock';

describe('mapFeedItem', () => {
  it('maps an open spot buy to a spot UI item with CAIP + hex chain', () => {
    const result = mapFeedItem(mockSpotFeedItem());

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      type: 'spot',
      id: 'pos-spot-1-1700000000',
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
      marketSymbol: 'ETH',
      tradeSymbol: 'ETH',
      direction: 'long',
      leverage: 8,
    });
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

  it('marks negative PnL as not positive', () => {
    const result = mapFeedItem(
      mockPerpFeedItem({ pnlValueUsd: -500, realizedPnl: -500 }),
    );

    expect(result?.isPnlPositive).toBe(false);
  });
});
