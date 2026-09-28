import { parsePredictOrderPreview, parsePredictOrderReceipt } from './trading';

const validPreview = {
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  action: 'buy',
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

const validSellPreview = {
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  action: 'sell',
  requestedContracts: 75,
  estimatedContracts: 70,
  averagePrice: '0.4800',
  limitPrice: '0.4000',
  fee: '0.34',
  feeBreakdown: [
    { source: 'venue', amount: '0.17' },
    { source: 'metamask', amount: '0.17' },
  ],
  estimatedProceeds: '33.60',
  estimatedNetProceeds: '33.26',
  expiresAt: '2026-03-01T12:00:30.000Z',
};

describe('parsePredictOrderPreview', () => {
  it('accepts a complete buy Order Preview', () => {
    const preview = parsePredictOrderPreview(validPreview);

    expect(preview).toMatchObject({
      action: 'buy',
      marketId: 'KXTEST-26-A',
      side: 'yes',
      estimatedContracts: 10,
      totalDebit: '4.20',
      potentialProfit: '5.80',
    });
  });

  it('accepts a complete sell Order Preview', () => {
    const preview = parsePredictOrderPreview(validSellPreview);

    expect(preview).toMatchObject({
      action: 'sell',
      marketId: 'KXTEST-26-A',
      side: 'yes',
      requestedContracts: 75,
      estimatedContracts: 70,
      limitPrice: '0.4000',
      estimatedProceeds: '33.60',
      estimatedNetProceeds: '33.26',
    });
  });

  it('rejects a missing action', () => {
    const { action: _action, ...withoutAction } = validPreview;

    expect(() => parsePredictOrderPreview(withoutAction)).toThrow();
  });

  it('rejects an unknown action', () => {
    expect(() =>
      parsePredictOrderPreview({ ...validPreview, action: 'swap' }),
    ).toThrow();
  });

  it('rejects a sell Preview carrying buy-only fields', () => {
    expect(() =>
      parsePredictOrderPreview({
        ...validSellPreview,
        totalDebit: '4.20',
      }),
    ).toThrow();
    expect(() =>
      parsePredictOrderPreview({
        ...validSellPreview,
        potentialPayout: null,
      }),
    ).toThrow();
  });

  it('rejects a buy Preview carrying sell-only fields', () => {
    expect(() =>
      parsePredictOrderPreview({
        ...validPreview,
        estimatedProceeds: '33.60',
      }),
    ).toThrow();
    expect(() =>
      parsePredictOrderPreview({
        ...validPreview,
        requestedContracts: null,
      }),
    ).toThrow();
  });

  it('rejects a venue mismatch', () => {
    expect(() =>
      parsePredictOrderPreview({ ...validPreview, venueId: 'polymarket' }),
    ).toThrow();
    expect(() =>
      parsePredictOrderPreview({ ...validSellPreview, venueId: 'polymarket' }),
    ).toThrow();
  });

  it('rejects a non-integer or non-positive contract count', () => {
    expect(() =>
      parsePredictOrderPreview({ ...validPreview, estimatedContracts: 2.5 }),
    ).toThrow();
    expect(() =>
      parsePredictOrderPreview({ ...validPreview, estimatedContracts: 0 }),
    ).toThrow();
    expect(() =>
      parsePredictOrderPreview({ ...validSellPreview, requestedContracts: 0 }),
    ).toThrow();
    expect(() =>
      parsePredictOrderPreview({
        ...validSellPreview,
        estimatedContracts: 70.5,
      }),
    ).toThrow();
  });

  it('rejects an out-of-range average price', () => {
    expect(() =>
      parsePredictOrderPreview({ ...validPreview, averagePrice: '1.2' }),
    ).toThrow();
    expect(() =>
      parsePredictOrderPreview({ ...validSellPreview, limitPrice: '1.2' }),
    ).toThrow();
  });

  it('accepts a negative potential profit', () => {
    const preview = parsePredictOrderPreview({
      ...validPreview,
      potentialProfit: '-0.10',
    });

    expect(preview).toMatchObject({ potentialProfit: '-0.10' });
  });

  it('rejects an empty fee breakdown', () => {
    expect(() =>
      parsePredictOrderPreview({ ...validPreview, feeBreakdown: [] }),
    ).toThrow();
    expect(() =>
      parsePredictOrderPreview({ ...validSellPreview, feeBreakdown: [] }),
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
  action: 'buy',
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

const validSellReceipt = {
  operationId: 'd8f1c0aa-2222-4333-9444-555566667777',
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  action: 'sell',
  status: 'filled',
  quotedContracts: 70,
  venueOrderId: 'synthetic-venue-order-1',
  filledContracts: 70,
  averageFillPrice: '0.4800',
  fee: '0.34',
  actualProceeds: '33.60',
  netProceeds: '33.26',
};

describe('parsePredictOrderReceipt', () => {
  it('accepts a complete filled buy Order Receipt', () => {
    const receipt = parsePredictOrderReceipt(validReceipt);

    expect(receipt).toMatchObject({
      action: 'buy',
      operationId: 'd8f1c0aa-2222-4333-9444-555566667777',
      previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
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
    });
  });

  it('accepts a complete filled sell Order Receipt', () => {
    const receipt = parsePredictOrderReceipt(validSellReceipt);

    expect(receipt).toMatchObject({
      action: 'sell',
      previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
      status: 'filled',
      quotedContracts: 70,
      filledContracts: 70,
      averageFillPrice: '0.4800',
      fee: '0.34',
      actualProceeds: '33.60',
      netProceeds: '33.26',
    });
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
    const sellReceipt = parsePredictOrderReceipt({
      ...validSellReceipt,
      status,
    });

    expect(sellReceipt.status).toBe(status);
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

    expect(receipt).toMatchObject({
      venueOrderId: null,
      filledContracts: null,
      actualSpend: null,
      averageFillPrice: null,
      fee: null,
      payoutExposure: null,
    });
  });

  it('accepts an in-progress sell receipt with null fill and proceeds fields', () => {
    const receipt = parsePredictOrderReceipt({
      ...validSellReceipt,
      status: 'submitted',
      venueOrderId: null,
      filledContracts: null,
      averageFillPrice: null,
      fee: null,
      actualProceeds: null,
      netProceeds: null,
    });

    expect(receipt).toMatchObject({
      venueOrderId: null,
      filledContracts: null,
      actualProceeds: null,
      netProceeds: null,
    });
  });

  it('rejects a missing status', () => {
    const { status: _status, ...withoutStatus } = validReceipt;

    expect(() => parsePredictOrderReceipt(withoutStatus)).toThrow();
  });

  it('rejects a missing fill field that the backend must send explicitly', () => {
    const { filledContracts: _filledContracts, ...withoutFills } = validReceipt;

    expect(() => parsePredictOrderReceipt(withoutFills)).toThrow();
    const { filledContracts: _sellFilledContracts, ...withoutSellFills } =
      validSellReceipt;

    expect(() => parsePredictOrderReceipt(withoutSellFills)).toThrow();
  });

  it('rejects a sell Receipt carrying buy-only fields', () => {
    expect(() =>
      parsePredictOrderReceipt({
        ...validSellReceipt,
        requestedMaxSpend: '4.00',
      }),
    ).toThrow();
    expect(() =>
      parsePredictOrderReceipt({ ...validSellReceipt, payoutExposure: null }),
    ).toThrow();
  });

  it('rejects a buy Receipt carrying sell-only fields', () => {
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, netProceeds: '33.26' }),
    ).toThrow();
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, actualProceeds: null }),
    ).toThrow();
  });

  it('rejects an unknown status', () => {
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, status: 'cancelled' }),
    ).toThrow();
  });

  it('rejects a venue mismatch', () => {
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, venueId: 'polymarket' }),
    ).toThrow();
    expect(() =>
      parsePredictOrderReceipt({ ...validSellReceipt, venueId: 'polymarket' }),
    ).toThrow();
  });

  it('rejects a non-integer or non-positive quoted contract count', () => {
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, quotedContracts: 2.5 }),
    ).toThrow();
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, quotedContracts: 0 }),
    ).toThrow();
    expect(() =>
      parsePredictOrderReceipt({ ...validSellReceipt, quotedContracts: 0 }),
    ).toThrow();
  });

  it('rejects a fractional or negative sell fill count', () => {
    expect(() =>
      parsePredictOrderReceipt({ ...validSellReceipt, filledContracts: 70.5 }),
    ).toThrow();
    expect(() =>
      parsePredictOrderReceipt({ ...validSellReceipt, filledContracts: -1 }),
    ).toThrow();
  });

  it('accepts a reported zero sell fill count', () => {
    const receipt = parsePredictOrderReceipt({
      ...validSellReceipt,
      status: 'not_filled',
      venueOrderId: null,
      filledContracts: 0,
      averageFillPrice: null,
      fee: null,
      actualProceeds: '0.00',
      netProceeds: '0.00',
    });

    expect(receipt).toMatchObject({ filledContracts: 0 });
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
    expect(() =>
      parsePredictOrderReceipt({ ...validSellReceipt, netProceeds: '4.2.0' }),
    ).toThrow();
  });

  it('rejects an out-of-range average fill price', () => {
    expect(() =>
      parsePredictOrderReceipt({ ...validReceipt, averageFillPrice: '1.2' }),
    ).toThrow();
    expect(() =>
      parsePredictOrderReceipt({
        ...validSellReceipt,
        averageFillPrice: '1.2',
      }),
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
