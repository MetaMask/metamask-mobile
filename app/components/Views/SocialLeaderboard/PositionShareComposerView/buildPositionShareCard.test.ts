import {
  buildPerpPosition,
  buildPosition,
  buildTrade,
  DAY_MS,
  HOUR_MS,
  NOW_MS,
} from '../PositionDetailsSheet/positionDetailsSheet.fixtures';
import {
  buildPositionShareCard,
  type PositionShareCardSheetData,
} from './buildPositionShareCard';

const author = { label: 'alex.eth', address: '0xabc' };

const buildSheet = (
  overrides: Partial<PositionShareCardSheetData> = {},
): PositionShareCardSheetData => ({
  isPerp: false,
  isClosed: false,
  symbol: 'PEPE',
  leverage: undefined,
  perpDirection: null,
  prices: [
    ['1', 100],
    ['2', 110],
    ['3', 120],
  ],
  markers: [],
  isMarketCapMode: false,
  formatValue: (price: number) => `$${price.toFixed(2)}`,
  currentPrice: 120,
  summarySubtitle: 'Opened · 2 d ago',
  pnlPercentLabel: '+20.00%',
  pnlValueLabel: '+$40.00',
  isPnlPositive: true,
  ...overrides,
});

const marker = (index: number, intent: 'enter' | 'exit') => ({
  id: `${intent}-${index}`,
  index,
  intent,
  timestampMs: index,
  tooltipLabel: intent,
});

describe('buildPositionShareCard', () => {
  it('builds an up card for an open spot position', () => {
    const card = buildPositionShareCard({
      position: buildPosition(),
      sheet: buildSheet({ markers: [marker(0, 'enter')] }),
      author,
    });

    expect(card).toEqual({
      direction: 'up',
      author,
      statusLabel: 'Opened · 2 d ago',
      market: { symbol: 'PEPE', imageUrl: undefined, detail: undefined },
      primaryValue: '+$40.00',
      changeLabel: '20.00%',
      stats: [
        { label: 'Entry', value: '$100.00' },
        { label: 'Current', value: '$120.00' },
      ],
      chart: { points: [100, 110, 120], entryIndex: 0, exitIndex: undefined },
    });
  });

  it('marks the last exit and shows the exit price on a closed position', () => {
    const position = buildPosition({
      positionAmount: 0,
      isOpen: false,
      trades: [
        buildTrade(),
        buildTrade({
          direction: 'sell',
          intent: 'exit',
          tokenAmount: 1,
          usdCost: 90,
          timestamp: NOW_MS - DAY_MS,
          transactionHash: '0xexit-1',
        }),
        buildTrade({
          direction: 'sell',
          intent: 'exit',
          tokenAmount: 1,
          usdCost: 80,
          timestamp: NOW_MS - HOUR_MS,
          transactionHash: '0xexit-2',
        }),
      ],
    });

    const card = buildPositionShareCard({
      position,
      sheet: buildSheet({
        isClosed: true,
        isPnlPositive: false,
        pnlValueLabel: '-$30.00',
        pnlPercentLabel: '-15.00%',
        markers: [marker(0, 'enter'), marker(1, 'exit'), marker(2, 'exit')],
      }),
      author,
    });

    expect(card.direction).toBe('down');
    expect(card.primaryValue).toBe('-$30.00');
    expect(card.changeLabel).toBe('15.00%');
    expect(card.stats).toEqual([
      { label: 'Entry', value: '$100.00' },
      { label: 'Exit', value: '$80.00' },
    ]);
    expect(card.chart.entryIndex).toBe(0);
    expect(card.chart.exitIndex).toBe(2);
  });

  it('labels spot values as market cap when the sheet reads them that way', () => {
    const card = buildPositionShareCard({
      position: buildPosition(),
      sheet: buildSheet({ isMarketCapMode: true }),
      author,
    });

    expect(card.stats.map(({ label }) => label)).toEqual([
      'Entry MC',
      'Current MC',
    ]);
  });

  it('adds direction and leverage to the market line on a perp', () => {
    const card = buildPositionShareCard({
      position: buildPerpPosition(),
      sheet: buildSheet({
        isPerp: true,
        symbol: 'BTC',
        perpDirection: 'long',
        leverage: 20,
      }),
      author,
    });

    expect(card.market).toEqual(
      expect.objectContaining({ symbol: 'BTC', detail: 'Long 20x' }),
    );
  });

  it('shows the referral code in the footer when the sharer has one', () => {
    const card = buildPositionShareCard({
      position: buildPosition(),
      sheet: buildSheet(),
      author,
      referralCode: '8F3A21',
    });

    expect(card.promoCode).toBe('8F3A21');
    expect(card.promoCaption).toBe('Referral code');
  });

  it('falls back to a dash when a stat has no price', () => {
    const card = buildPositionShareCard({
      position: buildPosition({ costBasis: null, trades: [] }),
      sheet: buildSheet({ currentPrice: undefined }),
      author,
    });

    expect(card.stats.map(({ value }) => value)).toEqual(['\u2014', '\u2014']);
  });
});
