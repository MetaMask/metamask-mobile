import { parsePredictOrderPreview } from './trading';

const validPreview = {
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  requestedAmount: '4.00',
  orderAmount: '4.00',
  estimatedContracts: 10,
  averagePrice: '0.4000',
  fee: '0.20',
  feeBreakdown: [
    { source: 'venue', amount: '0.10' },
    { source: 'metamask', amount: '0.10' },
  ],
  totalDebit: '4.20',
  potentialPayout: '10.00',
  potentialProfit: '5.80',
  expiresAt: '2026-03-01T12:00:30.000Z',
};

describe('parsePredictOrderPreview', () => {
  it('accepts a complete Order Preview', () => {
    const preview = parsePredictOrderPreview(validPreview);

    expect(preview.marketId).toBe('KXTEST-26-A');
    expect(preview.side).toBe('yes');
    expect(preview.estimatedContracts).toBe(10);
    expect(preview.totalDebit).toBe('4.20');
    expect(preview.potentialProfit).toBe('5.80');
  });

  it('rejects a venue mismatch', () => {
    expect(() =>
      parsePredictOrderPreview({ ...validPreview, venueId: 'polymarket' }),
    ).toThrow();
  });

  it('rejects a non-integer or non-positive contract count', () => {
    expect(() =>
      parsePredictOrderPreview({ ...validPreview, estimatedContracts: 2.5 }),
    ).toThrow();
    expect(() =>
      parsePredictOrderPreview({ ...validPreview, estimatedContracts: 0 }),
    ).toThrow();
  });

  it('rejects an out-of-range average price', () => {
    expect(() =>
      parsePredictOrderPreview({ ...validPreview, averagePrice: '1.2' }),
    ).toThrow();
  });

  it('accepts a negative potential profit', () => {
    const preview = parsePredictOrderPreview({
      ...validPreview,
      potentialProfit: '-0.10',
    });

    expect(preview.potentialProfit).toBe('-0.10');
  });

  it('rejects an empty fee breakdown', () => {
    expect(() =>
      parsePredictOrderPreview({ ...validPreview, feeBreakdown: [] }),
    ).toThrow();
  });

  it('discards unknown fields', () => {
    const preview = parsePredictOrderPreview({
      ...validPreview,
      venueTicker: 'KXTEST-26-A',
    });

    expect(Object.hasOwn(preview, 'venueTicker')).toBe(false);
  });
});
