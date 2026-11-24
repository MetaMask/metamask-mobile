import { computeLivePositionFigures } from './computeLivePositionFigures';
import type { SocialLivePriceSource } from './types';

const spotSource = (
  overrides: Partial<SocialLivePriceSource> = {},
): SocialLivePriceSource => ({
  key: 'spot:eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933',
  kind: 'spot',
  positionAmount: 1000,
  direction: 1,
  snapshotPrice: 120,
  snapshotPnlUsd: 20_000,
  entryPrice: 100,
  pnlBaseUsd: 100_000,
  marketCapPerPrice: 10_000,
  ...overrides,
});

describe('computeLivePositionFigures', () => {
  it('moves the snapshot P&L by the price change since the snapshot', () => {
    const figures = computeLivePositionFigures(spotSource(), 125);

    expect(figures.pnlUsd).toBe(25_000);
    expect(figures.pnlPercent).toBe(25);
  });

  it('scales the market cap with the price', () => {
    const figures = computeLivePositionFigures(spotSource(), 125);

    expect(figures.marketCapUsd).toBe(1_250_000);
  });

  it('reverses the P&L move on a short', () => {
    const figures = computeLivePositionFigures(
      spotSource({
        kind: 'perp',
        direction: -1,
        snapshotPnlUsd: 500,
        marketCapPerPrice: null,
      }),
      125,
    );

    expect(figures.pnlUsd).toBe(500 - 1000 * 5);
    expect(figures.marketCapUsd).toBeNull();
  });

  it('falls back to the move from entry without a snapshot', () => {
    const figures = computeLivePositionFigures(
      spotSource({ snapshotPrice: null, snapshotPnlUsd: null }),
      110,
    );

    expect(figures.pnlUsd).toBe(10_000);
    expect(figures.pnlPercent).toBe(10);
  });

  it('returns no P&L when neither a snapshot nor an entry exists', () => {
    const figures = computeLivePositionFigures(
      spotSource({
        snapshotPrice: null,
        snapshotPnlUsd: null,
        entryPrice: null,
      }),
      110,
    );

    expect(figures.pnlUsd).toBeNull();
    expect(figures.pnlPercent).toBeNull();
    expect(figures.price).toBe(110);
  });

  it('returns no percent without a basis', () => {
    const figures = computeLivePositionFigures(
      spotSource({ pnlBaseUsd: null }),
      125,
    );

    expect(figures.pnlUsd).toBe(25_000);
    expect(figures.pnlPercent).toBeNull();
  });
});
