import type { Position, Trade } from '@metamask/social-controllers';
import {
  isEntryAction,
  resolveTradeAction,
  resolveTradeActions,
  tradeActionLabelKey,
  type PositionWithOpenState,
  type TradeAction,
} from './tradeAction';

/**
 * A fill described the way the walk cares about it: an intent and a size.
 * `tokenAmount` is written negative for exits to mirror the API's own sign
 * convention and prove the walk ignores it in favour of `intent`.
 */
interface Fill {
  intent: 'enter' | 'exit';
  size: number;
  timestamp?: number;
  action?: TradeAction;
}

const buildTrade = (fill: Fill, index: number): Trade =>
  ({
    tokenAmount: fill.intent === 'enter' ? fill.size : -fill.size,
    usdCost: fill.intent === 'enter' ? fill.size : -fill.size,
    timestamp: fill.timestamp ?? 1_700_000_000 + index,
    transactionHash: `0xtrade${index}`,
    direction: fill.intent === 'enter' ? 'buy' : 'sell',
    intent: fill.intent,
    ...(fill.action && { action: fill.action }),
  }) as unknown as Trade;

/**
 * Builds a position from fills given oldest-first (how a human reads a
 * history) and stores them newest-first, the order the API sends.
 * `positionAmount` defaults to the net of the fills — an untruncated window.
 */
function buildPosition(
  fills: Fill[],
  overrides: Partial<PositionWithOpenState> = {},
): PositionWithOpenState {
  const net = fills.reduce(
    (sum, fill) => sum + (fill.intent === 'enter' ? fill.size : -fill.size),
    0,
  );
  return {
    // Spot on Ethereum unless a test overrides it — `isClosedPosition` reads
    // `chain` and `perpPositionType` to pick its open/closed heuristic.
    chain: 'ethereum',
    soldUsd: fills.some((fill) => fill.intent === 'exit') ? 1_000 : 0,
    trades: fills.map(buildTrade).reverse(),
    positionAmount: net,
    ...overrides,
  } as unknown as PositionWithOpenState;
}

/** Actions in chronological order, so expectations read like the history. */
const actionsInOrder = (position: PositionWithOpenState) =>
  [...resolveTradeActions(position)].reverse();

describe('resolveTradeActions', () => {
  it('returns nothing for a position with no trades', () => {
    expect(resolveTradeActions(buildPosition([]))).toStrictEqual([]);
  });

  it('labels a lone entry as opened', () => {
    expect(
      actionsInOrder(buildPosition([{ intent: 'enter', size: 100 }])),
    ).toStrictEqual(['opened']);
  });

  it('labels a second entry as added, not a second open', () => {
    expect(
      actionsInOrder(
        buildPosition([
          { intent: 'enter', size: 100 },
          { intent: 'enter', size: 50 },
        ]),
      ),
    ).toStrictEqual(['opened', 'added']);
  });

  it('labels a partial exit as reduced rather than closed', () => {
    expect(
      actionsInOrder(
        buildPosition([
          { intent: 'enter', size: 100 },
          { intent: 'exit', size: 40 },
        ]),
      ),
    ).toStrictEqual(['opened', 'reduced']);
  });

  it('labels an exit that zeroes the position as closed', () => {
    expect(
      actionsInOrder(
        buildPosition([
          { intent: 'enter', size: 100 },
          { intent: 'exit', size: 100 },
        ]),
      ),
    ).toStrictEqual(['opened', 'closed']);
  });

  it('walks a full round trip through all four stages', () => {
    expect(
      actionsInOrder(
        buildPosition([
          { intent: 'enter', size: 100 },
          { intent: 'exit', size: 40 },
          { intent: 'enter', size: 25 },
          { intent: 'exit', size: 85 },
        ]),
      ),
    ).toStrictEqual(['opened', 'reduced', 'added', 'closed']);
  });

  it('re-opens after a full close', () => {
    expect(
      actionsInOrder(
        buildPosition([
          { intent: 'enter', size: 100 },
          { intent: 'exit', size: 100 },
          { intent: 'enter', size: 30 },
        ]),
      ),
    ).toStrictEqual(['opened', 'closed', 'opened']);
  });

  // Opening a short is `direction: 'sell'` with `intent: 'enter'`, and the API
  // reports the resulting size as a positive magnitude, so signing by intent
  // makes shorts accumulate exactly like longs.
  it('treats a short the same as a long', () => {
    expect(
      actionsInOrder(
        buildPosition(
          [
            { intent: 'enter', size: 5 },
            { intent: 'enter', size: 3 },
            { intent: 'exit', size: 3 },
            { intent: 'exit', size: 5 },
          ],
          { positionAmount: 0, isOpen: false },
        ),
      ),
    ).toStrictEqual(['opened', 'added', 'reduced', 'closed']);
  });

  it('does not report the oldest visible fill as opened when the window is truncated', () => {
    // The trader already held 500 before these fills; the API capped the array.
    expect(
      actionsInOrder(
        buildPosition(
          [
            { intent: 'enter', size: 100 },
            { intent: 'exit', size: 40 },
          ],
          { positionAmount: 560 },
        ),
      ),
    ).toStrictEqual(['added', 'reduced']);
  });

  // A closed perp keeps its historical positionAmount (a closed 5x long still
  // reports a size of 5), so anchoring to it would fabricate a pre-window
  // balance and read the closing fill as a reduce.
  it('does not anchor a perp walk to its stale positionAmount', () => {
    const position = buildPosition([{ intent: 'exit', size: 5 }], {
      chain: 'hyperliquid',
      perpPositionType: 'long',
      positionAmount: 5,
      currentValueUSD: 0,
    });

    expect(actionsInOrder(position)).toStrictEqual(['closed']);
  });

  it('reads a perp trim as reduced while exposure remains', () => {
    const position = buildPosition(
      [
        { intent: 'enter', size: 5 },
        { intent: 'exit', size: 2 },
      ],
      {
        chain: 'hyperliquid',
        perpPositionType: 'long',
        positionAmount: 5,
        currentValueUSD: 30_000,
      },
    );

    expect(actionsInOrder(position)).toStrictEqual(['opened', 'reduced']);
  });

  it('ignores reconciliation drift between positionAmount and the fills', () => {
    expect(
      actionsInOrder(
        buildPosition([{ intent: 'enter', size: 100 }], {
          positionAmount: 100.05,
        }),
      ),
    ).toStrictEqual(['opened']);
  });

  it('does not read a redelivered fill as an add to itself', () => {
    const position = buildPosition([{ intent: 'enter', size: 100 }]);
    position.trades = [position.trades[0], { ...position.trades[0] }];

    expect(resolveTradeActions(position)).toStrictEqual(['opened', 'opened']);
  });

  it('treats a dust residue as flat', () => {
    expect(
      actionsInOrder(
        buildPosition(
          [
            { intent: 'enter', size: 100 },
            { intent: 'exit', size: 99.999999 },
          ],
          { positionAmount: 0, isOpen: false },
        ),
      ),
    ).toStrictEqual(['opened', 'closed']);
  });

  it('trusts isOpen over the arithmetic for the newest exit', () => {
    // The fills net to zero, but the API still reports exposure — it wins.
    expect(
      actionsInOrder(
        buildPosition(
          [
            { intent: 'enter', size: 100 },
            { intent: 'exit', size: 100 },
          ],
          { isOpen: true },
        ),
      ),
    ).toStrictEqual(['opened', 'reduced']);
  });

  it('leaves earlier exits to the arithmetic', () => {
    // isOpen describes the position now, so it must not colour historical fills.
    expect(
      actionsInOrder(
        buildPosition(
          [
            { intent: 'enter', size: 100 },
            { intent: 'exit', size: 40 },
            { intent: 'enter', size: 10 },
          ],
          { isOpen: true },
        ),
      ),
    ).toStrictEqual(['opened', 'reduced', 'added']);
  });

  it('walks same-timestamp siblings in chronological order', () => {
    // A Hyperliquid flip emits its exit and entry legs with one timestamp.
    expect(
      actionsInOrder(
        buildPosition(
          [
            { intent: 'enter', size: 100, timestamp: 1_700_000_000 },
            { intent: 'exit', size: 100, timestamp: 1_700_000_100 },
            { intent: 'enter', size: 60, timestamp: 1_700_000_100 },
          ],
          { positionAmount: 60, isOpen: true },
        ),
      ),
    ).toStrictEqual(['opened', 'closed', 'opened']);
  });

  describe('when the API supplies the action', () => {
    it('prefers it over the local derivation', () => {
      // The arithmetic alone would say "opened" for a truncated window; the
      // server computed "added" against the full history and wins.
      const position = buildPosition([
        { intent: 'enter', size: 100, action: 'added' },
      ]);

      expect(resolveTradeActions(position)).toStrictEqual(['added']);
    });

    it('falls back to the derivation when only some fills carry it', () => {
      const position = buildPosition([
        { intent: 'enter', size: 100 },
        { intent: 'enter', size: 50, action: 'added' },
      ]);

      expect(actionsInOrder(position)).toStrictEqual(['opened', 'added']);
    });
  });
});

describe('resolveTradeAction', () => {
  it('resolves the action for a specific fill', () => {
    const position = buildPosition([
      { intent: 'enter', size: 100 },
      { intent: 'enter', size: 50 },
    ]);
    const [newest] = position.trades;

    expect(resolveTradeAction(position, newest)).toBe('added');
  });

  it('returns undefined for a trade from another position', () => {
    const position = buildPosition([{ intent: 'enter', size: 100 }]);
    const stranger = buildTrade({ intent: 'enter', size: 1 }, 99);

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
