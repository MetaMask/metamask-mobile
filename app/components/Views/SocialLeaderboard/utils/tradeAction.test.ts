import type { Position, Trade } from '@metamask/social-controllers';
import {
  isEntryAction,
  resolveTradeAction,
  resolveTradeActions,
  tradeActionLabelKey,
  type TradeAction,
} from './tradeAction';

/**
 * A fill returned by the social API.
 */
interface Fill {
  intent: 'enter' | 'exit';
  size: number;
  timestamp?: number;
  action: TradeAction;
}

const buildTrade = (fill: Fill, index: number): Trade =>
  ({
    tokenAmount: fill.intent === 'enter' ? fill.size : -fill.size,
    usdCost: fill.intent === 'enter' ? fill.size : -fill.size,
    timestamp: fill.timestamp ?? 1_700_000_000 + index,
    transactionHash: `0xtrade${index}`,
    direction: fill.intent === 'enter' ? 'buy' : 'sell',
    intent: fill.intent,
    action: fill.action,
  }) as unknown as Trade;

/**
 * Builds a position from fills given oldest-first and stores them newest-first,
 * the order the API sends.
 */
function buildPosition(
  fills: Fill[],
  overrides: Partial<Position> = {},
): Position {
  return {
    chain: 'ethereum',
    soldUsd: 0,
    trades: fills.map(buildTrade).reverse(),
    positionAmount: 0,
    ...overrides,
  } as unknown as Position;
}

describe('resolveTradeActions', () => {
  it('returns nothing for a position with no trades', () => {
    const result = resolveTradeActions(buildPosition([]));

    expect(result).toStrictEqual([]);
  });

  it('returns server-provided lifecycle stages in API order', () => {
    const position = buildPosition([
      { intent: 'enter', size: 100, action: 'opened' },
      { intent: 'enter', size: 50, action: 'added' },
      { intent: 'exit', size: 40, action: 'reduced' },
      { intent: 'exit', size: 110, action: 'closed' },
    ]);

    const result = resolveTradeActions(position);

    expect(result).toStrictEqual(['closed', 'reduced', 'added', 'opened']);
  });

  it('uses the server action instead of inferring it from intent', () => {
    const position = buildPosition([
      { intent: 'enter', size: 100, action: 'added' },
    ]);

    const result = resolveTradeActions(position);

    expect(result).toStrictEqual(['added']);
  });
});

describe('resolveTradeAction', () => {
  it('resolves the action for a specific fill', () => {
    const position = buildPosition([
      { intent: 'enter', size: 100, action: 'opened' },
      { intent: 'enter', size: 50, action: 'added' },
    ]);
    const [newest] = position.trades;

    expect(resolveTradeAction(position, newest)).toBe('added');
  });

  it('returns undefined for a trade from another position', () => {
    const position = buildPosition([
      { intent: 'enter', size: 100, action: 'opened' },
    ]);
    const stranger = buildTrade(
      { intent: 'enter', size: 1, action: 'opened' },
      99,
    );

    expect(resolveTradeAction(position, stranger)).toBeUndefined();
  });
});

describe('tradeActionLabelKey', () => {
  // Perps name the lifecycle stage; the LONG/SHORT badge alongside carries the
  // direction.
  it.each([
    ['opened', 'perps_opened'],
    ['added', 'perps_added'],
    ['reduced', 'perps_reduced'],
    ['closed', 'perps_closed'],
  ] as const)('maps a perp %s fill to %s', (action, key) => {
    expect(tradeActionLabelKey(true, action)).toBe(key);
  });

  // Spot names the direction instead: a token row has no badge, and in the feed
  // the figure beside the verb is P&L rather than trade direction, so the verb
  // is the only buy/sell signal.
  it.each([
    ['opened', 'spot_bought'],
    ['added', 'spot_bought'],
    ['reduced', 'spot_sold'],
    ['closed', 'spot_sold'],
  ] as const)('maps a spot %s fill to %s', (action, key) => {
    expect(tradeActionLabelKey(false, action)).toBe(key);
  });
});

describe('isEntryAction', () => {
  it.each([
    ['opened', true],
    ['added', true],
    ['reduced', false],
    ['closed', false],
  ] as const)('reports %s as entry=%s', (action, expected) => {
    expect(isEntryAction(action)).toBe(expected);
  });
});
