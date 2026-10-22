import { mockPerpFeedItem, mockSpotFeedItem } from '../mocks/coreFeed.mock';
import { buildLivePriceSource } from './buildLivePriceSource';

const derived = {
  snapshotPrice: 123.0005,
  entryPrice: 100,
  marketCapPerPrice: 50,
};

describe('buildLivePriceSource', () => {
  it('keys an open spot position on its CAIP-19 asset id', () => {
    const source = buildLivePriceSource(mockSpotFeedItem(), false, derived);

    expect(source).toStrictEqual({
      key: 'spot:eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      kind: 'spot',
      assetId: 'eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      positionAmount: 1000,
      direction: 1,
      snapshotPrice: 123.0005,
      snapshotPnlUsd: 12345,
      entryPrice: 100,
      // 12,345 is 12% of the basis the API used.
      pnlBaseUsd: 12345 / 0.12,
      marketCapPerPrice: 50,
    });
  });

  it('resolves a native token to its slip44 asset id', () => {
    const source = buildLivePriceSource(
      mockSpotFeedItem({
        tokenAddress: '0x0000000000000000000000000000000000000000',
      }),
      false,
      derived,
    );

    expect(source?.assetId).toBe('eip155:1/slip44:60');
  });

  it('keys an open perp on its market symbol and flips a short', () => {
    const source = buildLivePriceSource(
      mockPerpFeedItem({ perpPositionType: 'short', isOpen: true }),
      false,
      derived,
    );

    expect(source?.key).toBe('perp:ETH');
    expect(source?.symbol).toBe('ETH');
    expect(source?.direction).toBe(-1);
    expect(source?.marketCapPerPrice).toBeNull();
  });

  it('keeps the HIP-3 dex prefix on the perp symbol', () => {
    const source = buildLivePriceSource(
      mockPerpFeedItem({ tokenSymbol: 'xyz:NVDA', isOpen: true }),
      false,
      derived,
    );

    expect(source?.key).toBe('perp:xyz:NVDA');
  });

  it('skips closed positions', () => {
    expect(
      buildLivePriceSource(mockSpotFeedItem(), true, derived),
    ).toBeUndefined();
  });

  it('skips positions with nothing left', () => {
    expect(
      buildLivePriceSource(
        mockSpotFeedItem({ positionAmount: 0 }),
        false,
        derived,
      ),
    ).toBeUndefined();
  });

  it('skips spot chains with no CAIP mapping', () => {
    expect(
      buildLivePriceSource(
        mockSpotFeedItem({ chain: 'unknown-chain' }),
        false,
        derived,
      ),
    ).toBeUndefined();
  });

  it('falls back to the bought amount as the percent basis', () => {
    const source = buildLivePriceSource(
      mockSpotFeedItem({ pnlPercent: null }),
      false,
      derived,
    );

    expect(source?.pnlBaseUsd).toBe(100000);
  });
});
