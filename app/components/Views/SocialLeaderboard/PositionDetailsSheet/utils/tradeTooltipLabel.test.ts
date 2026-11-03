import {
  formatTradeTooltipLabel,
  tradeTooltipActionKey,
} from './tradeTooltipLabel';

const PREFIX = 'social_leaderboard.position_sheet.tooltip';

describe('tradeTooltipActionKey', () => {
  it('falls back to the fill direction without an action', () => {
    expect(
      tradeTooltipActionKey({
        trade: { direction: 'sell' },
        action: undefined,
        isPerp: false,
        perpDirection: null,
      }),
    ).toBe(`${PREFIX}.sold`);
  });

  it('reads perps by side and stage', () => {
    expect(
      tradeTooltipActionKey({
        trade: { direction: 'buy' },
        action: 'reduced',
        isPerp: true,
        perpDirection: 'short',
      }),
    ).toBe(`${PREFIX}.perps_short_reduced`);
  });

  it('uses one key for every perp close', () => {
    expect(
      tradeTooltipActionKey({
        trade: { direction: 'buy' },
        action: 'closed',
        isPerp: true,
        perpDirection: 'short',
      }),
    ).toBe(`${PREFIX}.perps_closed`);
  });

  it('reads spot by stage', () => {
    expect(
      tradeTooltipActionKey({
        trade: { direction: 'buy' },
        action: 'added',
        isPerp: false,
        perpDirection: null,
      }),
    ).toBe(`${PREFIX}.spot_added`);
  });
});

describe('formatTradeTooltipLabel', () => {
  it('joins the action and the price', () => {
    expect(
      formatTradeTooltipLabel({
        trade: { direction: 'buy' },
        action: 'reduced',
        isPerp: true,
        perpDirection: 'short',
        priceLabel: '$107,469',
      }),
    ).toBe('Bought back @ $107,469');
  });
});
