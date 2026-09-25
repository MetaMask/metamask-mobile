import { parsePredictOrderPreview, parsePredictOrderReceipt } from './trading';

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

const validReceipt = {
  operationId: 'd8f1c0aa-2222-4333-9444-555566667777',
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  status: 'filled',
  requestedMaxSpend: '4.00',
  quotedContracts: 10,
  venueOrderId: 'synthetic-venue-order-1',
  filledContracts: '10',
  actualSpend: '4.20',
  averageFillPrice: '0.4200',
  fee: '0.20',
  payoutExposure: '10.00',
};

describe('parsePredictOrderReceipt', () => {
  it('accepts a complete filled Order Receipt', () => {
    const receipt = parsePredictOrderReceipt(validReceipt);

    expect(receipt.operationId).toBe('d8f1c0aa-2222-4333-9444-555566667777');
    expect(receipt.previewId).toBe('b3c2a1d0-1111-4222-8333-444455556666');
    expect(receipt.marketId).toBe('KXTEST-26-A');
    expect(receipt.side).toBe('yes');
    expect(receipt.status).toBe('filled');
    expect(receipt.requestedMaxSpend).toBe('4.00');
    expect(receipt.quotedContracts).toBe(10);
    expect(receipt.venueOrderId).toBe('synthetic-venue-order-1');
    expect(receipt.filledContracts).toBe('10');
    expect(receipt.actualSpend).toBe('4.20');
    expect(receipt.averageFillPrice).toBe('0.4200');
    expect(receipt.fee).toBe('0.20');
    expect(receipt.payoutExposure).toBe('10.00');
  });

  it.each([
    'pending',
    'submitted',
    'filled',
    'partially_filled',
    'not_filled',
    'rejected',
    'reconciliation_required',
  ])('accepts the %s status', (status) => {
    const receipt = parsePredictOrderReceipt({ ...validReceipt, status });

    expect(receipt.status).toBe(status);
  });

  it('accepts an in-progress receipt with null fill and spend fields', () => {
    const receipt = parsePredictOrderReceipt({
      ...validReceipt,
      status: 'submitted',
      venueOrderId: null,
      filledContracts: null,
      actualSpend: null,
      averageFillPrice: null,
      fee: null,
      payoutExposure: null,
    });

    expect(receipt.venueOrderId).toBeNull();
    expect(receipt.filledContracts).toBeNull();
    expect(receipt.actualSpend).toBeNull();
    expect(receipt.averageFillPrice).toBeNull();
    expect(receipt.fee).toBeNull();
    expect(receipt.payoutExposure).toBeNull();
  });

  it('rejects an unknown status', () => {
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, status: 'cancelled' }),
    ).toThrow();
  });

  it('rejects a missing status', () => {
    const { status: _status, ...withoutStatus } = validReceipt;

    expect(() => parsePredictOrderReceipt(withoutStatus)).toThrow();
  });

  it('rejects a missing fill field that the backend must send explicitly', () => {
    const { filledContracts: _filledContracts, ...withoutFills } = validReceipt;

    expect(() => parsePredictOrderReceipt(withoutFills)).toThrow();
  });

  it('rejects a venue mismatch', () => {
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, venueId: 'polymarket' }),
    ).toThrow();
  });

  it('rejects a non-integer or non-positive quoted contract count', () => {
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, quotedContracts: 2.5 }),
    ).toThrow();
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, quotedContracts: 0 }),
    ).toThrow();
  });

  it('rejects malformed amounts', () => {
    expect(() =>
      parsePredictOrderReceipt({
        ...validReceipt,
        requestedMaxSpend: '-4.00',
      }),
    ).toThrow();
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, filledContracts: 'ten' }),
    ).toThrow();
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, actualSpend: '4.2.0' }),
    ).toThrow();
  });

  it('rejects an out-of-range average fill price', () => {
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, averageFillPrice: '1.2' }),
    ).toThrow();
  });

  it('rejects an empty or non-string venue order identifier', () => {
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, venueOrderId: '' }),
    ).toThrow();
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, venueOrderId: 42 }),
    ).toThrow();
  });

  it('discards unknown fields', () => {
    const receipt = parsePredictOrderReceipt({
      ...validReceipt,
      venueTicker: 'KXTEST-26-A',
    });

    expect(Object.hasOwn(receipt, 'venueTicker')).toBe(false);
  });
});
