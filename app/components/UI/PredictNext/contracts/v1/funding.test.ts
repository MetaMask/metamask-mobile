import { PredictErrorCode } from '../../errors';
import {
  parsePredictWithdrawPreview,
  parsePredictWithdrawReceipt,
} from './funding';

const destination = {
  address: '0xcDe7aB4E0f4a8C7c0F8aE4bD9c1D2e3F4a5B6c7D',
  network: 'base',
  source: 'configured_demo',
};

const validFixedPreview = {
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'fixed',
  requestedAmount: '5.00',
  destination,
  expiresAt: '2026-03-01T12:00:30.000Z',
};

const validSweepPreview = {
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'sweep_all',
  destination,
  expiresAt: '2026-03-01T12:00:30.000Z',
};

const validProcessingReceipt = {
  operationId: '0f8a1c2b-3333-4444-8555-666677778888',
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'fixed',
  status: 'processing',
  needsManualReview: false,
  requestedAmount: '5.00',
  withdrawnAmount: '5.00',
  venueTransferId: 'transfer-1',
  destination,
  createdAt: '2026-03-01T12:00:10.000Z',
  resolvedAt: null,
};

const validRejectedReceipt = {
  ...validProcessingReceipt,
  status: 'rejected',
  rejectionCode: 'insufficient_balance',
  withdrawnAmount: null,
  venueTransferId: null,
};

const expectInvalidResponse = (parse: () => unknown): void => {
  try {
    parse();
  } catch (error) {
    expect(error).toMatchObject({ code: PredictErrorCode.INVALID_RESPONSE });
    return;
  }
  throw new Error('Expected INVALID_RESPONSE.');
};

describe('parsePredictWithdrawPreview', () => {
  it('accepts a fixed quote with the server-resolved destination', () => {
    expect(parsePredictWithdrawPreview(validFixedPreview)).toEqual(
      validFixedPreview,
    );
  });

  it('accepts a sweep quote that omits requestedAmount', () => {
    const preview = parsePredictWithdrawPreview(validSweepPreview);
    expect(preview.mode).toBe('sweep_all');
    expect(preview).not.toHaveProperty('requestedAmount');
  });

  it('masks fields the contract does not name', () => {
    const preview = parsePredictWithdrawPreview({
      ...validFixedPreview,
      fee: '0.25',
      idempotencyKey: 'client-supplied',
    });
    expect(preview).not.toHaveProperty('fee');
    expect(preview).not.toHaveProperty('idempotencyKey');
  });

  it.each([
    ['a fixed quote without an amount', { ...validFixedPreview, requestedAmount: undefined }],
    ['a sweep quote with an amount', { ...validSweepPreview, requestedAmount: '5.00' }],
    [
      'a sweep quote with a null amount',
      { ...validSweepPreview, requestedAmount: null },
    ],
    [
      'an unknown destination source',
      {
        ...validFixedPreview,
        destination: { ...destination, source: 'client' },
      },
    ],
    [
      'an unsupported network',
      { ...validFixedPreview, destination: { ...destination, network: 'ethereum' } },
    ],
    ['a non-UTC expiry', { ...validFixedPreview, expiresAt: '2026-03-01T12:00:30+00:00' }],
    ['a zero-padded amount', { ...validFixedPreview, requestedAmount: '05.00' }],
    ['an unknown mode', { ...validFixedPreview, mode: 'partial' }],
    ['a missing destination', { ...validFixedPreview, destination: undefined }],
  ])('rejects %s', (_label, value) => {
    expectInvalidResponse(() => parsePredictWithdrawPreview(value));
  });
});

describe('parsePredictWithdrawReceipt', () => {
  it('accepts an in-progress receipt with null transfer fields', () => {
    const receipt = parsePredictWithdrawReceipt({
      ...validProcessingReceipt,
      withdrawnAmount: null,
      venueTransferId: null,
    });
    expect(receipt.withdrawnAmount).toBeNull();
    expect(receipt.venueTransferId).toBeNull();
  });

  it('accepts a rejected receipt that names its rejectionCode', () => {
    expect(parsePredictWithdrawReceipt(validRejectedReceipt)).toMatchObject({
      status: 'rejected',
      rejectionCode: 'insufficient_balance',
    });
  });

  it('keeps a manual-review receipt readable without inventing an outcome', () => {
    expect(
      parsePredictWithdrawReceipt({
        ...validProcessingReceipt,
        needsManualReview: true,
      }),
    ).toMatchObject({ needsManualReview: true, withdrawnAmount: '5.00' });
  });

  it.each([
    ['a rejected receipt without a rejectionCode', { ...validRejectedReceipt, rejectionCode: undefined }],
    [
      'a settled receipt carrying a rejectionCode',
      { ...validProcessingReceipt, status: 'settled', rejectionCode: 'venue_rejected' },
    ],
    [
      'an unknown rejectionCode',
      { ...validRejectedReceipt, rejectionCode: 'unexpected_refusal' },
    ],
    ['an internal status', { ...validProcessingReceipt, status: 'submitting' }],
    [
      'a fixed receipt without requestedAmount',
      { ...validProcessingReceipt, requestedAmount: undefined },
    ],
    [
      'a sweep receipt with requestedAmount',
      {
        ...validProcessingReceipt,
        mode: 'sweep_all',
        requestedAmount: '5.00',
      },
    ],
    [
      'a missing needsManualReview',
      { ...validProcessingReceipt, needsManualReview: undefined },
    ],
    ['a receipt without a venueId match', { ...validProcessingReceipt, venueId: 'polymarket' }],
    [
      'a receipt resolved by a non-UTC instant',
      { ...validProcessingReceipt, resolvedAt: '2026-03-01T12:00:20+00:00' },
    ],
  ])('rejects %s', (_label, value) => {
    expectInvalidResponse(() => parsePredictWithdrawReceipt(value));
  });
});
