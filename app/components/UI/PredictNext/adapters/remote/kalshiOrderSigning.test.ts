import type {
  PredictBuyOrderPreview,
  PredictOrderPreviewParams,
  PredictSellOrderPreview,
} from '../../types';
import { kalshiOrderSigningInput } from './kalshiOrderSigning';

type BuyParams = Extract<PredictOrderPreviewParams, { action: 'buy' }>;
type SellParams = Extract<PredictOrderPreviewParams, { action: 'sell' }>;

const buyParams = (overrides: Partial<BuyParams> = {}) =>
  ({
    marketId: 'MKT-1',
    side: 'yes',
    action: 'buy',
    amount: '5',
    idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
    ...overrides,
  }) as BuyParams;

const buyPreview = (
  overrides: Partial<PredictBuyOrderPreview> = {},
): PredictBuyOrderPreview => ({
  previewId: 'preview-1',
  venueId: 'kalshi',
  marketId: 'MKT-1',
  side: 'yes',
  action: 'buy',
  estimatedContracts: 10,
  averagePrice: '0.45',
  limitPrice: '0.4600',
  fee: '0.10',
  feeBreakdown: [{ source: 'venue', amount: '0.10' }],
  expiresAt: '2026-11-12T12:00:00.000Z',
  requestedAmount: '5.00',
  orderAmount: '4.50',
  totalDebit: '4.60',
  potentialPayout: '10.00',
  potentialProfit: '5.40',
  ...overrides,
}) as PredictBuyOrderPreview;

const sellParams = (overrides: Partial<SellParams> = {}) =>
  ({
    marketId: 'MKT-1',
    side: 'yes',
    action: 'sell',
    contracts: '7',
    idempotencyKey: 'a1b2c3d4-1111-4222-8333-444455556666',
    ...overrides,
  }) as SellParams;

const sellPreview = (
  overrides: Partial<PredictSellOrderPreview> = {},
): PredictSellOrderPreview => ({
  previewId: 'preview-sell-1',
  venueId: 'kalshi',
  marketId: 'MKT-1',
  side: 'yes',
  action: 'sell',
  requestedContracts: 7,
  estimatedContracts: 3,
  averagePrice: '0.54',
  limitPrice: '0.5300',
  fee: '0.10',
  feeBreakdown: [{ source: 'venue', amount: '0.10' }],
  expiresAt: '2026-11-12T12:00:00.000Z',
  estimatedProceeds: '1.62',
  estimatedNetProceeds: '1.52',
  ...overrides,
}) as PredictSellOrderPreview;

describe('kalshiOrderSigningInput', () => {
  it('renders a buy from its quoted count and pinned spend without granting approval', () => {
    const params = buyParams();
    const preview = buyPreview();

    const result = kalshiOrderSigningInput(params, preview);

    expect(result).toEqual({
      inputs: {
        marketId: 'MKT-1',
        idempotencyKey: params.idempotencyKey,
        action: 'buy',
        outcome: 'yes',
        amountCents: 500,
      },
      values: { count: '10.00', price: '0.4600' },
    });
    expect(result).not.toHaveProperty('confirmed');
  });

  it('signs offered sell contracts, not the partial-fill estimate', () => {
    const params = sellParams();
    const preview = sellPreview();

    const result = kalshiOrderSigningInput(params, preview);

    expect(result).toEqual({
      inputs: {
        marketId: 'MKT-1',
        idempotencyKey: params.idempotencyKey,
        action: 'sell',
        outcome: 'yes',
        contracts: '7',
      },
      values: { count: '7.00', price: '0.5300' },
    });
  });

  it.each([
    ['yes', '0', '0.0000'],
    ['no', '0', '1.0000'],
    ['yes', '1.0000', '1.0000'],
    ['no', '1.0000', '0.0000'],
    ['yes', '0.46', '0.4600'],
    ['no', '0.46', '0.5400'],
    ['no', '0.9999', '0.0001'],
  ] as const)(
    'converts %s outcome price %s to YES price %s',
    (side, limitPrice, price) => {
      const params = buyParams({ side });
      const preview = buyPreview({
        side,
        limitPrice: limitPrice as PredictBuyOrderPreview['limitPrice'],
      });

      const result = kalshiOrderSigningInput(params, preview);

      expect(result?.values.price).toBe(price);
    },
  );

  it.each(['NaN', '-0.1', '1.2', '0.12345', '1e-2', '00.50'])(
    'refuses price %s rather than rounding or coercing it',
    (limitPrice) => {
      const params = buyParams();
      const preview = buyPreview({
        limitPrice: limitPrice as PredictBuyOrderPreview['limitPrice'],
      });

      const result = kalshiOrderSigningInput(params, preview);

      expect(result).toBeUndefined();
    },
  );

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'refuses quoted contract count %s',
    (estimatedContracts) => {
      const params = buyParams();
      const preview = buyPreview({ estimatedContracts });

      const result = kalshiOrderSigningInput(params, preview);

      expect(result).toBeUndefined();
    },
  );

  it.each(['', '-1', '1.234', '1e2', '9007199254740992'])(
    'refuses pinned spend %s that cannot be represented in whole safe cents',
    (amount) => {
      const params = buyParams({ amount: amount as BuyParams['amount'] });

      const result = kalshiOrderSigningInput(params, buyPreview());

      expect(result).toBeUndefined();
    },
  );

  it('refuses spend drift from the canonical quoted amount', () => {
    const params = buyParams({ amount: '6' as BuyParams['amount'] });

    const result = kalshiOrderSigningInput(params, buyPreview());

    expect(result).toBeUndefined();
  });

  it.each(['6', '7.0', '0', 'NaN'])(
    'refuses offered contracts %s that differ from the quote or whole-count shape',
    (contracts) => {
      const params = sellParams({
        contracts: contracts as SellParams['contracts'],
      });

      const result = kalshiOrderSigningInput(params, sellPreview());

      expect(result).toBeUndefined();
    },
  );

  it.each([
    ['market', { marketId: 'OTHER' }],
    ['outcome', { side: 'no' }],
  ] as const)('refuses a quote for another %s', (_label, drift) => {
    const params = buyParams();
    const preview = buyPreview(drift as Partial<PredictBuyOrderPreview>);

    const result = kalshiOrderSigningInput(params, preview);

    expect(result).toBeUndefined();
  });

  it('refuses a sell quote for a buy input snapshot', () => {
    const params = buyParams();
    const preview = sellPreview();

    const result = kalshiOrderSigningInput(params, preview);

    expect(result).toBeUndefined();
  });
});
