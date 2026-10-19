import {
  array,
  assert,
  enums,
  literal,
  mask,
  object,
  optional,
  refine,
  string,
  union,
} from '@metamask/superstruct';
import {
  amount,
  decimal,
  httpsUrl,
  signedAmount,
  timestamp,
} from '../contracts/v1/primitives';

// Design-only schemas. No production code imports these examples. CV and
// integration tests belong to the implementation tickets, not this proposal.
const id = refine(string(), 'NonEmptyId', (value) => value.length > 0);
const venueId = enums(['kalshi', 'polymarket']);
const side = enums(['yes', 'no']);
const transactionReferences = optional(
  array(object({ chainId: id, hash: id })),
);
const display = optional(
  object({
    title: optional(string()),
    outcomeLabel: optional(string()),
    imageUrl: optional(httpsUrl),
  }),
);
const activityBase = {
  id,
  venueId,
  marketId: id,
  timestamp: optional(timestamp),
  transactionReferences,
  display,
  pnl: optional(
    object({
      netPnl: optional(signedAmount),
      totalNetPnl: optional(signedAmount),
      observedAt: optional(timestamp),
    }),
  ),
};
const fill = refine(
  object({
    ...activityBase,
    type: literal('fill'),
    shares: optional(amount),
    outcomeSide: optional(side),
    price: optional(decimal),
    amount: optional(amount),
    execution: optional(object({ action: enums(['buy', 'sell']), side })),
    fee: optional(amount),
  }),
  'ReportedSidePricePair',
  (value) => (value.outcomeSide === undefined) === (value.price === undefined),
);
const settlement = object({
  ...activityBase,
  type: literal('settlement'),
  mode: enums(['claim', 'automatic']),
  result: optional(enums(['yes', 'no', 'scalar'])),
  side: optional(side),
  shares: optional(amount),
  proceeds: amount,
  costBasis: optional(amount),
  fee: optional(amount),
});
const position = object({
  venueId,
  positionId: id,
  marketId: id,
  outcomeId: optional(id),
  side: optional(side),
  shares: amount,
  valuation: optional(
    object({
      observedAt: timestamp,
      currentValue: optional(amount),
      costBasis: optional(amount),
      unrealizedPnl: optional(signedAmount),
      unrealizedPnlPercent: optional(signedAmount),
      averageEntryPrice: optional(decimal),
    }),
  ),
  settlement: optional(
    object({
      mode: enums(['claim', 'automatic']),
      claimableAmount: optional(amount),
    }),
  ),
});
const sellIntent = object({
  action: literal('sell'),
  marketId: id,
  side,
  shares: refine(amount, 'PositiveShares', (value) => /[1-9]/.test(value)),
});
const summary = object({
  venueId,
  observedAt: timestamp,
  availableBalance: optional(amount),
  openPositionsValue: optional(amount),
  claimableValue: optional(amount),
  portfolioValue: optional(amount),
  unrealizedPnl: optional(signedAmount),
  unrealizedPnlPercent: optional(signedAmount),
});
const outcomePrices = object({
  probability: optional(
    object({
      value: decimal,
      basis: enums(['midpoint', 'last_trade', 'venue_mark']),
      observedAt: timestamp,
    }),
  ),
  askPrice: optional(decimal),
  bidPrice: optional(decimal),
});

const observedAt = '2026-09-28T12:00:00.000Z';
const createRedemption = () => ({
  type: 'settlement',
  mode: 'claim',
  venueId: 'polymarket',
  id: 'redemption-1',
  marketId: 'condition-retired',
  timestamp: observedAt,
  proceeds: '12.3456',
  transactionReferences: [{ chainId: 'eip155:137', hash: 'synthetic-tx-1' }],
  display: { title: 'Retired Event' },
});
const createFill = () => ({
  type: 'fill',
  venueId: 'kalshi',
  id: 'fill-1',
  marketId: 'market-1',
  timestamp: observedAt,
  shares: '2.50',
  outcomeSide: 'yes',
  price: '0.55',
});

describe('PRED-1374 proposed contract examples', () => {
  describe('historical Activity', () => {
    it('keeps a redemption with no catalog context or settlement result', () => {
      const input = createRedemption();

      const result = mask(input, settlement);

      expect(result).toMatchObject({
        id: 'redemption-1',
        marketId: 'condition-retired',
        proceeds: '12.3456',
        mode: 'claim',
        transactionReferences: input.transactionReferences,
        display: { title: 'Retired Event' },
      });
      expect(result.result).toBeUndefined();
      expect(result.side).toBeUndefined();
    });

    it('keeps a Kalshi result independently of catalog metadata', () => {
      const input = {
        ...createRedemption(),
        venueId: 'kalshi',
        mode: 'automatic',
        result: 'yes',
        side: 'no',
        proceeds: '0.00',
        transactionReferences: undefined,
        display: undefined,
      };

      const result = mask(input, settlement);

      expect(result).toMatchObject({
        result: 'yes',
        side: 'no',
        proceeds: '0.00',
        mode: 'automatic',
      });
      expect(result.transactionReferences).toBeUndefined();
    });

    it.each(['unknown', null])('rejects a supplied result of %s', (result) => {
      const input = { ...createRedemption(), result };

      const parse = () => mask(input, settlement);

      expect(parse).toThrow();
    });

    it('keeps missing historical size and time absent', () => {
      const input = {
        ...createFill(),
        shares: undefined,
        timestamp: undefined,
        amount: '1.375',
      };

      const result = mask(input, fill);

      expect(result.shares).toBeUndefined();
      expect(result.timestamp).toBeUndefined();
      expect(result.amount).toBe('1.375');
    });

    it('preserves separate market and total net PnL', () => {
      const input = {
        ...createRedemption(),
        pnl: { netPnl: '-0.50', totalNetPnl: '2.50' },
      };

      const result = mask(input, settlement);

      expect(result.pnl).toEqual(input.pnl);
      expect(result.proceeds).toBe('12.3456');
    });

    it('keeps two records with the same transaction reference', () => {
      const input = [
        createRedemption(),
        { ...createRedemption(), id: 'redemption-2', marketId: 'condition-2' },
      ];

      const result = mask(input, array(settlement));

      expect(result.map((entry) => entry.id)).toEqual([
        'redemption-1',
        'redemption-2',
      ]);
      expect(result[0].transactionReferences).toEqual(
        result[1].transactionReferences,
      );
    });

    it('does not filter malformed financial records from a page', () => {
      const input = [createRedemption(), { ...createFill(), shares: '-1' }];

      const parse = () => assert(input, array(union([settlement, fill])));

      expect(parse).toThrow();
    });

    it('masks unknown fields without making missing metadata mandatory', () => {
      const input = {
        ...createRedemption(),
        futureField: 'ignored',
        display: { title: 'Retired Event', futureDisplayField: 'ignored' },
      };

      const result = mask(input, settlement);

      expect(result).not.toHaveProperty('futureField');
      expect(result.display).toEqual({ title: 'Retired Event' });
    });
  });

  describe('Fill direction', () => {
    it.each([
      { interpretation: 'exposure', outcomeSide: 'yes', price: '0.55' },
      { interpretation: 'transacted side', outcomeSide: 'no', price: '0.45' },
    ])('retains a reported pair under $interpretation semantics', (example) => {
      // One economically equivalent buy-Yes / sell-No exposure can be reported
      // using either convention. Neither pair proves a bought/sold action.
      const input = {
        ...createFill(),
        outcomeSide: example.outcomeSide,
        price: example.price,
      };

      const result = mask(input, fill);

      expect(result.outcomeSide).toBe(example.outcomeSide);
      expect(result.price).toBe(example.price);
      expect(result.execution).toBeUndefined();
    });

    it.each(['buy', 'sell'])(
      'permits authoritative Polymarket %s evidence',
      (action) => {
        const input = {
          ...createFill(),
          venueId: 'polymarket',
          execution: { action, side: 'yes' },
          amount: '1.375',
        };

        const result = mask(input, fill);

        expect(result.execution).toEqual({ action, side: 'yes' });
        expect(result.amount).toBe('1.375');
      },
    );

    it('keeps a metadata-poor Fill without inventing an Outcome side or price', () => {
      const input = {
        ...createFill(),
        venueId: 'polymarket',
        outcomeSide: undefined,
        price: undefined,
        amount: '1.375',
        display: { outcomeLabel: 'Custom historical label' },
      };

      const result = mask(input, fill);

      expect(result.shares).toBe('2.50');
      expect(result.outcomeSide).toBeUndefined();
      expect(result.price).toBeUndefined();
      expect(result.execution).toBeUndefined();
    });

    it.each([
      { outcomeSide: undefined, price: '0.55' },
      { outcomeSide: 'yes', price: undefined },
    ])('rejects an incomplete reported pair %o', (pair) => {
      const input = { ...createFill(), ...pair };

      const parse = () => mask(input, fill);

      expect(parse).toThrow();
    });
  });

  describe('quotes and positions', () => {
    it('keeps displayed probability without creating an executable quote', () => {
      const input = {
        probability: { value: '0.55', basis: 'venue_mark', observedAt },
      };

      const result = mask(input, outcomePrices);

      expect(result.probability).toEqual(input.probability);
      expect(result.askPrice).toBeUndefined();
      expect(result.bidPrice).toBeUndefined();
    });

    it('keeps a genuine zero Bid distinct from a missing Ask', () => {
      const input = { bidPrice: '0' };

      const result = mask(input, outcomePrices);

      expect(result.bidPrice).toBe('0');
      expect(result.askPrice).toBeUndefined();
    });

    it.each(['kalshi', 'polymarket'])(
      'preserves fractional %s holdings',
      (venue) => {
        const input = {
          venueId: venue,
          positionId: 'position-1',
          marketId: 'condition-or-ticker-1',
          shares: '25.500001',
        };

        const result = mask(input, position);

        expect(result.shares).toBe('25.500001');
        expect(result.side).toBeUndefined();
        expect(result.valuation).toBeUndefined();
      },
    );

    it('preserves fractional public Cash Out intent', () => {
      const input = {
        action: 'sell',
        marketId: 'condition-1',
        side: 'no',
        shares: '0.500001',
      };

      const result = mask(input, sellIntent);

      expect(result.shares).toBe('0.500001');
    });

    it.each(['0', '0.00', '-0.5', '1e2'])(
      'rejects sell quantity %s',
      (shares) => {
        const input = {
          action: 'sell',
          marketId: 'market-1',
          side: 'yes',
          shares,
        };

        const parse = () => mask(input, sellIntent);

        expect(parse).toThrow();
      },
    );

    it('keeps unavailable summary totals absent while Balance is known', () => {
      const input = {
        venueId: 'kalshi',
        observedAt,
        availableBalance: '12.34',
      };

      const result = mask(input, summary);

      expect(result.availableBalance).toBe('12.34');
      expect(result.portfolioValue).toBeUndefined();
      expect(result.unrealizedPnl).toBeUndefined();
    });

    it('preserves source valuation separately from settlement mechanics', () => {
      const input = {
        venueId: 'polymarket',
        positionId: 'position-1',
        marketId: 'condition-1',
        shares: '2.5',
        valuation: {
          observedAt,
          currentValue: '1.50',
          costBasis: '2.00',
          unrealizedPnl: '-0.50',
          unrealizedPnlPercent: '-25',
        },
        settlement: { mode: 'claim', claimableAmount: '1.50' },
      };

      const result = mask(input, position);

      expect(result.valuation).toEqual(input.valuation);
      expect(result.settlement).toEqual(input.settlement);
    });
  });
});
